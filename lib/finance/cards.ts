export function utilization(used:number, line:number){ return line>0 ? used/line : 0; }
export function monthlyInterest(balance:number, tea:number){ return balance*((Math.pow(1+tea,1/12)-1)); }
export function effectiveOperationCost(amount:number, fee:number){ return amount>0 ? fee/amount : 0; }
