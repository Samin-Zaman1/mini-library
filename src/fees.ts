   export function calculateFine(daysOverdue: number, ratePerDay = 5): number {
     if (daysOverdue < 0) {
       throw new Error("daysOverdue cannot be negative");
     }
     return daysOverdue * ratePerDay;
   }