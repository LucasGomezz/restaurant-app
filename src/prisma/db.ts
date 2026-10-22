import 'dotenv/config';
import { Pool } from 'pg';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

// Supabase poolers:
// - Session (port 5432): every client connection holds a database connection
//   (15 on the free tier) until it closes. Fine for the dev server and
//   scripts, but a frozen serverless instance can't close its idle ones, so a
//   few Vercel instances exhaust them (EMAXCONNSESSION).
// - Transaction (port 6543): connections are only held during a query or
//   transaction, so it's the one for Vercel. It can't keep named prepared
//   statements between queries, see unnamedStatements below.
// Migrations (`prisma db migrate`) still need the session pooler.
const POOL_MAX = Number(process.env['DATABASE_POOL_MAX'] ?? 3);

/**
 * Prisma Next prepares queries under a name, which a transaction pooler
 * can't keep, and its postgres() factory has no switch to turn that off. So
 * strip the name on each new connection: the query runs as an unnamed
 * statement, identical except it isn't cached on the server.
 */
function unnamedStatements(pool: Pool) {
  pool.on('connect', (client) => {
    const query = client.query.bind(client) as (...args: unknown[]) => unknown;
    (client as { query: unknown }).query = (config: unknown, ...rest: unknown[]) => {
      if (config && typeof config === 'object' && 'name' in config) {
        const unnamed = { ...(config as Record<string, unknown>) };
        delete unnamed.name;
        return query(unnamed, ...rest);
      }
      return query(config, ...rest);
    };
  });
}

function createDb() {
  const url = process.env['DATABASE_URL']!;
  const pool = new Pool({
    connectionString: url,
    max: POOL_MAX,
    // Give connections back quickly so idle instances don't hold them.
    idleTimeoutMillis: 10_000,
  });
  if (new URL(url).port === '6543') unnamedStatements(pool);
  return postgres<Contract>({ contractJson, pg: pool });
}

type Db = ReturnType<typeof createDb>;

// `next dev` re-evaluates this module on every reload: reuse the client so
// each reload doesn't leak a new pool. A new contract (after
// `prisma contract emit`) gets a new client, and the old one is closed.
const contractHash = contractJson.storage.storageHash;
const globalForDb = globalThis as typeof globalThis & {
  prismaClient?: { contractHash: string; db: Db };
};

function sharedDb(): Db {
  const cached = globalForDb.prismaClient;
  if (cached?.contractHash === contractHash) return cached.db;
  void cached?.db.close().catch(() => {});
  const db = createDb();
  globalForDb.prismaClient = { contractHash, db };
  return db;
}

export const db = process.env['NODE_ENV'] === 'production' ? createDb() : sharedDb();
