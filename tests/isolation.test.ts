/**
 * Data isolation between accounts that share nothing.
 *
 *   npm run dev          # in another terminal
 *   npm run test:e2e
 *
 * Ana owns some data; Beto (the attacker) must neither see it on any page nor
 * change it by calling Server Actions with Ana's ids. See tests/helpers.ts.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  RUN,
  callAction,
  createUser,
  db,
  deleteUsers,
  page,
  seedPlace,
  type TestUser,
} from "./helpers.ts";

let ana: TestUser;
let beto: TestUser;
const seed = {
  placeId: 0,
  visitId: 0,
  dishId: 0,
  photoId: 0,
  categoryId: 0,
  orphanId: 0,
  placeName: `Secreto de Ana ${RUN}`,
  pendingName: `Pendiente de Ana ${RUN}`,
  categoryName: `Tipo ${RUN}`,
  orphanName: `Sin dueño ${RUN}`,
};

before(async () => {
  ana = await createUser("ana");
  beto = await createUser("beto");

  const category = await db.orm.public.Category.create({
    ownerId: ana.id,
    name: seed.categoryName,
    icon: "🍷",
    baseKind: "RESTAURANT",
  });
  const place = await db.orm.public.Restaurant.create({
    ownerId: ana.id,
    name: seed.placeName,
    lat: -34.6,
    lng: -58.4,
    status: "VISITED",
    kind: "RESTAURANT",
    categoryId: category.id,
  });
  const visit = await db.orm.public.Visit.create({
    restaurantId: place.id,
    visitDate: "2026-01-01T00:00:00Z",
    description: "Visita de prueba",
  });
  const dish = await db.orm.public.Dish.create({
    visitId: visit.id,
    name: "Plato de prueba",
  });
  const photo = await db.orm.public.Photo.create({
    visitId: visit.id,
    path: `tests/${RUN}/missing.jpg`,
  });
  await seedPlace(ana.id, seed.pendingName);
  const orphan = await seedPlace(null, seed.orphanName);
  Object.assign(seed, {
    placeId: place.id,
    visitId: visit.id,
    dishId: dish.id,
    photoId: photo.id,
    categoryId: category.id,
    orphanId: orphan.id,
  });

  // Compile the pages whose Server Actions the tests call.
  assert.equal((await page(ana.session, `/lugares/${seed.placeId}`)).status, 200);
  assert.equal((await page(ana.session, "/tipos")).status, 200);
});

after(async () => {
  await db.orm.public.Restaurant.where({ id: seed.orphanId }).delete();
  await deleteUsers([ana, beto]);
  await db.close();
});

const exists = {
  place: (id: number) =>
    db.orm.public.Restaurant.select("id").where({ id }).first(),
  visit: (id: number) => db.orm.public.Visit.select("id").where({ id }).first(),
  dish: (id: number) => db.orm.public.Dish.select("id").where({ id }).first(),
  photo: (id: number) => db.orm.public.Photo.select("id").where({ id }).first(),
  category: (id: number) =>
    db.orm.public.Category.select("id").where({ id }).first(),
};

// ---------- Reads ----------

describe("lecturas", () => {
  test("Ana ve su lugar y su tipo (control)", async () => {
    const detail = await page(ana.session, `/lugares/${seed.placeId}`);
    assert.equal(detail.status, 200);
    assert.ok(detail.html.includes(seed.placeName));
    assert.ok((await page(ana.session, "/visitados")).html.includes(seed.placeName));
    assert.ok((await page(ana.session, "/pendientes")).html.includes(seed.pendingName));
    assert.ok((await page(ana.session, "/tipos")).html.includes(seed.categoryName));
  });

  for (const path of [
    () => `/lugares/${seed.placeId}`,
    () => `/lugares/${seed.placeId}/editar`,
    () => `/lugares/${seed.placeId}/visitas/${seed.visitId}`,
  ]) {
    test(`Beto recibe 404 en ${path().replace(/\d+/g, ":id")}`, async () => {
      assert.equal((await page(beto.session, path())).status, 404);
    });
  }

  for (const path of [
    "/",
    "/pendientes",
    "/visitados",
    "/tipos",
    "/lugares/nuevo",
    "/carpetas",
  ]) {
    test(`Beto no ve nada de Ana en ${path}`, async () => {
      const { status, html } = await page(beto.session, path);
      assert.equal(status, 200);
      assert.ok(!html.includes(seed.placeName), "nombre del lugar");
      assert.ok(!html.includes(seed.pendingName), "nombre del pendiente");
      assert.ok(!html.includes(seed.categoryName), "nombre del tipo");
    });
  }

  test("nadie ve un lugar sin dueño", async () => {
    assert.equal((await page(ana.session, `/lugares/${seed.orphanId}`)).status, 404);
    assert.ok(!(await page(ana.session, "/pendientes")).html.includes(seed.orphanName));
  });
});

// ---------- Forged writes ----------

describe("acciones con ids ajenos", () => {
  const place = () => `/lugares/${seed.placeId}`;

  test("Beto no puede borrar el plato de Ana", async () => {
    await callAction(beto.session, place(), "deleteDish", [seed.dishId]);
    assert.ok(await exists.dish(seed.dishId));
  });

  test("Beto no puede borrar la foto de Ana", async () => {
    await callAction(beto.session, place(), "deletePhoto", [seed.photoId]);
    assert.ok(await exists.photo(seed.photoId));
  });

  test("Beto no puede borrar la visita de Ana", async () => {
    await callAction(beto.session, place(), "deleteVisit", [seed.visitId]);
    assert.ok(await exists.visit(seed.visitId));
  });

  test("Beto no puede borrar el lugar de Ana", async () => {
    await callAction(beto.session, place(), "deleteRestaurant", [seed.placeId]);
    assert.ok(await exists.place(seed.placeId));
  });

  test("Beto no puede borrar el tipo de Ana", async () => {
    await callAction(beto.session, "/tipos", "deleteCategory", [seed.categoryId]);
    assert.ok(await exists.category(seed.categoryId));
  });

  // Without this, the tests above would also pass if the forged calls
  // simply never reached the action.
  test("Ana sí puede borrar su plato con la misma llamada (control)", async () => {
    await callAction(ana.session, place(), "deleteDish", [seed.dishId]);
    assert.equal(await exists.dish(seed.dishId), null);
  });
});
