import express from "express";
import cookieParser from "cookie-parser";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { authRouter, sameOriginOnly } from "./auth";
import { booksRouter } from "./books";
import { loansRouter } from "./loans";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(sameOriginOnly);

  // Before express.static, which would otherwise serve index.html for "/".
  app.get("/", (_req, res) => {
    res.redirect("/login.html");
  });
  app.use(express.static(publicDir));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/books", booksRouter);
  app.use("/api/loans", loansRouter);

  return app;
}
