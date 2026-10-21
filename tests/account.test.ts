/**
 * Public pages and deleting an account.
 *
 *   npm run dev          # in another terminal
 *   npm run test:e2e
 *
 * Ana deletes her account: her places, photos, owned folders and friendships
 * go; Beto's place in her folder stays his, and so does his own folder where
 * Ana was a member.
 */
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  RUN,
  anonymous,
  authUserExists,
  callAction,
  createUser,
  db,
  deleteUsers,
  friendPair,
  page,
  request,
  seedPlace,
  type TestUser,
} from "./helpers.ts";

describe("páginas públicas", () => {
  test("la landing se ve sin sesión", async () => {
    const { status, html } = await page(anonymous(), "/");
    assert.equal(status, 200);
    assert.ok(html.includes("Empezar gratis"));
  });

  for (const path of ["/terminos", "/privacidad", "/registro", "/login"]) {
    test(`${path} se ve sin sesión`, async () => {
      assert.equal((await page(anonymous(), path)).status, 200);
    });
  }

  test("robots.txt deja indexar solo lo público", async () => {
    const response = await request(anonymous(), "/robots.txt");
    assert.equal(response.status, 200);
    const text = await response.text();
    assert.ok(text.includes("Allow: /terminos"));
    assert.ok(text.includes("Disallow: /"));
  });

  test("las páginas de la app siguen pidiendo sesión", async () => {
    const { status, location } = await page(anonymous(), "/mapa");
    assert.equal(status, 307);
    assert.ok(location?.includes("/login"));
  });
});

describe("eliminar la cuenta", () => {
  let ana: TestUser;
  let beto: TestUser;
  const ids = { anaPlace: 0, betoPlace: 0, anaFolder: "", betoFolder: "" };

  before(async () => {
    [ana, beto] = await Promise.all([createUser("ana"), createUser("beto")]);

    const anaPlace = await seedPlace(ana.id, `De Ana ${RUN}`, "VISITED");
    const visit = await db.orm.public.Visit.create({
      restaurantId: anaPlace.id,
      visitDate: "2026-04-01T00:00:00Z",
      description: "Visita",
    });
    await db.orm.public.Photo.create({ visitId: visit.id, path: `tests/${RUN}/missing.jpg` });
    await db.orm.public.Category.create({
      ownerId: ana.id,
      name: `Tipo ${RUN}`,
      icon: "🍷",
      baseKind: "RESTAURANT",
    });
    const betoPlace = await seedPlace(beto.id, `De Beto ${RUN}`);

    const anaFolder = await db.orm.public.Folder.create({ name: `Carpeta de Ana ${RUN}` });
    const betoFolder = await db.orm.public.Folder.create({ name: `Carpeta de Beto ${RUN}` });
    await db.orm.public.FolderMember.createAll([
      { folderId: anaFolder.id, userId: ana.id, role: "OWNER" },
      { folderId: anaFolder.id, userId: beto.id, role: "EDITOR" },
      { folderId: betoFolder.id, userId: beto.id, role: "OWNER" },
      { folderId: betoFolder.id, userId: ana.id, role: "EDITOR" },
    ]);
    await db.orm.public.FolderPlace.createAll([
      { folderId: anaFolder.id, placeId: betoPlace.id },
      { folderId: betoFolder.id, placeId: anaPlace.id },
    ]);
    await db.orm.public.Friendship.create({
      ...friendPair(ana.id, beto.id),
      status: "ACCEPTED",
      requestedBy: ana.id,
    });

    Object.assign(ids, {
      anaPlace: anaPlace.id,
      betoPlace: betoPlace.id,
      anaFolder: anaFolder.id,
      betoFolder: betoFolder.id,
    });

    // Compile the page whose Server Action the tests call.
    assert.equal((await page(ana.session, "/cuenta")).status, 200);
  });

  after(async () => {
    for (const id of [ids.anaFolder, ids.betoFolder]) {
      if (id) await db.orm.public.Folder.where({ id }).delete();
    }
    await deleteUsers([ana, beto]);
    await db.close();
  });

  function confirmWith(text: string) {
    const form = new FormData();
    form.set("confirm", text);
    return [undefined, form];
  }

  const exists = {
    profile: (id: string) => db.orm.public.Profile.select("id").where({ id }).first(),
    place: (id: number) => db.orm.public.Restaurant.select("id").where({ id }).first(),
    folder: (id: string) => db.orm.public.Folder.select("id").where({ id }).first(),
  };

  test("sin escribir el usuario correcto no se borra nada", async () => {
    await callAction(ana.session, "/cuenta", "deleteAccount", confirmWith("otro"));
    assert.ok(await exists.profile(ana.id));
    assert.ok(await exists.place(ids.anaPlace));
  });

  test("Beto no puede borrar la cuenta de Ana", async () => {
    // The action always works on the caller's own account.
    await callAction(beto.session, "/cuenta", "deleteAccount", confirmWith(`ana.${RUN}`));
    assert.ok(await exists.profile(ana.id));
    assert.ok(await exists.profile(beto.id));
  });

  test("Ana elimina su cuenta y se va todo lo suyo", async () => {
    await callAction(ana.session, "/cuenta", "deleteAccount", confirmWith(`@ana.${RUN}`));

    assert.equal(await exists.profile(ana.id), null, "perfil");
    assert.equal(await exists.place(ids.anaPlace), null, "sus lugares");
    assert.equal(
      await db.orm.public.Category.select("id").where({ ownerId: ana.id }).first(),
      null,
      "sus tipos",
    );
    assert.equal(await exists.folder(ids.anaFolder), null, "la carpeta de la que era dueña");
    assert.equal(
      await db.orm.public.Friendship.select("id").where(friendPair(ana.id, beto.id)).first(),
      null,
      "sus amistades",
    );
    assert.equal(await authUserExists(ana.id), false, "su usuario de Auth");
  });

  test("lo de Beto sigue siendo de Beto", async () => {
    assert.ok(await exists.place(ids.betoPlace), "su lugar");
    assert.ok(await exists.folder(ids.betoFolder), "su carpeta");
    const members = await db.orm.public.FolderMember.select("userId")
      .where({ folderId: ids.betoFolder })
      .all();
    assert.deepEqual(members.map((m) => m.userId), [beto.id], "Ana ya no es miembro");
  });

  test("la sesión de Ana ya no sirve", async () => {
    const { status } = await page(ana.session, "/mapa");
    assert.equal(status, 307);
  });
});
