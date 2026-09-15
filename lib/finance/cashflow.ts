export const cashFlow = (income:number, expenses:number) => income - expenses;
export const projectedBalance = (starting:number, expectedIncome:number, expectedExpenses:number, debtPayments:number) => starting + expectedIncome - expectedExpenses - debtPayments;
