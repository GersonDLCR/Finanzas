export const budgetRemaining = (budget:number, spent:number) => budget - spent;
export const budgetUsage = (budget:number, spent:number) => budget <= 0 ? 0 : spent / budget;
