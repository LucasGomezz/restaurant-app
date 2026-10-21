/**
 * Writes that must change every matching row, not just the first one:
 * a custom type's behaviour reaching all its places, and claim-data.ts.
 *
 *   npm run dev          # in another terminal
 *   npm run test:e2e
 */
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { after, before, test } from "node:test";
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
let claimer: TestUser;
let categoryId = 0;
const categoryPlaces: number[] = [];

before(async () => {
  [ana, claimer] = await Promise.all([createUser("ana"), createUser("claimer")]);
  const category = await db.orm.public.Category.create({
    ownerId: ana.id,
    name: `Bodega ${RUN}`,
    icon: "🍷",
    baseKind: "RESTAURANT",
  });
  categoryId = category.id;
  for (const name of [`Bodega A ${RUN}`, `Bodega B ${RUN}`]) {
    const place = await seedPlace(ana.id, name);
    await db.orm.public.Restaurant.where({ id: place.id }).update({ categoryId });
    categoryPlaces.push(place.id);
  }
  // Compile the page whose Server Action the test calls.
  assert.equal((await page(ana.session, "/tipos")).status, 200);
});

after(async () => {
  await deleteUsers([ana, claimer]);
  await db.close();
});

test("cambiar el comportamiento de un tipo alcanza a todos sus lugares", async () => {
  await callAction(ana.session, "/tipos", "updateCategory", [
    categoryId,
    { name: `Bodega ${RUN}`, icon: "🍷", baseKind: "EVENT" },
  ]);
  const places = await db.orm.public.Restaurant.select("kind")
    .where((r) => r.id.in(categoryPlaces))
    .all();
  assert.deepEqual(places.map((p) => p.kind), ["EVENT", "EVENT"]);
});

test("claim-data asigna todos los lugares sin dueño y arma la carpeta", async (t) => {
  const existing = await db.orm.public.Restaurant.select("id")
    .where((r) => r.ownerId.isNull())
    .all();
  if (existing.length > 0) {
    t.skip("la base ya tiene lugares sin dueño: no los toco");
    return;
  }
  const orphans = [];
  for (const name of ["Viejo 1", "Viejo 2", "Viejo 3"]) {
    orphans.push((await seedPlace(null, `${name} ${RUN}`)).id);
  }

  await promisify(execFile)(
    process.execPath,
    ["scripts/claim-data.ts", `claimer.${RUN}`, "--carpeta", `Nosotros ${RUN}`, "--apply"],
    { env: process.env },
  );

  const owned = await db.orm.public.Restaurant.select("id")
    .where({ ownerId: claimer.id })
    .all();
  assert.deepEqual(owned.map((p) => p.id).sort(), orphans.sort(), "todos los lugares");
  const membership = await db.orm.public.FolderMember.select("folderId", "role")
    .where({ userId: claimer.id })
    .first();
  assert.equal(membership?.role, "OWNER");
  const links = await db.orm.public.FolderPlace.select("placeId")
    .where({ folderId: membership!.folderId })
    .all();
  assert.equal(links.length, 3, "los tres en la carpeta");
});
