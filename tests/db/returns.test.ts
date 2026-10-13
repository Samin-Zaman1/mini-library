import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb, resetDb, seedBook } from "../helpers/db";

let db: PGlite;

beforeAll(async () => {
  db = await createTestDb();
});

beforeEach(async () => {
  await resetDb(db);
});

async function borrow(bookId: number) {
  const r = await db.query<{ id: number }>("select borrow_book($1, $2) as id", [bookId, "Samin"]);
  return r.rows[0].id;
}

async function copies(bookId: number) {
  const r = await db.query<{ copies_available: number }>(
    "select copies_available from book where id = $1",
    [bookId],
  );
  return r.rows[0].copies_available;
}

async function returnedAt(loanId: number) {
  const r = await db.query<{ returned_at: Date | null }>(
    "select returned_at from loan where id = $1",
    [loanId],
  );
  return r.rows[0].returned_at;
}

describe("return_book", () => {
  it("sets returned_at and gives the copy back", async () => {
    const bookId = await seedBook(db, "Clean Code", 1); // Arrange
    const loanId = await borrow(bookId);

    await db.query("select return_book($1)", [loanId]); // Act

    expect(await copies(bookId)).toBe(1); // Assert
    expect(await returnedAt(loanId)).not.toBeNull();
  });

  it("rejects an unknown loan and changes nothing", async () => {
    const bookId = await seedBook(db, "Clean Code", 1); // Arrange
    await borrow(bookId);

    await expect(
      db.query("select return_book($1)", [999]), // Act: loan 999 doesn't exist
    ).rejects.toThrow("Loan not found");

    expect(await copies(bookId)).toBe(0); // Assert: stock unchanged
  });

  it("rejects a double return and leaves the first return intact", async () => {
    const bookId = await seedBook(db, "Clean Code", 1); // Arrange
    const loanId = await borrow(bookId);
    await db.query("select return_book($1)", [loanId]);
    const firstReturnedAt = await returnedAt(loanId);

    await expect(
      db.query("select return_book($1)", [loanId]), // Act: second return
    ).rejects.toThrow("Already returned");

    expect(await copies(bookId)).toBe(1); // Assert: incremented once, not twice
    expect(await returnedAt(loanId)).toEqual(firstReturnedAt);
  });

  it("rolls back the whole transaction when a double return fails", async () => {
    const bookId = await seedBook(db, "Clean Code", 2); // Arrange
    const loanA = await borrow(bookId);
    const loanB = await borrow(bookId);
    await db.query("select return_book($1)", [loanA]);

    await expect(
      db.transaction(async (tx) => {
        await tx.query("select return_book($1)", [loanB]); // succeeds inside tx...
        await tx.query("select return_book($1)", [loanA]); // ...then this fails
      }),
    ).rejects.toThrow("Already returned");

    expect(await copies(bookId)).toBe(1); // Assert: loanB's increment was rolled back
    expect(await returnedAt(loanB)).toBeNull();
  });
});
