/**
 * One-time migration script: imports the current store into PostgreSQL.
 *
 * Source: local data-store.json (the durable snapshot) — or, when --from-kv is
 * passed, the KV/Upstash key. Target: the DATABASE_URL in your .env.
 *
 * Usage:
 *   npm run migrate:pg                     # data-store.json -> Postgres
 *   npm run migrate:pg -- --from-kv        # KV snapshot      -> Postgres
 *
 * The script is idempotent: it overwrites the 'fursan_data_store' row with the
 * source data, so re-running it simply re-imports.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.cwd(), process.env.DATA_FILE)
  : path.join(process.cwd(), 'data-store.json');
const PG_TABLE = 'app_state';
const PG_DOC_KEY = 'fursan_data_store';
const FROM_KV = process.argv.includes('--from-kv');

async function fetchFromKV(): Promise<any> {
  const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
  const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
  if (!KV_URL || !KV_TOKEN) throw new Error('KV_REST_API_URL / KV_REST_API_TOKEN not set');
  const res = await fetch(`${KV_URL}/get/${PG_DOC_KEY}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const data = await res.json() as any;
  const raw = data?.result ?? data?.value ?? null;
  if (!raw) throw new Error(`KV key '${PG_DOC_KEY}' not found or empty`);
  return JSON.parse(raw);
}

function readFromFile(): any {
  if (!fs.existsSync(DATA_FILE)) throw new Error(`Data file not found: ${DATA_FILE}`);
  let raw = fs.readFileSync(DATA_FILE, 'utf-8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  return JSON.parse(raw);
}

const count = (o: any) => (Array.isArray(o) ? o.length : o && typeof o === 'object' ? Object.keys(o).length : 0);

async function main() {
  if (!DATABASE_URL) {
    console.error('Missing DATABASE_URL in .env — set it first.');
    process.exit(1);
  }

  const source = FROM_KV ? await fetchFromKV() : readFromFile();
  if (!source || typeof source !== 'object') throw new Error('Source data is not a valid object');

  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${PG_TABLE} (
        key        text PRIMARY KEY,
        value      jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await pool.query(
      `INSERT INTO ${PG_TABLE} (key, value, updated_at) VALUES ($1, $2::jsonb, now())
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [PG_DOC_KEY, JSON.stringify(source)]
    );

    const keys = Object.keys(source);
    console.log('Migration complete. Imported collections:');
    for (const k of keys) {
      console.log(`  - ${k}: ${count(source[k])}`);
    }
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Migration failed:', err?.message || err);
  process.exit(1);
});
