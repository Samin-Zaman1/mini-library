import express from "express";
import cookieParser from "cookie-parser";
import { authRouter, sameOriginOnly } from "./auth";
import { booksRouter } from "./books";
import { loansRouter } from "./loans";

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(sameOriginOnly);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/books", booksRouter);
  app.use("/api/loans", loansRouter);

  return app;
}
