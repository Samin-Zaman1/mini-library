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

describe("borrow_book", () => {
  it("reduces copies by 1 and records a loan", async () => {
    const bookId = await seedBook(db, "Clean Code", 2); // Arrange

    await db.query("select borrow_book($1, $2)", [bookId, "Samin"]); // Act

    const book = await db.query<{ copies_available: number }>(
      "select copies_available from book where id = $1",
      [bookId],
    );
    const loans = await db.query("select * from loan where book_id = $1", [bookId]);

    expect(book.rows[0].copies_available).toBe(1); // Assert
    expect(loans.rows).toHaveLength(1);
  });
    it("rejects borrowing when no copies are left and changes nothing", async () => {
    const bookId = await seedBook(db, "Rare Book", 0); // Arrange: zero copies

    await expect(
      db.query("select borrow_book($1, $2)", [bookId, "Samin"]), // Act
    ).rejects.toThrow("No copies available"); // Assert 1: it failed

    const book = await db.query<{ copies_available: number }>(
      "select copies_available from book where id = $1",
      [bookId],
    );
    const loans = await db.query("select * from loan where book_id = $1", [bookId]);

    expect(book.rows[0].copies_available).toBe(0); // Assert 2: stock unchanged
    expect(loans.rows).toHaveLength(0); // Assert 3: no loan written
  });
    it("rejects an unknown book and writes no loan", async () => {
    await expect(
      db.query("select borrow_book($1, $2)", [999, "Samin"]), // Act: id 999 doesn't exist
    ).rejects.toThrow("Book not found"); // Assert 1: right error

    const loans = await db.query("select * from loan");
    expect(loans.rows).toHaveLength(0); // Assert 2: nothing written
  });
});