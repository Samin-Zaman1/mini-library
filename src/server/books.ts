import { Router } from "express";
import { requireAuth, requireRole } from "./auth";
import { query } from "./db";

type Book = { id: number; title: string; author: string | null; copies_available: number };

export const booksRouter = Router();

booksRouter.get("/", requireAuth, async (_req, res) => {
  res.json(await query<Book>("select id, title, author, copies_available from book order by id"));
});

booksRouter.post("/", requireAuth, requireRole("librarian"), async (req, res) => {
  const { title, author, copies } = (req.body ?? {}) as Record<string, unknown>;
  if (!nonEmpty(title) || !nonEmpty(author) || !Number.isInteger(copies) || (copies as number) < 0) {
    res.status(400).json({ error: "title and author are required (max 200 chars); copies must be a whole number >= 0" });
    return;
  }
  const [book] = await query<Book>(
    "insert into book (title, author, copies_available) values ($1, $2, $3) returning id, title, author, copies_available",
    [title.trim(), author.trim(), copies],
  );
  res.status(201).json(book);
});

function nonEmpty(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.trim().length <= 200;
}
