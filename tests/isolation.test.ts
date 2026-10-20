/**
 * Data isolation between accounts, end to end against a running dev server.
 *
 *   npm run dev                    # in another terminal
 *   npm run test:isolation
 *
 * Creates two throwaway users (Ana, the owner, and Beto, the attacker), seeds
 * Ana's data straight into the database, and checks that Beto can neither
 * see it on any page nor change it by calling Server Actions with Ana's ids
 * (what a forged request would do). Everything is deleted at the end.
 *
 * Uses the DATABASE_URL and Supabase keys from .env: point them at the
 * development project, never at production.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, describe, test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { db } from "../src/prisma/db.ts";

const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const RUN = Date.now().toString(36);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ---------- HTTP with a cookie jar per user ----------

type Session = { cookies: Map<string, string> };

function cookieHeader(session: Session) {
  return [...session.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function request(session: Session, path: string, init: RequestInit = {}) {
  const response = await fetch(BASE + path, {
    ...init,
    redirect: "manual",
    headers: { ...init.headers, cookie: cookieHeader(session) },
  });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const index = pair.indexOf("=");
    const name = pair.slice(0, index);
    const value = pair.slice(index + 1);
    if (value) session.cookies.set(name, value);
    else session.cookies.delete(name);
  }
  return response;
}

async function page(session: Session, path: string) {
  const response = await request(session, path);
  return { status: response.status, html: await response.text() };
}

/** Calls a Server Action directly, the way a forged request would. */
async function callAction(
  session: Session,
  path: string,
  exportedName: string,
  args: unknown[],
) {
  const response = await request(session, path, {
    method: "POST",
    headers: {
      accept: "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": actionId(exportedName),
    },
    body: JSON.stringify(args),
  });
  await response.text();
  return response.status;
}

function actionId(exportedName: string): string {
  const manifest = JSON.parse(
    readFileSync(".next/dev/server/server-reference-manifest.json", "utf8"),
  ) as { node: Record<string, { exportedName: string; filename: string }> };
  const entry = Object.entries(manifest.node).find(
    ([, action]) =>
      action.exportedName === exportedName &&
      action.filename.startsWith("lib/actions/"),
  );
  assert.ok(entry, `Server Action ${exportedName} not compiled yet`);
  return entry[0];
}

// ---------- Users and seed data ----------

async function createUser(name: string) {
  const email = `isolation-${name}-${RUN}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  if (error) throw error;
  await db.orm.public.Profile.create({
    id: data.user.id,
    username: `${name}.${RUN}`,
    displayName: name,
  });

  const { data: link, error: linkError } =
    await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw linkError;
  const session: Session = { cookies: new Map() };
  const response = await request(
    session,
    `/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/`,
  );
  assert.equal(response.headers.get("location"), "/", `${name} signs in`);
  return { id: data.user.id, session };
}

let ana: Awaited<ReturnType<typeof createUser>>;
let beto: Awaited<ReturnType<typeof createUser>>;
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
  await db.orm.public.Restaurant.create({
    ownerId: ana.id,
    name: seed.pendingName,
    lat: -34.6,
    lng: -58.4,
    status: "PENDING",
    kind: "RESTAURANT",
  });
  const orphan = await db.orm.public.Restaurant.create({
    name: seed.orphanName,
    lat: -34.6,
    lng: -58.4,
    status: "PENDING",
    kind: "RESTAURANT",
  });
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
  for (const user of [ana, beto]) {
    if (!user) continue;
    // Deleting the profile cascades to its places, visits and categories.
    await db.orm.public.Profile.where({ id: user.id }).delete();
    await admin.auth.admin.deleteUser(user.id);
  }
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

  for (const path of ["/", "/pendientes", "/visitados", "/tipos", "/lugares/nuevo"]) {
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
