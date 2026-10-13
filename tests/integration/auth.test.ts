import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../src/server/app";
import { query } from "../../src/server/db";

const app = createApp();
const password = "correct-horse-1";

beforeEach(async () => {
  await query("truncate app_user restart identity cascade");
});

describe("POST /api/auth/signup", () => {
  it.each([
    ["missing body", {}],
    ["short username", { username: "ab", password }],
    ["bad characters", { username: "sam in", password }],
    ["short password", { username: "samin", password: "short" }],
    ["non-string password", { username: "samin", password: 12345678 }],
  ])("rejects %s with 400", async (_name, body) => {
    const res = await request(app).post("/api/auth/signup").send(body);

    expect(res.status).toBe(400);
    expect(await query("select 1 from app_user")).toHaveLength(0);
  });

  it("creates a member and never stores the plain password", async () => {
    const res = await request(app).post("/api/auth/signup").send({ username: "samin", password, role: "librarian" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 1, username: "samin", role: "member" }); // role in body is ignored
    const [row] = await query<{ password_hash: string }>("select password_hash from app_user");
    expect(row.password_hash).not.toContain(password);
  });

  it("rejects a duplicate username with 409", async () => {
    await request(app).post("/api/auth/signup").send({ username: "samin", password });

    const res = await request(app).post("/api/auth/signup").send({ username: "samin", password: "another-pass-1" });

    expect(res.status).toBe(409);
    expect(await query("select 1 from app_user")).toHaveLength(1);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/api/auth/signup").send({ username: "samin", password });
  });

  it("sets an httpOnly session cookie that /me accepts", async () => {
    const agent = request.agent(app);

    const res = await agent.post("/api/auth/login").send({ username: "samin", password });

    expect(res.status).toBe(200);
    expect(res.headers["set-cookie"][0]).toMatch(/^session=.+HttpOnly/i);
    const me = await agent.get("/api/auth/me");
    expect(me.status).toBe(200);
    expect(me.body).toEqual({ id: 1, username: "samin", role: "member" });
  });

  it.each([
    ["wrong password", { username: "samin", password: "wrong-password" }],
    ["unknown user", { username: "nobody", password }],
  ])("rejects %s with 401 and no cookie", async (_name, body) => {
    const res = await request(app).post("/api/auth/login").send(body);

    expect(res.status).toBe(401);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("logout clears the session", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ username: "samin", password });

    await agent.post("/api/auth/logout").expect(204);

    expect((await agent.get("/api/auth/me")).status).toBe(401);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without a cookie", async () => {
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
  });

  it("returns 401 for a tampered token", async () => {
    const res = await request(app).get("/api/auth/me").set("Cookie", "session=not.a.jwt");

    expect(res.status).toBe(401);
  });
});

describe("CSRF origin guard", () => {
  it("rejects a cross-origin POST with 403 before it reaches the route", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .set("Origin", "https://evil.example")
      .send({ username: "samin", password });

    expect(res.status).toBe(403);
    expect(await query("select 1 from app_user")).toHaveLength(0);
  });

  it("allows a same-origin POST", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .set("Host", "library.test")
      .set("Origin", "http://library.test")
      .send({ username: "samin", password });

    expect(res.status).toBe(201);
  });
});
