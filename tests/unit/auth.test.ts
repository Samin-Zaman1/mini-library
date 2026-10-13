import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";

vi.mock("../../src/server/db", () => ({ query: vi.fn() }));

import { requireRole } from "../../src/server/auth";

function fakeRes() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  return res;
}

function fakeReq(user?: { id: number; username: string; role: "member" | "librarian" }) {
  return { user } as unknown as Request;
}

describe("requireRole", () => {
  it("returns 401 when nobody is signed in", () => {
    const res = fakeRes();
    const next = vi.fn();

    requireRole("librarian")(fakeReq(), res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when the user has the wrong role", () => {
    const res = fakeRes();
    const next = vi.fn();
    requireRole("librarian")(fakeReq({ id: 1, username: "member", role: "member" }), res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when the user has the right role", () => {
    const res = fakeRes();
    const next = vi.fn();
    requireRole("librarian")(fakeReq({ id: 1, username: "librarian", role: "librarian" }), res as unknown as Response, next);

    expect(next).toHaveBeenCalled();
  });
});