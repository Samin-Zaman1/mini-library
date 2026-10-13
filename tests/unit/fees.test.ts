   import { describe, it, expect } from "vitest";
   import { calculateFine } from "../../src/fees";

   describe("calculateFine", () => {
     it("charges 0 when the book is not overdue", () => {
       expect(calculateFine(0)).toBe(0);
     });

     it("multiplies days overdue by the daily rate", () => {
       expect(calculateFine(3, 5)).toBe(15);
     });

     it("rejects negative days", () => {
       expect(() => calculateFine(-1)).toThrow("cannot be negative");
     });

     it("returns 0 when the book is returned on time", () => {
       expect(calculateFine(0)).toBe(0);
     });

     it("uses a custom rate per day", () => {
       expect(calculateFine(2, 10)).toBe(20);
     });
   });