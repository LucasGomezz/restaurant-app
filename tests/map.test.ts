/**
 * Map data: pin previews load one place at a time and respect access;
 * address search answers from its cache.
 *
 *   npm run dev          # in another terminal
 *   npm run test:e2e
 */
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  RUN,
  anonymous,
  createUser,
  db,
  deleteUsers,
  page,
  request,
  seedPlace,
  type TestUser,
} from "./helpers.ts";

let ana: TestUser;
let beto: TestUser;
let placeId = 0;
const cacheKey = `nominatim:test ${RUN}`;

before(async () => {
  [ana, beto] = await Promise.all([createUser("ana"), createUser("beto")]);
  placeId = (await seedPlace(ana.id, `Con vista previa ${RUN}`, "VISITED")).id;
  await db.orm.public.Visit.create({
    restaurantId: placeId,
    visitDate: "2026-03-10T00:00:00Z",
    description: `Comentario ${RUN}`,
  });
});

after(async () => {
  await db.orm.public.GeocodeCache.where({ key: cacheKey }).delete();
  await deleteUsers([ana, beto]);
  await db.close();
});

async function preview(session: TestUser["session"]) {
  const response = await request(session, `/api/lugares/${placeId}/preview`);
  return { status: response.status, body: await response.text() };
}

test("la dueña recibe la vista previa del pin", async () => {
  const { status, body } = await preview(ana.session);
  assert.equal(status, 200);
  const data = JSON.parse(body);
  assert.equal(data.text, `Comentario ${RUN}`);
  assert.equal(data.visitCount, 1);
  assert.deepEqual(data.photos, []);
});

test("otro usuario recibe 404 y no ve el comentario", async () => {
  const { status, body } = await preview(beto.session);
  assert.equal(status, 404);
  assert.ok(!body.includes(`Comentario ${RUN}`));
});

test("sin sesión no hay vista previa", async () => {
  const { status, body } = await preview(anonymous());
  assert.notEqual(status, 200);
  assert.ok(!body.includes(`Comentario ${RUN}`));
});

test("los pines del mapa ya no traen fotos ni comentarios", async () => {
  const { html } = await page(ana.session, "/mapa");
  assert.ok(html.includes(`Con vista previa ${RUN}`), "el pin está");
  assert.ok(!html.includes(`Comentario ${RUN}`), "el comentario no viene con el mapa");
});

test("la búsqueda de direcciones responde desde la caché", async () => {
  const cached = [{ displayName: `Lugar cacheado ${RUN}`, lat: -34.6, lng: -58.4 }];
  await db.orm.public.GeocodeCache.create({
    key: cacheKey,
    results: JSON.stringify(cached),
  });

  // Different spacing and case: same normalized query, so no provider call.
  const response = await request(
    ana.session,
    `/api/geocode?q=${encodeURIComponent(`  TEST   ${RUN} `)}`,
  );
  assert.equal(response.status, 200);
  assert.deepEqual((await response.json()).results, cached);
});

test("la búsqueda de direcciones pide sesión", async () => {
  const response = await request(anonymous(), "/api/geocode?q=algo");
  assert.notEqual(response.status, 200);
});
