/**
 * Friends: requests, who can answer them, and adding friends to folders.
 *
 *   npm run dev          # in another terminal
 *   npm run test:e2e
 *
 * Ana and Beto become friends; Carla tries to meddle; Carla and Dani ask each
 * other at the same time. Writes are Server Actions called directly, as a
 * forged request would. See tests/helpers.ts.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  RUN,
  callAction,
  createUser,
  db,
  deleteUsers,
  friendPair as pair,
  page,
  seedPlace,
  type TestUser,
} from "./helpers.ts";

let ana: TestUser;
let beto: TestUser;
let carla: TestUser;
let dani: TestUser;
let folderId = "";
let privatePlace = 0;

async function friendship(a: TestUser, b: TestUser) {
  return db.orm.public.Friendship.select("status", "requestedBy")
    .where(pair(a.id, b.id))
    .first();
}

async function memberRole(user: TestUser) {
  const member = await db.orm.public.FolderMember.select("role")
    .where({ folderId, userId: user.id })
    .first();
  return member?.role ?? null;
}

function requestTo(user: TestUser) {
  const form = new FormData();
  form.set("username", `@${user.name}.${RUN}`);
  return [undefined, form];
}

before(async () => {
  [ana, beto, carla, dani] = await Promise.all(
    ["ana", "beto", "carla", "dani"].map(createUser),
  );
  privatePlace = (await seedPlace(ana.id, `Privado ${RUN}`)).id;
  const folder = await db.orm.public.Folder.create({ name: `Amigos ${RUN}` });
  folderId = folder.id;
  await db.orm.public.FolderMember.create({ folderId, userId: ana.id, role: "OWNER" });

  // Compile the pages whose Server Actions the tests call.
  assert.equal((await page(ana.session, "/amigos")).status, 200);
  assert.equal((await page(ana.session, `/carpetas/${folderId}`)).status, 200);
});

after(async () => {
  if (folderId) await db.orm.public.Folder.where({ id: folderId }).delete();
  await deleteUsers([ana, beto, carla, dani]);
  await db.close();
});

describe("solicitudes", () => {
  test("Ana le manda una solicitud a Beto por su usuario", async () => {
    await callAction(ana.session, "/amigos", "sendFriendRequest", requestTo(beto));
    const row = await friendship(ana, beto);
    assert.equal(row?.status, "PENDING");
    assert.equal(row?.requestedBy, ana.id);
  });

  test("mandarla de nuevo no duplica nada", async () => {
    await callAction(ana.session, "/amigos", "sendFriendRequest", requestTo(beto));
    const rows = await db.orm.public.Friendship.select("id")
      .where(pair(ana.id, beto.id))
      .all();
    assert.equal(rows.length, 1);
  });

  test("nadie puede mandarse una solicitud a sí mismo", async () => {
    await callAction(ana.session, "/amigos", "sendFriendRequest", requestTo(ana));
    assert.equal(await friendship(ana, ana), null);
  });

  test("Ana no puede aceptar su propia solicitud", async () => {
    await callAction(ana.session, "/amigos", "acceptFriendRequest", [beto.id]);
    assert.equal((await friendship(ana, beto))?.status, "PENDING");
  });

  test("Carla no puede tocar la solicitud entre Ana y Beto", async () => {
    await callAction(carla.session, "/amigos", "acceptFriendRequest", [ana.id]);
    await callAction(carla.session, "/amigos", "removeFriendship", [beto.id]);
    assert.equal((await friendship(ana, beto))?.status, "PENDING");
  });

  test("Beto ve la solicitud y el aviso en el menú", async () => {
    const { html } = await page(beto.session, "/amigos");
    assert.ok(html.includes("Te quieren agregar"));
    assert.ok(html.includes("(1 solicitud pendiente)"), "aviso en el menú lateral");
  });

  test("Beto la acepta", async () => {
    await callAction(beto.session, "/amigos", "acceptFriendRequest", [ana.id]);
    assert.equal((await friendship(ana, beto))?.status, "ACCEPTED");
    const { html } = await page(beto.session, "/amigos");
    assert.ok(!html.includes("solicitud pendiente"));
  });

  test("si dos se piden amistad a la vez, quedan como amigos", async () => {
    await callAction(carla.session, "/amigos", "sendFriendRequest", requestTo(dani));
    await callAction(dani.session, "/amigos", "sendFriendRequest", requestTo(carla));
    assert.equal((await friendship(carla, dani))?.status, "ACCEPTED");
  });
});

describe("ser amigos no da acceso", () => {
  test("Beto, amigo de Ana, no ve sus lugares", async () => {
    assert.equal((await page(beto.session, `/lugares/${privatePlace}`)).status, 404);
  });
});

describe("sumar amigos a una carpeta", () => {
  const path = () => `/carpetas/${folderId}`;

  test("Ana suma a Beto, su amigo, con el rol elegido", async () => {
    await callAction(ana.session, path(), "addFriendToFolder", [folderId, beto.id, "VIEWER"]);
    assert.equal(await memberRole(beto), "VIEWER");
  });

  test("Ana no puede sumar a quien no es su amigo", async () => {
    await callAction(ana.session, path(), "addFriendToFolder", [folderId, carla.id, "EDITOR"]);
    assert.equal(await memberRole(carla), null);
  });

  test("no se puede sumar a nadie como dueño", async () => {
    await callAction(ana.session, path(), "addFriendToFolder", [folderId, beto.id, "OWNER"]);
    assert.equal(await memberRole(beto), "VIEWER");
  });

  test("Beto, que no es el dueño, no puede sumar a sus amigos", async () => {
    await db.orm.public.Friendship.create({
      ...pair(beto.id, dani.id),
      status: "ACCEPTED",
      requestedBy: beto.id,
    });
    await callAction(beto.session, path(), "addFriendToFolder", [folderId, dani.id, "VIEWER"]);
    assert.equal(await memberRole(dani), null);
  });

  test("dejar de ser amigos no saca a nadie de la carpeta", async () => {
    await callAction(ana.session, "/amigos", "removeFriendship", [beto.id]);
    assert.equal(await friendship(ana, beto), null);
    assert.equal(await memberRole(beto), "VIEWER");
  });
});
