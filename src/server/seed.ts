import { hashPassword } from "./auth";
import { getDb, query } from "./db";

// Demo accounts for local development only.
const users = [
  { username: "librarian", password: "REDACTED", role: "librarian" },
  { username: "member", password: "REDACTED", role: "member" },
];

for (const u of users) {
  await query(
    `insert into app_user (username, password_hash, role) values ($1, $2, $3)
     on conflict (username) do update set password_hash = excluded.password_hash, role = excluded.role`,
    [u.username, await hashPassword(u.password), u.role],
  );
  console.log(`seeded ${u.role} "${u.username}"`);
}

await (await getDb()).close(); // an open PGlite keeps the process alive
