/**
 * Gives every ownerless place and custom type (data from before accounts
 * existed) to one user. Ownerless rows are invisible to everyone, so run this
 * once, after that user has signed in and created their profile.
 *
 *   node scripts/claim-data.ts <username>                       # shows what would change
 *   node scripts/claim-data.ts <username> --apply               # does it
 *   node scripts/claim-data.ts <username> --carpeta "Nosotros" --apply
 *       # also creates that folder (owned by the user) with every claimed place in it
 *
 * Uses DATABASE_URL from .env, so check which database it points at first.
 */
import { parseArgs } from "node:util";
import { db } from "../src/prisma/db.ts";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    apply: { type: "boolean", default: false },
    carpeta: { type: "string" },
  },
});
const [rawUsername] = positionals;
const folderName = values.carpeta?.trim();

if (!rawUsername) {
  console.error(
    'Uso: node scripts/claim-data.ts <username> [--carpeta "Nombre"] [--apply]',
  );
  process.exit(1);
}

const username = rawUsername.replace(/^@/, "").toLowerCase();

try {
  const profile = await db.orm.public.Profile.select("id", "displayName")
    .where({ username })
    .first();
  if (!profile) {
    console.error(
      `No existe @${username}. Iniciá sesión y creá el perfil en /bienvenida primero.`,
    );
    process.exitCode = 1;
  } else {
    const places = await db.orm.public.Restaurant.select("id")
      .where((r) => r.ownerId.isNull())
      .all();
    const categories = await db.orm.public.Category.select("id", "name")
      .where((c) => c.ownerId.isNull())
      .all();

    console.log(
      `Sin dueño: ${places.length} lugar(es) y ${categories.length} tipo(s) → @${username} (${profile.displayName})`,
    );
    if (folderName) {
      console.log(`Y se crea la carpeta "${folderName}" con esos ${places.length} lugar(es).`);
    }

    if (!values.apply) {
      console.log("Nada cambió. Repetí con --apply para hacerlo.");
    } else if (places.length + categories.length > 0) {
      const folderId = await db.transaction(async (tx) => {
        await tx.orm.public.Category.where((c) => c.ownerId.isNull()).updateAndCount({
          ownerId: profile.id,
        });
        await tx.orm.public.Restaurant.where((r) => r.ownerId.isNull()).updateAndCount({
          ownerId: profile.id,
        });
        if (!folderName || places.length === 0) return null;

        const folder = await tx.orm.public.Folder.create({ name: folderName, icon: "🫶🏻" });
        await tx.orm.public.FolderMember.create({
          folderId: folder.id,
          userId: profile.id,
          role: "OWNER",
        });
        await tx.orm.public.FolderPlace.createAll(
          places.map((place) => ({ folderId: folder.id, placeId: place.id })),
        );
        return folder.id;
      });
      console.log("Listo: ahora son de @" + username + ".");
      if (folderId) {
        console.log(`Carpeta creada: /carpetas/${folderId} — invitá a quien quieras desde ahí.`);
      }
    }
  }
} finally {
  await db.close();
}
