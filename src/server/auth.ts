import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { query } from "./db";

export type Role = "member" | "librarian";
export type SessionUser = { id: number; username: string; role: Role };

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

const COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60;
const BCRYPT_ROUNDS = 10;
// Compared against when the username doesn't exist, so both failure paths cost the same.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

// No secret in the repo: without JWT_SECRET, sessions only last until the process restarts.
const secret = process.env.JWT_SECRET ?? randomBytes(32).toString("hex");
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET must be set in production");
}

const USERNAME = /^[a-zA-Z0-9_-]{3,32}$/;

function validCredentials(body: unknown): body is { username: string; password: string } {
  const { username, password } = (body ?? {}) as Record<string, unknown>;
  return (
    typeof username === "string" &&
    USERNAME.test(username) &&
    typeof password === "string" &&
    password.length >= 6 && // matches the "6+ characters" hint on the sign-up form
    Buffer.byteLength(password) <= 72 // bcrypt ignores bytes past 72
  );
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
  if (!validCredentials(req.body)) {
    res.status(400).json({ error: "Username must be 3-32 letters, digits, _ or -; password 6-72 characters" });
    return;
  }
  const { username, password } = req.body;
  const rows = await query<SessionUser>(
    `insert into app_user (username, password_hash, role) values ($1, $2, 'member')
     on conflict (username) do nothing
     returning id, username, role`,
    [username, await hashPassword(password)],
  );
  if (rows.length === 0) {
    res.status(409).json({ error: "Username already taken" });
    return;
  }
  res.status(201).json(rows[0]);
});

authRouter.post("/login", async (req, res) => {
  const { username, password } = (req.body ?? {}) as Record<string, unknown>;
  if (typeof username !== "string" || typeof password !== "string") {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const [row] = await query<SessionUser & { password_hash: string }>(
    "select id, username, role, password_hash from app_user where username = $1",
    [username],
  );
  const ok = await bcrypt.compare(password, row?.password_hash ?? DUMMY_HASH);
  if (!row || !ok) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }
  const user: SessionUser = { id: row.id, username: row.username, role: row.role };
  const token = jwt.sign(user, secret, { expiresIn: SESSION_TTL_SECONDS });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
  res.json(user);
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token: unknown = req.cookies?.[COOKIE];
  if (typeof token === "string") {
    try {
      const { id, username, role } = jwt.verify(token, secret, { algorithms: ["HS256"] }) as SessionUser;
      req.user = { id, username, role };
      return next();
    } catch {
      // fall through: expired or tampered token
    }
  }
  res.status(401).json({ error: "Not signed in" });
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Not signed in" });
      return;
    }
    if (req.user.role !== role) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

// Cookies ride along on cross-site requests, so reject state-changing ones from another origin.
export function sameOriginOnly(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  if (origin === undefined || ["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  let originHost: string | undefined;
  try {
    originHost = new URL(origin).host;
  } catch {
    // "null" or garbage: treat as a mismatch
  }
  if (originHost !== req.headers.host) {
    res.status(403).json({ error: "Cross-origin request rejected" });
    return;
  }
  next();
}
