import type * as T from "@/types";
import { movementTotals, roundMoney, filterPeriod, buildLedger, accountBalances, simpleLoanPlan, cashForecastTimeline } from "@/lib/finance/domain";

export function financialPeriodReport(args:{movements:T.Movement[];sessions:T.WorkSession[];fuel:T.FuelStop[];maintenance:T.Maintenance[];start:string;end:string}){
  const movements=filterPeriod(args.movements,args.start,args.end);
  const totals=movementTotals(movements);
  const sessions=filterPeriod(args.sessions,args.start,args.end);
  const fuel=filterPeriod(args.fuel,args.start,args.end);
  const maintenance=filterPeriod(args.maintenance,args.start,args.end);
  const gross=sessions.reduce((s,x)=>s+x.gross+x.bonuses,0);
  const commissions=sessions.reduce((s,x)=>s+x.commission,0);
  const fuelCost=fuel.reduce((s,x)=>s+x.total,0);
  const maintenanceCost=maintenance.reduce((s,x)=>s+x.partsCost+x.laborCost,0);
  const directFuel=sessions.filter(x=>x.fuelAccounting!=="Abastecimientos").reduce((s,x)=>s+x.fuelCost,0);
  const workProfit=roundMoney(gross-commissions-fuelCost-maintenanceCost-directFuel-sessions.reduce((s,x)=>s+x.otherCost,0));
  return {start:args.start,end:args.end,totals,sessions,fuel,maintenance,gross:roundMoney(gross),commissions:roundMoney(commissions),fuelCost:roundMoney(fuelCost+directFuel),maintenanceCost:roundMoney(maintenanceCost),workProfit};
}

export function vehicleProfitability(args:{vehicleId:string;sessions:T.WorkSession[];fuel:T.FuelStop[];maintenance:T.Maintenance[];start:string;end:string}){
  const sessions=filterPeriod(args.sessions.filter(x=>x.vehicleId===args.vehicleId),args.start,args.end);
  const fuel=filterPeriod(args.fuel.filter(x=>x.vehicleId===args.vehicleId),args.start,args.end);
  const maintenance=filterPeriod(args.maintenance.filter(x=>x.vehicleId===args.vehicleId),args.start,args.end);
  const revenue=sessions.reduce((s,x)=>s+x.gross+x.bonuses,0);
  const commission=sessions.reduce((s,x)=>s+x.commission,0);
  const directFuel=sessions.filter(x=>x.fuelAccounting!=="Abastecimientos").reduce((s,x)=>s+x.fuelCost,0);
  const actualFuel=fuel.reduce((s,x)=>s+x.total,0);
  const maintenanceCost=maintenance.reduce((s,x)=>s+x.partsCost+x.laborCost,0);
  const other=sessions.reduce((s,x)=>s+x.otherCost,0);
  const km=sessions.reduce((s,x)=>s+x.km,0), hours=sessions.reduce((s,x)=>s+x.hours,0), trips=sessions.reduce((s,x)=>s+x.trips,0);
  const cost=commission+directFuel+actualFuel+maintenanceCost+other;
  return {revenue:roundMoney(revenue),cost:roundMoney(cost),profit:roundMoney(revenue-cost),margin:revenue?roundMoney((revenue-cost)/revenue*100):0,km,hours,trips,costPerKm:km?roundMoney(cost/km):0,profitPerHour:hours?roundMoney((revenue-cost)/hours):0};
}

export function cashForecast(args:{accounts:T.FinancialAccount[];movements:T.Movement[];transfers:T.Transfer[];debts:T.Debt[];loans:T.Loan[];recurringExpenses:T.RecurringExpense[];cards:T.Card[];insurance?:T.Insurance[];fines?:T.Fine[];maintenance?:T.Maintenance[];days?:number;start?:string}){
  const timeline=cashForecastTimeline({...args,start:args.start||new Date().toISOString().slice(0,10)}); const last=timeline[timeline.length-1];
  const scheduledInflows=roundMoney(timeline.reduce((s,p)=>s+p.inflows,0)); const scheduledOutflows=roundMoney(timeline.reduce((s,p)=>s+p.outflows,0)); const minimumBuffer=roundMoney(Math.min(...timeline.map(p=>p.closing)));
  return {days:timeline.length,current:timeline[0]?.opening??0,scheduledInflows,scheduledOutflows,projected:last?.closing??timeline[0]?.opening??0,minimumBuffer,timeline};
}
export function loanIntegrity(loan:T.Loan){
  const plan=simpleLoanPlan(loan.principal,loan.rate,loan.term);
  return {valid:Math.abs(plan.total-loan.totalScheduled)<=0.02&&Math.abs(plan.installment-loan.installment)<=0.02,scheduled:plan.total,pending:roundMoney(Math.max(0,loan.balance)+Math.max(0,plan.interest-(loan.interestRecovered??0)))};
}
