export const margin=(profit:number,income:number)=>income>0?profit/income:0;
export const debtRatio=(monthlyDebt:number,monthlyIncome:number)=>monthlyIncome>0?monthlyDebt/monthlyIncome:0;
export const savingsRate=(income:number,expenses:number)=>income>0?(income-expenses)/income:0;
