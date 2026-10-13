import { PGlite } from "@electric-sql/pglite";
import { mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const migrationsDir = join(root, "supabase", "migrations");
const dataDir = join(root, "data", "library");

let dbPromise: Promise<PGlite> | undefined;

export function getDb() {
  dbPromise ??= open();
  return dbPromise;
}

export async function query<T>(sql: string, params: unknown[] = []) {
  const db = await getDb();
  const result = await db.query<T>(sql, params);
  return result.rows;
}

async function open() {
  let db: PGlite;
  if (process.env.NODE_ENV === "test") {
    db = new PGlite();
  } else {
    mkdirSync(dataDir, { recursive: true });
    db = new PGlite(dataDir);
  }
  await migrate(db);
  return db;
}

// A persisted DB survives restarts, so record applied files and only run new ones.
async function migrate(db: PGlite) {
  await db.exec(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const applied = await db.query<{ name: string }>("select name from schema_migrations");
  const done = new Set(applied.rows.map((r) => r.name));

  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort()) {
    if (done.has(file)) continue;
    try {
      await db.transaction(async (tx) => {
        await tx.exec(readFileSync(join(migrationsDir, file), "utf8"));
        await tx.query("insert into schema_migrations (name) values ($1)", [file]);
      });
    } catch (e) {
      throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
    }
  }
}
