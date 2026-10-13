import { Router } from "express";
import { calculateFine } from "../fees";
import { requireAuth, requireRole } from "./auth";
import { getDb, query } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;

const LOAN_COLUMNS = `l.id, l.book_id, b.title, l.member, l.borrowed_at, l.due_date, l.returned_at,
  l.fine_amount::float8 as fine_amount`;

// Errors raised by borrow_book / return_book, mapped to HTTP statuses.
const DB_ERRORS: Record<string, number> = {
  "Book not found": 404,
  "Loan not found": 404,
  "No copies available": 409,
  "Already returned": 409,
};

function dbErrorStatus(e: unknown) {
  return e instanceof Error ? DB_ERRORS[e.message] : undefined;
}

export const loansRouter = Router();

loansRouter.get("/", requireAuth, async (req, res) => {
  const user = req.user!;
  const rows =
    user.role === "librarian"
      ? await query(`select ${LOAN_COLUMNS} from loan l join book b on b.id = l.book_id order by l.id`)
      : await query(
          `select ${LOAN_COLUMNS} from loan l join book b on b.id = l.book_id where l.member = $1 order by l.id`,
          [user.username],
        );
  res.json(rows);
});

loansRouter.post("/", requireAuth, requireRole("member"), async (req, res) => {
  const user = req.user!;
  const { bookId } = (req.body ?? {}) as Record<string, unknown>;
  if (!Number.isInteger(bookId) || (bookId as number) < 1) {
    res.status(400).json({ error: "bookId must be a positive whole number" });
    return;
  }
  const db = await getDb();
  try {
    const loanId = await db.transaction(async (tx) => {
      // The member always comes from the session, never from the request body.
      const r = await tx.query<{ id: number }>("select borrow_book($1, $2) as id", [bookId, user.username]);
      const id = r.rows[0].id;
      await tx.query("update loan set member_id = $1 where id = $2", [user.id, id]);
      return id;
    });
    const [loan] = await query(`select ${LOAN_COLUMNS} from loan l join book b on b.id = l.book_id where l.id = $1`, [
      loanId,
    ]);
    res.status(201).json(loan);
  } catch (e) {
    const status = dbErrorStatus(e);
    if (!status) throw e;
    res.status(status).json({ error: (e as Error).message });
  }
});

loansRouter.post("/:id/return", requireAuth, async (req, res) => {
  const user = req.user!;
  const loanId = Number(req.params.id);
  if (!Number.isInteger(loanId) || loanId < 1) {
    res.status(404).json({ error: "Loan not found" });
    return;
  }
  const db = await getDb();
  try {
    const result = await db.transaction(async (tx) => {
      const owner = await tx.query<{ member: string }>("select member from loan where id = $1 for update", [loanId]);
      if (owner.rows.length === 0) return { status: 404, body: { error: "Loan not found" } };
      if (user.role !== "librarian" && owner.rows[0].member !== user.username) {
        return { status: 403, body: { error: "You can only return your own loans" } };
      }

      await tx.query("select return_book($1)", [loanId]);

      const dates = await tx.query<{ due_date: Date; returned_at: Date }>(
        "select due_date, returned_at from loan where id = $1",
        [loanId],
      );
      const { due_date, returned_at } = dates.rows[0];
      const lateMs = returned_at.getTime() - due_date.getTime();
      if (lateMs > 0) {
        // Any part of a day late counts as a full day.
        const fine = calculateFine(Math.ceil(lateMs / DAY_MS));
        await tx.query("update loan set fine_amount = $1 where id = $2", [fine, loanId]);
      }
      return { status: 200 };
    });

    if (result.status !== 200) {
      res.status(result.status).json(result.body);
      return;
    }
    const [loan] = await query(`select ${LOAN_COLUMNS} from loan l join book b on b.id = l.book_id where l.id = $1`, [
      loanId,
    ]);
    res.json(loan);
  } catch (e) {
    const status = dbErrorStatus(e);
    if (!status) throw e;
    res.status(status).json({ error: (e as Error).message });
  }
});
