/**
 * Copies everything from the old single-couple app into this one, for one
 * user, inside a new folder they own (ready to share). The old app is only
 * READ: its database gets SELECTs and its photos are downloaded, never
 * changed or deleted, so it keeps working exactly as before.
 *
 *   node --env-file=.env.old --env-file=.env scripts/import-old-app.ts <username> --carpeta "Nosotros"          # dry run
 *   node --env-file=.env.old --env-file=.env scripts/import-old-app.ts <username> --carpeta "Nosotros" --apply
 *
 * .env     → where the data goes (this app: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL,
 *            SUPABASE_SERVICE_ROLE_KEY). Loaded LAST, so if .env.old repeats one
 *            of these names, the destination still wins: never the old app.
 * .env.old → where it comes from: OLD_DATABASE_URL, OLD_SUPABASE_URL,
 *            OLD_SUPABASE_SERVICE_ROLE_KEY (the old app's project), and
 *            OLD_DATABASE_SCHEMA if its tables aren't in `public` (tests).
 *
 * Photos are copied to u/<userId>/imported/<old path>, so running it again
 * after a failure re-uploads the same files instead of duplicating them;
 * the rows refuse to import twice into a folder with the same name.
 */
import { parseArgs } from "node:util";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { db } from "../src/prisma/db.ts";

const BUCKET = "restaurant-photos";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    apply: { type: "boolean", default: false },
    carpeta: { type: "string", default: "Nosotros" },
  },
});
const [rawUsername] = positionals;
const folderName = values.carpeta.trim();

function env(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`Falta ${name} (ver el comentario al principio del script).`);
    process.exit(1);
  }
  return value;
}

if (!rawUsername) {
  console.error('Uso: node --env-file=.env.old --env-file=.env scripts/import-old-app.ts <username> [--carpeta "Nosotros"] [--apply]');
  process.exit(1);
}
const username = rawUsername.replace(/^@/, "").toLowerCase();

const oldUrl = env("OLD_DATABASE_URL");
const oldSchema = process.env.OLD_DATABASE_SCHEMA ?? "public";
if (oldUrl === process.env.DATABASE_URL && oldSchema === "public") {
  console.error("OLD_DATABASE_URL es la misma base que DATABASE_URL: nada que copiar.");
  process.exit(1);
}

const source = new pg.Client({ connectionString: oldUrl, ssl: { rejectUnauthorized: false } });
const oldStorage = createClient(env("OLD_SUPABASE_URL"), env("OLD_SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
}).storage.from(BUCKET);
const newStorage = createClient(env("NEXT_PUBLIC_SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { autoRefreshToken: false, persistSession: false },
}).storage.from(BUCKET);

type Row = Record<string, unknown>;

/** SELECT * from an old table; [] when the table doesn't exist there. */
async function readAll(table: string): Promise<Row[]> {
  const exists = await source.query(
    "select 1 from information_schema.tables where table_schema = $1 and table_name = $2",
    [oldSchema, table],
  );
  if (exists.rowCount === 0) return [];
  const schema = oldSchema.replace(/"/g, "");
  return (await source.query(`select * from "${schema}"."${table}" order by id`)).rows;
}

const str = (value: unknown) => (value == null ? null : String(value));
const num = (value: unknown) => (value == null ? null : Number(value));
/** Timestamps come back as Date from pg; the contract stores ISO strings. */
const time = (value: unknown) =>
  value == null ? null : value instanceof Date ? value.toISOString() : String(value);

try {
  await source.connect();

  const profile = await db.orm.public.Profile.select("id", "displayName")
    .where({ username })
    .first();
  if (!profile) {
    console.error(`No existe @${username} en la app nueva. Iniciá sesión y creá el perfil primero.`);
    process.exitCode = 1;
  } else {
    // One connection: read the tables one after another.
    const categories = await readAll("category");
    const places = await readAll("restaurant");
    const visits = await readAll("visit");
    const dishes = await readAll("dish");
    const photos = await readAll("photo");
    const files = [
      ...visits.flatMap((v) => [str(v.coupleImageUrl), str(v.placeImageUrl)]),
      ...dishes.map((d) => str(d.imageUrl)),
      ...photos.map((p) => str(p.path)),
    ].filter((path): path is string => Boolean(path));

    console.log(
      `App vieja: ${places.length} lugar(es), ${visits.length} visita(s), ${dishes.length} plato(s), ` +
        `${photos.length} foto(s) de carrusel, ${categories.length} tipo(s), ${files.length} archivo(s) de foto.`,
    );
    console.log(`Destino: @${username} (${profile.displayName}), carpeta "${folderName}".`);

    const existing = await db.orm.public.FolderMember.select("folderId")
      .where({ userId: profile.id, role: "OWNER" })
      .include("folder", (f) => f.select("name"))
      .all();
    if (existing.some((m) => m.folder?.name === folderName)) {
      console.error(`Ya tenés una carpeta "${folderName}": ¿ya importaste? Usá otro --carpeta.`);
      process.exitCode = 1;
    } else if (!values.apply) {
      console.log("Simulación: no se copió nada. Repetí con --apply para copiar.");
    } else {
      // 1. Photos first: rows only point at files that already exist.
      const newPath = (oldPath: string) => `u/${profile.id}/imported/${oldPath}`;
      let copied = 0;
      const missing: string[] = [];
      for (const path of [...new Set(files)]) {
        const { data, error } = await oldStorage.download(path);
        if (error || !data) {
          missing.push(path);
          continue;
        }
        const { error: uploadError } = await newStorage.upload(newPath(path), data, {
          contentType: data.type || "image/jpeg",
          upsert: true,
        });
        if (uploadError) throw new Error(`No se pudo subir ${path}: ${uploadError.message}`);
        copied++;
        if (copied % 20 === 0) console.log(`  ${copied}/${files.length} fotos copiadas…`);
      }
      console.log(`Fotos copiadas: ${copied}${missing.length ? ` (no encontradas en la app vieja: ${missing.length})` : ""}.`);
      const file = (value: unknown) => {
        const path = str(value);
        return path && !missing.includes(path) ? newPath(path) : null;
      };

      // 2. Rows, all or nothing.
      const folderId = await db.transaction(async (tx) => {
        const own = await tx.orm.public.Category.select("id", "name")
          .where({ ownerId: profile.id })
          .all();
        const categoryIds = new Map<number, number>();
        for (const c of categories) {
          const same = own.find((o) => o.name.toLowerCase() === String(c.name).toLowerCase());
          const target =
            same ??
            (await tx.orm.public.Category.create({
              ownerId: profile.id,
              name: String(c.name),
              icon: String(c.icon),
              baseKind: c.baseKind as "RESTAURANT" | "TRIP" | "EVENT",
            }));
          categoryIds.set(Number(c.id), target.id);
        }

        const folder = await tx.orm.public.Folder.create({ name: folderName, icon: "🫶🏻" });
        await tx.orm.public.FolderMember.create({
          folderId: folder.id,
          userId: profile.id,
          role: "OWNER",
        });

        const placeIds = new Map<number, number>();
        for (const p of places) {
          const created = await tx.orm.public.Restaurant.create({
            ownerId: profile.id,
            name: String(p.name),
            address: str(p.address),
            lat: Number(p.lat),
            lng: Number(p.lng),
            status: p.status as "PENDING" | "VISITED",
            kind: ((p.kind as string) ?? "RESTAURANT") as "RESTAURANT" | "TRIP" | "EVENT",
            categoryId: p.categoryId == null ? null : (categoryIds.get(Number(p.categoryId)) ?? null),
            eventDate: time(p.eventDate),
            notes: str(p.notes),
            ...(p.createdAt ? { createdAt: time(p.createdAt)! } : {}),
          });
          placeIds.set(Number(p.id), created.id);
        }
        if (placeIds.size > 0) {
          await tx.orm.public.FolderPlace.createAll(
            [...placeIds.values()].map((placeId) => ({ folderId: folder.id, placeId })),
          );
        }

        const visitIds = new Map<number, number>();
        for (const v of visits) {
          const placeId = placeIds.get(Number(v.restaurantId));
          if (!placeId) continue;
          const created = await tx.orm.public.Visit.create({
            restaurantId: placeId,
            visitDate: time(v.visitDate)!,
            endDate: time(v.endDate),
            description: String(v.description ?? ""),
            coupleImageUrl: file(v.coupleImageUrl),
            coupleImageRatio: num(v.coupleImageRatio),
            placeImageUrl: file(v.placeImageUrl),
            placeImageRatio: num(v.placeImageRatio),
          });
          visitIds.set(Number(v.id), created.id);
        }

        const newDishes = dishes
          .filter((d) => visitIds.has(Number(d.visitId)))
          .map((d) => ({
            visitId: visitIds.get(Number(d.visitId))!,
            name: String(d.name),
            description: str(d.description),
            imageUrl: file(d.imageUrl),
          }));
        if (newDishes.length > 0) await tx.orm.public.Dish.createAll(newDishes);

        const newPhotos = photos
          .filter((p) => visitIds.has(Number(p.visitId)) && file(p.path))
          .map((p) => ({
            visitId: visitIds.get(Number(p.visitId))!,
            path: file(p.path)!,
            position: Number(p.position ?? 0),
          }));
        if (newPhotos.length > 0) await tx.orm.public.Photo.createAll(newPhotos);

        console.log(
          `Copiados: ${placeIds.size} lugar(es), ${visitIds.size} visita(s), ${newDishes.length} plato(s), ${newPhotos.length} foto(s) de carrusel.`,
        );
        return folder.id;
      });

      console.log(`Listo. Carpeta: /carpetas/${folderId} — desde ahí generá el link para tu novia.`);
      console.log("La app vieja no se tocó.");
    }
  }
} finally {
  await source.end().catch(() => {});
  await db.close();
}
