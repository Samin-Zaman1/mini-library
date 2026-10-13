   export function calculateFine(daysOverdue: number, ratePerDay = 5): number {
     // TypeScript types vanish at runtime, so reject strings, NaN and Infinity explicitly.
     if (typeof daysOverdue !== "number" || !Number.isFinite(daysOverdue)) {
       throw new Error("daysOverdue must be a finite number");
     }
     if (daysOverdue < 0) {
       throw new Error("daysOverdue cannot be negative");
     }
     return daysOverdue * ratePerDay;
   }