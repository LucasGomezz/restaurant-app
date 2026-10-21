/**
 * Shared by the end-to-end tests: they run against a live dev server
 * (`npm run dev`) and the database and Supabase project from .env, which
 * must be the development ones, never production.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
// React's own encoder for Server Action arguments (what the browser sends),
// so actions taking FormData can be called too.
// @ts-expect-error -- Next's vendored copy ships without type declarations.
import { encodeReply } from "next/dist/compiled/react-server-dom-turbopack/client.edge.js";
import { db } from "../src/prisma/db.ts";

export { db };

export const BASE = process.env.TEST_BASE_URL ?? "http://localhost:3000";

/** Unique per run, so names never clash with leftovers. */
export const RUN = Date.now().toString(36);

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// ---------- HTTP with a cookie jar per user ----------

export type Session = { cookies: Map<string, string> };

export const anonymous = (): Session => ({ cookies: new Map() });

function cookieHeader(session: Session) {
  return [...session.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
}

export async function request(
  session: Session,
  path: string,
  init: RequestInit = {},
) {
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

export async function page(session: Session, path: string) {
  const response = await request(session, path);
  return {
    status: response.status,
    location: response.headers.get("location"),
    html: await response.text(),
  };
}

/**
 * Calls a Server Action directly with any arguments (FormData included), the
 * way a forged request would. `path` must be a page that uses the action
 * (and was compiled).
 */
export async function callAction(
  session: Session,
  path: string,
  exportedName: string,
  args: unknown[],
) {
  const body: string | FormData = await encodeReply(args);
  const response = await request(session, path, {
    method: "POST",
    headers: {
      accept: "text/x-component",
      "next-action": actionId(exportedName),
      // A FormData body sets its own multipart content type.
      ...(typeof body === "string"
        ? { "content-type": "text/plain;charset=UTF-8" }
        : {}),
    },
    body,
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

// ---------- Throwaway users ----------

export type TestUser = { id: string; name: string; session: Session };

/** A confirmed user with a profile, signed in through an email link. */
export async function createUser(name: string): Promise<TestUser> {
  const email = `test-${name}-${RUN}@example.com`;
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
  const session = anonymous();
  const response = await request(
    session,
    `/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/`,
  );
  assert.equal(response.headers.get("location"), "/", `${name} signs in`);
  return { id: data.user.id, name, session };
}

/** Whether the Supabase Auth user still exists. */
export async function authUserExists(id: string) {
  const { data } = await admin.auth.admin.getUserById(id);
  return Boolean(data.user);
}

/**
 * Deletes the users with everything they own: the folders they own, and
 * through the profile, places, visits, categories, memberships, friendships.
 */
export async function deleteUsers(users: (TestUser | undefined)[]) {
  for (const user of users) {
    if (!user) continue;
    // Folders aren't tied to a profile row: drop the ones the user owned.
    const owned = await db.orm.public.FolderMember.select("folderId")
      .where({ userId: user.id, role: "OWNER" })
      .all();
    for (const { folderId } of owned) {
      await db.orm.public.Folder.where({ id: folderId }).delete();
    }
    await db.orm.public.Profile.where({ id: user.id }).delete();
    await admin.auth.admin.deleteUser(user.id);
  }
}

export async function seedPlace(
  ownerId: string | null,
  name: string,
  status: "PENDING" | "VISITED" = "PENDING",
) {
  return db.orm.public.Restaurant.create({
    ownerId,
    name,
    lat: -34.6,
    lng: -58.4,
    status,
    kind: "RESTAURANT",
  });
}

/** Same ordering as friendPair in lib/access.ts (which is server-only). */
export function friendPair(a: string, b: string) {
  return a < b ? { userLow: a, userHigh: b } : { userLow: b, userHigh: a };
}
