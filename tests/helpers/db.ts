   import { PGlite } from "@electric-sql/pglite";
   import { readdirSync, readFileSync } from "node:fs";
   import { join } from "node:path";

   export async function createTestDb() {
     const db = new PGlite();
     const dir = join(process.cwd(), "supabase", "migrations");

     for (const file of readdirSync(dir).sort()) {
       try {
         await db.exec(readFileSync(join(dir, file), "utf8"));
       } catch (e) {
         throw new Error(`Migration ${file} failed: ${(e as Error).message}`);
       }
     }
     return db;
   }

   export async function resetDb(db: PGlite) {
     await db.exec("TRUNCATE loan, book RESTART IDENTITY CASCADE");
   }

   export async function seedBook(db: PGlite, title: string, copies: number) {
     const r = await db.query<{ id: number }>(
       "insert into book (title, copies_available) values ($1, $2) returning id",
       [title, copies],
     );
     return r.rows[0].id;
   }