import 'dotenv/config';
import { Pool } from 'pg';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

// Supabase's session pooler allows few connections for the whole project
// (15 on the free tier), shared by every server instance, the dev server and
// scripts. So each process keeps a small pool of its own: on Vercel every
// serverless instance opens one. Raise DATABASE_POOL_MAX only with a bigger
// Supabase plan.
const POOL_MAX = Number(process.env['DATABASE_POOL_MAX'] ?? 3);

function createDb() {
  const pool = new Pool({
    connectionString: process.env['DATABASE_URL']!,
    max: POOL_MAX,
    // Give connections back quickly so idle instances don't hold them.
    idleTimeoutMillis: 10_000,
  });
  return postgres<Contract>({ contractJson, pg: pool });
}

// `next dev` re-evaluates this module on every reload: reuse the client so
// each reload doesn't leak a new pool.
const globalForDb = globalThis as typeof globalThis & {
  prismaDb?: ReturnType<typeof createDb>;
};

export const db = globalForDb.prismaDb ?? createDb();

if (process.env['NODE_ENV'] !== 'production') globalForDb.prismaDb = db;
