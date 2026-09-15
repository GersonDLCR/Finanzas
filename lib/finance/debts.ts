export const monthlyPaymentRatio = (payment:number, income:number) => income <= 0 ? 0 : payment / income;
export const prioritizeByRate = <T extends {annualRate:number; balance:number}>(debts:T[]) => [...debts].sort((a,b)=>b.annualRate-a.annualRate);
