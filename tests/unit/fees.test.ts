import { describe, it, expect } from "vitest";
import { calculateFine } from "../../src/fees";

describe("calculateFine", () => {
  it("returns 0 when zero days overdue (boundary)", () => {
    expect(calculateFine(0)).toBe(0);
  });

  it("charges the default rate for one day", () => {
    expect(calculateFine(1)).toBe(5);
  });

  it("charges days times the default rate", () => {
    expect(calculateFine(3)).toBe(15);
  });

  it("handles a large number of days", () => {
    expect(calculateFine(1000)).toBe(5000);
  });

  it("uses a custom rate per day", () => {
    expect(calculateFine(3, 10)).toBe(30);
  });

  it("rejects negative days", () => {
    expect(() => calculateFine(-1)).toThrow("cannot be negative");
  });

  it("rejects a string at runtime", () => {
    expect(() => calculateFine("5" as unknown as number)).toThrow("finite number");
  });
});