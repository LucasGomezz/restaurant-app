/**
 * Walks the main flows in a real (headless) Chrome and fails on any wrong
 * result or browser error — what the HTTP tests in tests/*.test.ts can't see.
 *
 *   npm run dev              # in another terminal
 *   npm run test:browser     # SCREENSHOTS_DIR=/some/dir to keep screenshots
 *
 * Uses one throwaway user (deleted at the end) and makes one real address
 * search. Needs google-chrome.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { createUser, db, deleteUsers, seedPlace } from "../helpers.ts";
import { openChrome, sleep, type Browser } from "./chrome.ts";

let failures = 0;

async function step(browser: Browser, name: string, run: () => Promise<string | void>) {
  const before = browser.errors.length;
  let result: string | void;
  let failed = false;
  try {
    result = await run();
  } catch (error) {
    result = (error as Error).message;
    failed = true;
  }
  const errors = browser.errors
    .slice(before)
    .filter((e) => !/React DevTools/.test(e));
  if (failed || errors.length > 0) failures++;
  console.log(`${failed || errors.length ? "❌" : "✅"} ${name}${result ? ` — ${result}` : ""}`);
  for (const e of errors) console.log(`     ${e}`);
}

function expect(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

const tall = join(tmpdir(), "smoke-tall.jpg");
const wide = join(tmpdir(), "smoke-wide.png");
await sharp({ create: { width: 3000, height: 4000, channels: 3, background: "#0d857b" } }).jpeg().toFile(tall);
await sharp({ create: { width: 4000, height: 3000, channels: 3, background: "#f59e0b" } }).png().toFile(wide);

const user = await createUser("smoke");
const browsers: Browser[] = [];
try {
  const b = await openChrome(9334);
  browsers.push(b);
  await b.signIn(user.session);

  // ---------- Add a place: search an address, pick it, save ----------
  let placePath = "";
  await step(b, "agregar lugar buscando la dirección", async () => {
    await b.goto("/lugares/nuevo");
    await b.evaluate(`__setValue("#location-search", "Obelisco, Buenos Aires")`);
    await b.evaluate(`__clickText("button", "Buscar")`);
    await sleep(6000);
    const picked = await b.evaluate(
      `(() => { const r = document.querySelector("ul.card button"); if (!r) return null; r.click(); return r.textContent.slice(0, 30); })()`,
    );
    expect(picked, "sin resultados de búsqueda");
    await sleep(1500);
    await b.evaluate(`__setValue("#name", "Lugar smoke")`);
    await b.evaluate(`__clickText("button[type=submit]", "Agregar")`);
    await sleep(8000);
    placePath = await b.path();
    expect(/^\/lugares\/\d+$/.test(placePath), `no llegó al lugar (${placePath})`);
    return picked;
  });
  const placeId = Number(placePath.split("/").pop());

  // ---------- Visit with photos, then more photos ----------
  await step(b, "marcar como visitado con fotos", async () => {
    await b.evaluate(`__setValue("input[name=visitDate]", "2026-10-01")`);
    await b.evaluate(`__setValue("textarea[name=description]", "Visita smoke")`);
    await b.setFiles('input[name="coupleImage"]', [tall]);
    await b.setFiles('form input[name="photos"]', [wide, tall]);
    await b.evaluate(`__clickText("button[type=submit]", "Marcar como visitado")`);
    await sleep(15000);
    const visit = await db.orm.public.Visit.select("coupleImageUrl", "coupleImageRatio")
      .where({ restaurantId: placeId })
      .include("photos", (p) => p.select("id"))
      .first();
    expect(visit, "no se creó la visita");
    expect(visit!.coupleImageUrl && visit!.coupleImageRatio === 0.75, "foto de los dos");
    expect(visit!.photos.length === 2, `carrusel: ${visit!.photos.length} fotos`);
    await b.screenshot("visita.png");
    return "foto de los dos + 2 de carrusel";
  });

  // ---------- Folders: create, invite, filter the map from the menu ----------
  let folderId = "";
  await step(b, "crear carpeta y generar link", async () => {
    await b.goto("/carpetas/nueva");
    await b.evaluate(`__setValue("#name", "Carpeta smoke")`);
    await b.evaluate(`__clickText("button[type=submit]", "Crear carpeta")`);
    await sleep(10000);
    const path = await b.path();
    expect(path.startsWith("/carpetas/"), `no llegó a la carpeta (${path})`);
    folderId = path.split("/").pop()!;
    await b.evaluate(`__clickText("button", "pueden editar")`);
    await sleep(5000);
    const link = await b.evaluate(`document.querySelector('input[aria-label="Link de invitación"]')?.value`);
    expect(String(link).includes("/invitacion/"), "no apareció el link");
  });

  await step(b, "tocar la carpeta en el menú filtra el mapa", async () => {
    const other = await seedPlace(user.id, "Fuera de la carpeta");
    await db.orm.public.FolderPlace.create({ folderId, placeId });
    await b.goto("/mapa", 7000);
    const all = await b.evaluate(`document.body.innerText.includes("Fuera de la carpeta")`);
    expect(all, "el mapa completo no muestra todos los lugares");
    await b.evaluate(`[...document.querySelectorAll("nav a")].find((a) => a.textContent.includes("Carpeta smoke")).click()`);
    await sleep(7000);
    const search = await b.evaluate("location.search");
    expect(search === `?carpeta=${folderId}`, `URL: ${search}`);
    const text = await b.evaluate("document.body.innerText");
    expect(!text.includes("Fuera de la carpeta"), "muestra lugares de fuera de la carpeta");
    expect(text.includes("Lugar smoke"), "no muestra el lugar de la carpeta");
    expect(text.includes("Abrir carpeta"), "falta el botón Abrir carpeta");
    const highlighted = await b.evaluate(
      `[...document.querySelectorAll("nav a[aria-current=page]")].map((a) => a.textContent.trim()).join("|")`,
    );
    expect(highlighted.includes("Carpeta smoke") && !highlighted.includes("Mapa"), `resaltado: ${highlighted}`);
    const gear = await b.evaluate(`document.querySelector('a[aria-label="Abrir la carpeta Carpeta smoke"]')?.getAttribute("href")`);
    expect(gear === `/carpetas/${folderId}`, `⚙️ lleva a ${gear}`);
    await b.screenshot("mapa-carpeta.png");
    await db.orm.public.Restaurant.where({ id: other.id }).delete();
  });

  // ---------- Pins sit exactly on their coordinates ----------
  await step(b, "los pines quedan en su coordenada exacta", async () => {
    // Scale from two pins, then predict the others with Web Mercator: a pin
    // pushed out of place (e.g. by CSS) misses by tens of pixels.
    const coords: [number, number][] = [
      [-34.6037, -58.3816], [-34.58, -58.43], [-34.62, -58.37], [-34.595, -58.4], [-34.61, -58.41],
    ];
    const created: number[] = [];
    for (const [i, [lat, lng]] of coords.entries()) {
      const place = await seedPlace(user.id, `Geo ${i}`);
      await db.orm.public.Restaurant.where({ id: place.id }).update({ lat, lng });
      created.push(place.id);
    }
    const geoFolder = await db.orm.public.Folder.create({ name: "Geo" });
    await db.orm.public.FolderMember.create({ folderId: geoFolder.id, userId: user.id, role: "OWNER" });
    await db.orm.public.FolderPlace.createAll(created.map((placeId) => ({ folderId: geoFolder.id, placeId })));
    try {
      await b.goto(`/mapa?carpeta=${geoFolder.id}`, 9000);
      const tips: Record<string, [number, number]> = JSON.parse(
        await b.evaluate(
          `JSON.stringify(Object.fromEntries([...document.querySelectorAll(".map-pin")].map((p) => { const d = p.querySelector(".map-pin-drop").getBoundingClientRect(); return [p.querySelector(".map-pin-label")?.textContent, [d.left + d.width / 2, d.bottom]]; })))`,
        ),
      );
      const merc = ([lat, lng]: [number, number]) => [
        lng / 360,
        -Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) / (2 * Math.PI),
      ];
      const m = coords.map(merc);
      const at = (i: number) => tips[`Geo ${i}`];
      expect(coords.every((_, i) => at(i)), `faltan pines: ${Object.keys(tips).join(", ")}`);
      const scale =
        Math.hypot(at(1)[0] - at(0)[0], at(1)[1] - at(0)[1]) /
        Math.hypot(m[1][0] - m[0][0], m[1][1] - m[0][1]);
      let worst = 0;
      for (let i = 2; i < coords.length; i++) {
        const x = at(0)[0] + (m[i][0] - m[0][0]) * scale;
        const y = at(0)[1] + (m[i][1] - m[0][1]) * scale;
        worst = Math.max(worst, Math.hypot(x - at(i)[0], y - at(i)[1]));
      }
      expect(worst < 6, `pines corridos hasta ${worst.toFixed(0)} px`);
      return `error máximo ${worst.toFixed(1)} px`;
    } finally {
      await db.orm.public.Folder.where({ id: geoFolder.id }).delete();
      for (const id of created) await db.orm.public.Restaurant.where({ id }).delete();
    }
  });

  // ---------- Every page opens without browser errors ----------
  for (const path of ["/mapa", "/pendientes", "/visitados", "/tipos", "/amigos", "/carpetas", "/cuenta", placePath, `${placePath}/editar`, `/carpetas/${folderId}`]) {
    await step(b, `abrir ${path.replace(/[0-9a-f-]{36}/, "<id>")}`, async () => {
      await b.goto(path, 6000);
    });
  }

  // ---------- A browser without WebGL gets the Leaflet map ----------
  const noGl = await openChrome(9335, { flags: ["--disable-webgl", "--disable-webgl2"] });
  browsers.push(noGl);
  await noGl.signIn(user.session);
  await step(noGl, "sin WebGL el mapa usa el respaldo", async () => {
    await noGl.goto("/mapa", 10000);
    const leaflet = await noGl.evaluate(`Boolean(document.querySelector(".leaflet-container"))`);
    const pins = await noGl.evaluate(`document.querySelectorAll(".map-pin").length`);
    expect(leaflet && pins > 0, `leaflet: ${leaflet}, pines: ${pins}`);
    await noGl.screenshot("mapa-sin-webgl.png");
  });

  // ---------- Phone: the menu drawer lists the folders ----------
  const phone = await openChrome(9336, { mobile: true });
  browsers.push(phone);
  await phone.signIn(user.session);
  await step(phone, "celular: el menú ☰ muestra las carpetas", async () => {
    await phone.goto("/mapa", 7000);
    await phone.evaluate(`document.querySelector('[aria-label^="Abrir menú"]').click()`);
    await sleep(1000);
    const listed = await phone.evaluate(`document.body.innerText.includes("Carpeta smoke")`);
    expect(listed, "el panel no lista la carpeta");
    await phone.screenshot("celular-menu.png");
  });
} finally {
  for (const browser of browsers) browser.close();
  await deleteUsers([user]);
  await db.close();
}

console.log(failures ? `\n${failures} paso(s) fallaron.` : "\nTodo bien.");
process.exit(failures ? 1 : 0);
