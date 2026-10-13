import { hashPassword } from "./auth";
import { getDb, query } from "./db";

// Demo accounts for local development. Passwords come from the environment so none live in the repo.
const users = [
  { username: "librarian", role: "librarian", passwordVar: "SEED_LIBRARIAN_PASSWORD" },
  { username: "member", role: "member", passwordVar: "SEED_MEMBER_PASSWORD" },
];

const missing = users.filter((u) => !process.env[u.passwordVar]).map((u) => u.passwordVar);
if (missing.length > 0) {
  console.error(`Set ${missing.join(" and ")} (see .env.example) before seeding.`);
  process.exit(1);
}

for (const u of users) {
  await query(
    `insert into app_user (username, password_hash, role) values ($1, $2, $3)
     on conflict (username) do update set password_hash = excluded.password_hash, role = excluded.role`,
    [u.username, await hashPassword(process.env[u.passwordVar]!), u.role],
  );
  console.log(`seeded ${u.role} "${u.username}"`);
}

await (await getDb()).close(); // an open PGlite keeps the process alive
