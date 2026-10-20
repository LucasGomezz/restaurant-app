/**
 * Gives every ownerless place and custom type (data from before accounts
 * existed) to one user. Ownerless rows are invisible to everyone, so run this
 * once, after that user has signed in and created their profile.
 *
 *   node scripts/claim-data.ts <username>            # shows what would change
 *   node scripts/claim-data.ts <username> --apply    # does it
 *
 * Uses DATABASE_URL from .env, so check which database it points at first.
 */
import { db } from "../src/prisma/db.ts";

const [rawUsername, flag] = process.argv.slice(2);
const apply = flag === "--apply";

if (!rawUsername) {
  console.error("Uso: node scripts/claim-data.ts <username> [--apply]");
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

    if (!apply) {
      console.log("Nada cambió. Repetí con --apply para asignarlos.");
    } else if (places.length + categories.length > 0) {
      await db.transaction(async (tx) => {
        await tx.orm.public.Category.where((c) => c.ownerId.isNull()).update({
          ownerId: profile.id,
        });
        await tx.orm.public.Restaurant.where((r) => r.ownerId.isNull()).update({
          ownerId: profile.id,
        });
      });
      console.log("Listo: ahora son de @" + username + ".");
    }
  }
} finally {
  await db.close();
}
