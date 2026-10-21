/**
 * Shared folders: who sees and changes what (rules in lib/access.ts).
 *
 *   npm run dev          # in another terminal
 *   npm run test:e2e
 *
 * Ana owns the folder "Viaje" with her place in it. Beto joins as VIEWER and
 * is later made EDITOR. Carla joins through an invite link; Dani tries an
 * expired one. Writes are Server Actions called directly, as a forged
 * request would. See tests/helpers.ts.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  RUN,
  anonymous,
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
let carla: TestUser;
let dani: TestUser;

const names = {
  shared: `Compartido ${RUN}`,
  private: `Privado de Ana ${RUN}`,
  beto: `Lugar de Beto ${RUN}`,
  beto2: `Otro de Beto ${RUN}`,
};
const ids = {
  folder: "",
  betoFolder: "",
  shared: 0,
  private: 0,
  beto: 0,
  beto2: 0,
  visit: 0,
  dish: 0,
};

const folderPath = () => `/carpetas/${ids.folder}`;
const sharedPath = () => `/lugares/${ids.shared}`;

async function roleOf(user: TestUser, folderId = ids.folder) {
  const member = await db.orm.public.FolderMember.select("role")
    .where({ folderId, userId: user.id })
    .first();
  return member?.role ?? null;
}

async function isInFolder(placeId: number, folderId = ids.folder) {
  return Boolean(
    await db.orm.public.FolderPlace.select("id")
      .where({ folderId, placeId })
      .first(),
  );
}

before(async () => {
  [ana, beto, carla, dani] = await Promise.all(
    ["ana", "beto", "carla", "dani"].map(createUser),
  );

  const shared = await seedPlace(ana.id, names.shared, "VISITED");
  const visit = await db.orm.public.Visit.create({
    restaurantId: shared.id,
    visitDate: "2026-02-01T00:00:00Z",
    description: "Visita compartida",
  });
  const dish = await db.orm.public.Dish.create({ visitId: visit.id, name: "Empanada" });
  const privatePlace = await seedPlace(ana.id, names.private);
  const betoPlace = await seedPlace(beto.id, names.beto);
  const betoPlace2 = await seedPlace(beto.id, names.beto2);

  const folder = await db.orm.public.Folder.create({ name: `Viaje ${RUN}` });
  const betoFolder = await db.orm.public.Folder.create({ name: `De Beto ${RUN}` });
  await db.orm.public.FolderMember.createAll([
    { folderId: folder.id, userId: ana.id, role: "OWNER" },
    { folderId: folder.id, userId: beto.id, role: "VIEWER" },
    { folderId: betoFolder.id, userId: beto.id, role: "OWNER" },
  ]);

  Object.assign(ids, {
    folder: folder.id,
    betoFolder: betoFolder.id,
    shared: shared.id,
    private: privatePlace.id,
    beto: betoPlace.id,
    beto2: betoPlace2.id,
    visit: visit.id,
    dish: dish.id,
  });

  // Compile the pages whose Server Actions the tests call.
  assert.equal((await page(ana.session, folderPath())).status, 200);
  assert.equal((await page(ana.session, sharedPath())).status, 200);
});

after(async () => {
  for (const id of [ids.folder, ids.betoFolder]) {
    if (id) await db.orm.public.Folder.where({ id }).delete();
  }
  await deleteUsers([ana, beto, carla, dani]);
  await db.close();
});

describe("compartir un lugar", () => {
  test("solo la dueña puede agregar su lugar a la carpeta", async () => {
    // Beto (viewer) can't put Ana's place anywhere, nor his own in Ana's folder.
    await callAction(beto.session, folderPath(), "addPlaceToFolder", [ids.shared, ids.folder]);
    await callAction(beto.session, folderPath(), "addPlaceToFolder", [ids.beto, ids.folder]);
    assert.equal(await isInFolder(ids.shared), false);
    assert.equal(await isInFolder(ids.beto), false);

    await callAction(ana.session, folderPath(), "addPlaceToFolder", [ids.shared, ids.folder]);
    assert.equal(await isInFolder(ids.shared), true);
  });

  test("Beto no puede pasar el lugar de Ana a su propia carpeta", async () => {
    await callAction(beto.session, folderPath(), "addPlaceToFolder", [
      ids.shared,
      ids.betoFolder,
    ]);
    assert.equal(await isInFolder(ids.shared, ids.betoFolder), false);
  });
});

describe("miembro con rol 'solo ver'", () => {
  test("ve la carpeta y el lugar compartido, sin controles de edición", async () => {
    const folder = await page(beto.session, folderPath());
    assert.equal(folder.status, 200);
    assert.ok(folder.html.includes(names.shared));
    assert.ok(!folder.html.includes(names.private), "lo no compartido no aparece");

    const place = await page(beto.session, sharedPath());
    assert.equal(place.status, 200);
    assert.ok(place.html.includes("Compartido por"));
    assert.ok(!place.html.includes("Editar datos"));
    assert.ok(!place.html.includes("Editar visita"));
  });

  test("no ve lo que Ana no compartió", async () => {
    assert.equal((await page(beto.session, `/lugares/${ids.private}`)).status, 404);
  });

  test("no puede editar ni borrar", async () => {
    assert.equal((await page(beto.session, `${sharedPath()}/editar`)).status, 404);
    await callAction(beto.session, sharedPath(), "deleteDish", [ids.dish]);
    assert.ok(await db.orm.public.Dish.select("id").where({ id: ids.dish }).first());
  });

  test("no puede administrar la carpeta", async () => {
    await callAction(beto.session, folderPath(), "createInvite", [ids.folder, "EDITOR"]);
    assert.equal(
      await db.orm.public.FolderInvite.select("id").where({ folderId: ids.folder }).first(),
      null,
    );
    await callAction(beto.session, folderPath(), "removeMember", [ids.folder, ana.id]);
    assert.equal(await roleOf(ana), "OWNER");
    await callAction(beto.session, folderPath(), "changeMemberRole", [ids.folder, beto.id, "EDITOR"]);
    assert.equal(await roleOf(beto), "VIEWER");
    await callAction(beto.session, folderPath(), "deleteFolder", [ids.folder]);
    assert.ok(await db.orm.public.Folder.select("id").where({ id: ids.folder }).first());
  });

  test("quien no es miembro no ve nada", async () => {
    assert.equal((await page(carla.session, folderPath())).status, 404);
    assert.equal((await page(carla.session, sharedPath())).status, 404);
  });
});

describe("miembro con rol 'editar'", () => {
  test("Ana lo pasa a editor", async () => {
    await callAction(ana.session, folderPath(), "changeMemberRole", [ids.folder, beto.id, "EDITOR"]);
    assert.equal(await roleOf(beto), "EDITOR");
  });

  test("puede editar el lugar compartido", async () => {
    assert.equal((await page(beto.session, `${sharedPath()}/editar`)).status, 200);
    await callAction(beto.session, sharedPath(), "deleteDish", [ids.dish]);
    assert.equal(await db.orm.public.Dish.select("id").where({ id: ids.dish }).first(), null);
  });

  test("pero no borrarlo", async () => {
    await callAction(beto.session, sharedPath(), "deleteRestaurant", [ids.shared]);
    assert.ok(await db.orm.public.Restaurant.select("id").where({ id: ids.shared }).first());
  });

  test("puede sumar sus propios lugares, y Ana los ve", async () => {
    for (const id of [ids.beto, ids.beto2]) {
      await callAction(beto.session, folderPath(), "addPlaceToFolder", [id, ids.folder]);
      assert.equal(await isInFolder(id), true);
      assert.equal((await page(ana.session, `/lugares/${id}`)).status, 200);
    }
  });
});

describe("link de invitación", () => {
  let inviteId = "";

  test("sin sesión, el link lleva al login y vuelve", async () => {
    await callAction(ana.session, folderPath(), "createInvite", [ids.folder, "VIEWER"]);
    const invite = await db.orm.public.FolderInvite.select("id", "role")
      .where({ folderId: ids.folder })
      .first();
    assert.ok(invite);
    assert.equal(invite.role, "VIEWER");
    inviteId = invite.id;

    const visitor = await page(anonymous(), `/invitacion/${inviteId}`);
    assert.equal(visitor.status, 307);
    assert.ok(
      visitor.location?.endsWith(`/login?next=${encodeURIComponent(`/invitacion/${inviteId}`)}`),
      visitor.location ?? "",
    );
  });

  test("Carla se suma con el link y ve la carpeta", async () => {
    const join = await page(carla.session, `/invitacion/${inviteId}`);
    assert.equal(join.status, 200);
    assert.ok(join.html.includes("Sumarme"));

    await callAction(carla.session, `/invitacion/${inviteId}`, "acceptInvite", [inviteId]);
    assert.equal(await roleOf(carla), "VIEWER");
    assert.equal((await page(carla.session, sharedPath())).status, 200);
  });

  test("un link vencido no sirve", async () => {
    await db.orm.public.FolderInvite.where({ id: inviteId }).update({
      expiresAt: "2020-01-01T00:00:00Z",
    });
    const join = await page(dani.session, `/invitacion/${inviteId}`);
    assert.ok(join.html.includes("Link vencido"));
    await callAction(dani.session, `/invitacion/${inviteId}`, "acceptInvite", [inviteId]);
    assert.equal(await roleOf(dani), null);
  });
});

describe("salir y sacar miembros", () => {
  test("al sacar a Carla deja de ver la carpeta", async () => {
    await callAction(ana.session, folderPath(), "removeMember", [ids.folder, carla.id]);
    assert.equal(await roleOf(carla), null);
    assert.equal((await page(carla.session, sharedPath())).status, 404);
  });

  test("cuando Beto sale, todos sus lugares salen con él", async () => {
    await callAction(beto.session, folderPath(), "leaveFolder", [ids.folder]);
    assert.equal(await roleOf(beto), null);
    for (const id of [ids.beto, ids.beto2]) {
      assert.equal(await isInFolder(id), false);
      assert.equal((await page(ana.session, `/lugares/${id}`)).status, 404);
    }
    assert.equal((await page(beto.session, sharedPath())).status, 404);
  });

  test("la dueña no puede salir (tiene que borrar la carpeta)", async () => {
    await callAction(ana.session, folderPath(), "leaveFolder", [ids.folder]);
    assert.equal(await roleOf(ana), "OWNER");
  });
});
