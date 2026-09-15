import type * as T from "@/types";
import { addDays, paymentFor, periodRate, today } from "@/lib/format";

export const roundMoney=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export const frequencyDays=(f:T.Frequency)=>f==="Semanal"?7:f==="Quincenal"?14:f==="Mensual"?30:f==="Trimestral"?90:f==="Semestral"?180:f==="Anual"?365:30;
export function addFrequency(iso:string,f:T.Frequency,anchorDay?:number){
  if(f==="Semanal"||f==="Quincenal") return addDays(iso,f==="Semanal"?7:14);
  const d=new Date(iso+"T12:00:00"); const months=f==="Mensual"?1:f==="Trimestral"?3:f==="Semestral"?6:f==="Anual"?12:0;
  if(months){ const day=anchorDay??d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+months); const last=new Date(d.getFullYear(),d.getMonth()+1,0).getDate(); d.setDate(Math.min(day,last)); return d.toISOString().slice(0,10); }
  return addDays(iso,30);
}

/** Préstamos otorgados: interés simple sobre capital inicial, no sobre saldo. */
export function simpleLoanPlan(principal:number, rate:number, term:number){
  const p=Math.max(0,principal); const r=Math.max(0,rate); const n=Math.max(1,Math.floor(term));
  const interest=roundMoney(p*r); const total=roundMoney(p+interest); const base=roundMoney(total/n);
  const installments=Array.from({length:n},(_,i)=>({number:i+1, amount:i===n-1?roundMoney(total-base*(n-1)):base, principal:i===n-1?roundMoney(p-base*(n-1)*p/total):roundMoney(base*p/total), interest:i===n-1?roundMoney(interest-base*(n-1)*interest/total):roundMoney(base*interest/total)}));
  return {interest,total,installment:base,installments};
}

export function applyLoanPayment(loan:T.Loan, requested:number, date:string, lateFee=0):T.LoanPayment{
  const scheduledInterest=Math.max(0,loan.totalScheduled-loan.principal-(loan.interestRecovered??0));
  const amount=Math.min(Math.max(0,requested), Math.max(0,loan.balance)+scheduledInterest+Math.max(0,lateFee));
  let left=amount; const fee=Math.min(left,Math.max(0,lateFee)); left-=fee;
  const interest=Math.min(left,scheduledInterest); left-=interest;
  const principal=Math.min(left,Math.max(0,loan.balance));
  return {id:Date.now(),loanId:loan.id,date,amount:roundMoney(amount),principal:roundMoney(principal),interest:roundMoney(interest),lateFee:roundMoney(fee),status:"Confirmado"};
}

export function applyDebtPayment(debt:T.Debt, requested:number, date:string):T.DebtPayment{
  const rate=periodRate(debt.annualRate,debt.frequency);
  const interest=Math.max(0,debt.balance*rate);
  const insurance=Math.max(0,debt.desgravamen/100*debt.balance/12);
  const fees=Math.max(0,debt.fees);
  const amount=Math.min(Math.max(0,requested),Math.max(0,debt.balance)+interest+insurance+fees);
  let left=amount;
  const i=Math.min(left,interest); left-=i;
  const ins=Math.min(left,insurance); left-=ins;
  const f=Math.min(left,fees); left-=f;
  const principal=Math.min(left,Math.max(0,debt.balance));
  return {id:Date.now(),debtId:debt.id,date,amount:roundMoney(amount),principal:roundMoney(principal),interest:roundMoney(i),insurance:roundMoney(ins),fees:roundMoney(f),status:"Confirmado"};
}
export function debtScenario(debt:T.Debt, extra:number){
  const rate=periodRate(debt.annualRate,debt.frequency); const oldBalance=Math.max(0,debt.balance); const newBalance=Math.max(0,oldBalance-Math.max(0,extra)); const payment=Math.max(0,debt.installment);
  const simulate=(balance:number,pmt:number)=>{let b=balance,interest=0,periods=0;while(b>0.01&&periods<1000){const i=b*rate;interest+=i;const principal=Math.min(b,Math.max(0,pmt-i));if(principal<=0)return {periods:Infinity,interest:Infinity};b-=principal;periods++;}return {periods,interest};};
  const old=simulate(oldBalance,payment); const reducedTerm=simulate(newBalance,payment); const newPayment=paymentFor(newBalance,rate,Math.max(1,debt.term)); const reducedPayment=simulate(newBalance,newPayment);
  return {remaining:newBalance,newPayment,reducedTerm:reducedTerm.periods,interestSavingsByTerm:Math.max(0,old.interest-reducedTerm.interest),interestSavingsByPayment:Math.max(0,old.interest-reducedPayment.interest),oldInterest:old.interest,newInterestByTerm:reducedTerm.interest,newInterestByPayment:reducedPayment.interest};
}

export function cardUsage(operations:T.CardOperation[],cardId:string){
  return roundMoney(operations.filter(o=>o.cardId===cardId && o.status!=="Anulado").reduce((sum,o)=>sum+(o.type==="Pago"?-o.amount:o.amount+o.fee),0));
}

export function movementTotals(movements:T.Movement[]){
  const active=movements.filter(m=>m.status!=="Anulado");
  const income=active.filter(m=>m.type==="Ingreso" && m.affectsPnl!==false).reduce((a,m)=>a+m.amount,0);
  const expenses=active.filter(m=>m.type==="Gasto" && m.affectsPnl!==false).reduce((a,m)=>a+m.amount,0);
  const cashIn=active.filter(m=>m.type==="Ingreso" && m.affectsCash!==false).reduce((a,m)=>a+m.amount,0);
  const cashOut=active.filter(m=>m.type==="Gasto" && m.affectsCash!==false).reduce((a,m)=>a+m.amount,0);
  return {income,expenses,net:income-expenses,cashIn,cashOut,cashFlow:cashIn-cashOut};
}

export function buildLedger(args:{movements:T.Movement[];accounts:T.FinancialAccount[];transfers?:T.Transfer[]}):T.LedgerEntry[]{
  const rows:T.LedgerEntry[]=args.movements.filter(m=>m.status!=="Anulado").map(m=>({id:`movement-${m.id}`,date:m.date,accountId:m.accountId,sourceType:m.sourceType||"manual",sourceId:m.sourceId??m.id,direction:m.type==="Ingreso"?"IN":"OUT",currency:m.currency||args.accounts.find(a=>a.id===m.accountId)?.currency,cashAmount:m.affectsCash===false?0:m.amount,pnlAmount:m.affectsPnl===false?0:(m.type==="Ingreso"?m.amount:-m.amount),capitalAmount:m.capitalEffect??0,category:m.category,concept:m.concept,status:"Confirmado",notes:m.notes}));
  for(const t of args.transfers||[]){if(t.status==="Anulado")continue;rows.push({id:`transfer-out-${t.id}`,date:t.date,accountId:t.fromAccountId,sourceType:"transfer",sourceId:t.id,direction:"OUT",currency:args.accounts.find(a=>a.id===t.fromAccountId)?.currency,cashAmount:t.amount+t.fee,pnlAmount:-t.fee,capitalAmount:0,concept:`Transferencia a ${t.toAccountId}`,status:t.status,notes:t.notes});rows.push({id:`transfer-in-${t.id}`,date:t.date,accountId:t.toAccountId,sourceType:"transfer",sourceId:t.id,direction:"IN",currency:args.accounts.find(a=>a.id===t.toAccountId)?.currency,cashAmount:t.amount,pnlAmount:0,capitalAmount:0,concept:`Transferencia desde ${t.fromAccountId}`,status:t.status,notes:t.notes});}
  return rows.sort((a,b)=>b.date.localeCompare(a.date));
}

export function accountBalances(accounts:T.FinancialAccount[],ledger:T.LedgerEntry[]){
  return accounts.map(a=>({...a,balance:roundMoney(a.openingBalance+ledger.filter(e=>e.accountId===a.id).reduce((s,e)=>s+(e.direction==="IN"?e.cashAmount:-e.cashAmount),0))}));
}

export function dashboardSnapshot(args:{movements:T.Movement[];accounts:T.FinancialAccount[];loans:T.Loan[];debts:T.Debt[];cards:T.Card[];sessions:T.WorkSession[];vehicles:T.Vehicle[]}) : T.FinancialSnapshot{
  const totals=movementTotals(args.movements); const ledger=buildLedger({movements:args.movements,accounts:args.accounts}); const accounts=accountBalances(args.accounts,ledger);
  const cashByCurrency:Record<T.Currency,number>={PEN:roundMoney(accounts.filter(a=>a.currency==="PEN").reduce((s,a)=>s+a.balance,0)),USD:roundMoney(accounts.filter(a=>a.currency==="USD").reduce((s,a)=>s+a.balance,0))}; const linkedVehicleIds=new Set(args.debts.filter(d=>d.vehicleId).map(d=>d.vehicleId)); const currencyOfAccount=(id?:string):T.Currency=>args.accounts.find(a=>a.id===id)?.currency||"PEN"; const debtByCurrency:Record<T.Currency,number>={PEN:roundMoney(args.debts.filter(d=>currencyOfAccount(d.accountId)==="PEN").reduce((s,d)=>s+d.balance,0)+args.cards.filter(c=>c.currency==="PEN").reduce((s,c)=>s+c.used,0)),USD:roundMoney(args.debts.filter(d=>currencyOfAccount(d.accountId)==="USD").reduce((s,d)=>s+d.balance,0)+args.cards.filter(c=>c.currency==="USD").reduce((s,c)=>s+c.used,0))}; const receivablesByCurrency:Record<T.Currency,number>={PEN:roundMoney(args.loans.filter(l=>currencyOfAccount(l.accountId)==="PEN").reduce((s,l)=>s+l.balance,0)),USD:roundMoney(args.loans.filter(l=>currencyOfAccount(l.accountId)==="USD").reduce((s,l)=>s+l.balance,0))}; const vehicleAssets=args.vehicles.reduce((s,v)=>s+v.value-(linkedVehicleIds.has(v.id)?0:v.debt),0); const debtVehiclePEN=args.vehicles.reduce((s,v)=>s+(linkedVehicleIds.has(v.id)?0:v.debt),0); const netWorthByCurrency:Record<T.Currency,number>={PEN:roundMoney(cashByCurrency.PEN+receivablesByCurrency.PEN+vehicleAssets-debtByCurrency.PEN-debtVehiclePEN),USD:roundMoney(cashByCurrency.USD+receivablesByCurrency.USD)}; const cash=cashByCurrency.PEN; const debt=debtByCurrency.PEN+debtVehiclePEN; const receivables=receivablesByCurrency.PEN;
  const workProfit=args.sessions.reduce((s,x)=>s+x.gross-x.commission+x.bonuses-x.fuelCost-x.otherCost,0); const utilization=args.cards.reduce((s,c)=>s+c.line,0)?args.cards.reduce((s,c)=>s+c.used,0)/args.cards.reduce((s,c)=>s+c.line,0)*100:0;
  const incomeByCurrency:Record<T.Currency,number>={PEN:roundMoney(args.movements.filter(m=>m.type==="Ingreso"&&(m.affectsPnl!==false)&&(m.currency||args.accounts.find(a=>a.id===m.accountId)?.currency||"PEN")==="PEN").reduce((s,m)=>s+m.amount,0)),USD:roundMoney(args.movements.filter(m=>m.type==="Ingreso"&&(m.affectsPnl!==false)&&(m.currency||args.accounts.find(a=>a.id===m.accountId)?.currency||"PEN")==="USD").reduce((s,m)=>s+m.amount,0))}; const expensesByCurrency:Record<T.Currency,number>={PEN:roundMoney(args.movements.filter(m=>m.type==="Gasto"&&(m.affectsPnl!==false)&&(m.currency||args.accounts.find(a=>a.id===m.accountId)?.currency||"PEN")==="PEN").reduce((s,m)=>s+m.amount,0)),USD:roundMoney(args.movements.filter(m=>m.type==="Gasto"&&(m.affectsPnl!==false)&&(m.currency||args.accounts.find(a=>a.id===m.accountId)?.currency||"PEN")==="USD").reduce((s,m)=>s+m.amount,0))};
  return {income:totals.income,expenses:totals.expenses,netCashFlow:totals.cashFlow,savingsRate:totals.income?totals.net/totals.income*100:0,debt,receivables,cash,netWorth:netWorthByCurrency.PEN,cardUtilization:utilization,workProfit,incomeByCurrency,expensesByCurrency,cashByCurrency,debtByCurrency,receivablesByCurrency,netWorthByCurrency};
}

export function nextDue(date:string,f:T.Frequency){return addDays(date,frequencyDays(f));}

export function deriveLinkedMovements(args:{sessions:T.WorkSession[];fuel:T.FuelStop[];maintenance:T.Maintenance[];insurance:T.Insurance[];fines:T.Fine[];incidents:T.Incident[];loans:T.Loan[];cardOps:T.CardOperation[];loanPayments:T.LoanPayment[];debtPayments:T.DebtPayment[];goalMovements:T.GoalMovement[];defaultAccountId?:string}):T.Movement[]{
 const account=args.defaultAccountId;
 const out:T.Movement[]=[];
 for(const x of args.sessions){
  out.push({id:`work-${x.id}-gross`,date:x.date,type:"Ingreso",concept:`Jornada · ${x.apps.join(" + ")||"Trabajo"}`,category:"Trabajo",method:"Transferencia",amount:x.gross,work:true,accountId:x.accountId||account,affectsCash:true,affectsPnl:true,sourceType:"work",sourceId:x.id,status:"Confirmado"});
  if(x.commission)out.push({id:`work-${x.id}-commission`,date:x.date,type:"Gasto",concept:"Comisión de aplicativo",category:"Trabajo",method:"Transferencia",amount:x.commission,work:true,accountId:x.accountId||account,affectsCash:true,affectsPnl:true,sourceType:"work",sourceId:x.id,status:"Confirmado"});
  if(x.fuelCost && x.fuelAccounting!=="Abastecimientos")out.push({id:`work-${x.id}-fuel`,date:x.date,type:"Gasto",concept:"Combustible de jornada",category:"Vehículo",method:"Efectivo",amount:x.fuelCost,work:true,accountId:x.accountId||account,affectsCash:true,affectsPnl:true,sourceType:"work",sourceId:x.id,status:"Confirmado"});
  if(x.otherCost)out.push({id:`work-${x.id}-other`,date:x.date,type:"Gasto",concept:"Otros costos de jornada",category:"Trabajo",method:"Efectivo",amount:x.otherCost,work:true,accountId:x.accountId||account,affectsCash:true,affectsPnl:true,sourceType:"work",sourceId:x.id,status:"Confirmado"});
  if(x.bonuses)out.push({id:`work-${x.id}-bonus`,date:x.date,type:"Ingreso",concept:"Bonos de jornada",category:"Trabajo",method:"Transferencia",amount:x.bonuses,work:true,accountId:x.accountId||account,affectsCash:true,affectsPnl:true,sourceType:"work",sourceId:x.id,status:"Confirmado"});
 }
 for(const x of args.fuel)out.push({id:`fuel-${x.id}`,date:x.date,type:"Gasto",concept:`Combustible · ${x.station}`,category:"Vehículo",method:x.methods[0]?.method||"Otro",amount:x.total,work:Boolean(x.linkedSessionId),accountId:x.accountId||account,affectsCash:true,affectsPnl:true,sourceType:"fuel",sourceId:x.id,status:"Confirmado",linkedSessionId:x.linkedSessionId});
 for(const x of args.maintenance)out.push({id:`maintenance-${x.id}`,date:x.date,type:"Gasto",concept:`Mantenimiento · ${x.service}`,category:"Vehículo",method:"Efectivo",amount:x.partsCost+x.laborCost,work:Boolean(x.linkedSessionId),accountId:x.accountId||account,affectsCash:true,affectsPnl:true,sourceType:"maintenance",sourceId:x.id,status:"Confirmado",linkedSessionId:x.linkedSessionId});
 for(const x of args.insurance){if(x.paid!==false&&x.cost>0)out.push({id:`insurance-${x.id}`,date:x.start,type:"Gasto",concept:`Seguro · ${x.type} · ${x.company}`,category:"Vehículo",method:"Transferencia",amount:x.cost,work:false,accountId:x.accountId||account,affectsCash:true,affectsPnl:true,sourceType:"insurance",sourceId:x.id,status:"Confirmado"});}
 for(const x of args.fines){if(x.status==="Pagada"&&x.amount>0)out.push({id:`fine-${x.id}`,date:x.date,type:"Gasto",concept:`Multa · ${x.code}`,category:"Vehículo",method:"Transferencia",amount:Math.max(0,x.amount-x.discountAmount),work:false,accountId:account,affectsCash:true,affectsPnl:true,sourceType:"fine",sourceId:x.id,status:"Confirmado"});}
 for(const x of args.incidents){if(x.paidByUser>0)out.push({id:`incident-${x.id}-user`,date:x.date,type:"Gasto",concept:`Siniestro · ${x.type} · pago propio`,category:"Vehículo",method:"Transferencia",amount:x.paidByUser,work:false,accountId:x.accountId||account,affectsCash:true,affectsPnl:true,sourceType:"incident",sourceId:x.id,status:"Confirmado"});if(x.paidByThirdParty>0)out.push({id:`incident-${x.id}-third`,date:x.date,type:"Ingreso",concept:`Siniestro · ${x.type} · reembolso tercero`,category:"Vehículo",method:"Transferencia",amount:x.paidByThirdParty,work:false,accountId:x.accountId||account,affectsCash:true,affectsPnl:true,sourceType:"incident",sourceId:x.id,status:"Confirmado"});}
 for(const x of args.loans){out.push({id:`loan-${x.id}-disbursement`,date:x.startDate,type:"Gasto",concept:`Capital entregado · ${x.borrower}`,category:"Préstamos por cobrar",method:"Transferencia",amount:x.principal,work:false,accountId:x.accountId||account,affectsCash:true,affectsPnl:false,capitalEffect:-x.principal,sourceType:"loan_disbursement",sourceId:x.id,status:"Confirmado"});}
 for(const x of args.cardOps){
  if(x.status==="Anulado")continue;
  if(x.type==="Compra"||["Interés","Seguro","Membresía","Comisión"].includes(x.type))out.push({id:`card-${x.id}`,date:x.date,type:"Gasto",concept:`Tarjeta · ${x.concept}`,category:x.type==="Compra"?"Consumo":"Costos de tarjeta",method:"Crédito",amount:x.amount+x.fee,work:false,accountId:account,affectsCash:false,affectsPnl:true,sourceType:"card_purchase",sourceId:x.id,status:"Confirmado"});
  else if(x.type==="Pago")out.push({id:`card-${x.id}`,date:x.date,type:"Gasto",concept:`Pago de tarjeta · ${x.concept}`,category:"Pago de tarjeta",method:"Transferencia",amount:x.amount,work:false,accountId:account,affectsCash:true,affectsPnl:false,capitalEffect:-x.amount,sourceType:"card_payment",sourceId:x.id,status:"Confirmado"});
  else if(x.type==="Ruleteo"||x.type==="Disposición")out.push({id:`card-${x.id}`,date:x.date,type:"Ingreso",concept:`Liquidez con tarjeta · ${x.concept}`,category:"Financiero",method:"Crédito",amount:x.cashReceived??x.amount,work:false,accountId:account,affectsCash:true,affectsPnl:false,sourceType:"card_purchase",sourceId:x.id,status:"Confirmado"});
 }
 for(const x of args.loanPayments.filter(x=>x.status!=="Anulado")){out.push({id:`loan-${x.id}-principal`,date:x.date,type:"Ingreso",concept:"Cobro de capital",category:"Préstamos por cobrar",method:"Transferencia",amount:x.principal,work:false,accountId:account,affectsCash:true,affectsPnl:false,capitalEffect:x.principal,sourceType:"loan_payment",sourceId:x.id,status:"Confirmado"});if(x.interest+x.lateFee)out.push({id:`loan-${x.id}-interest`,date:x.date,type:"Ingreso",concept:"Interés / mora cobrada",category:"Rendimientos financieros",method:"Transferencia",amount:x.interest+x.lateFee,work:false,accountId:account,affectsCash:true,affectsPnl:true,sourceType:"loan_payment",sourceId:x.id,status:"Confirmado"});}
 for(const x of args.debtPayments.filter(x=>x.status!=="Anulado")){out.push({id:`debt-${x.id}-principal`,date:x.date,type:"Gasto",concept:"Amortización de capital",category:"Deuda / Capital",method:"Transferencia",amount:x.principal,work:false,accountId:account,affectsCash:true,affectsPnl:false,capitalEffect:-x.principal,sourceType:"debt_payment",sourceId:x.id,status:"Confirmado"});if(x.interest+x.insurance)out.push({id:`debt-${x.id}-cost`,date:x.date,type:"Gasto",concept:"Interés / desgravamen",category:"Financiero",method:"Transferencia",amount:x.interest+x.insurance,work:false,accountId:account,affectsCash:true,affectsPnl:true,sourceType:"debt_payment",sourceId:x.id,status:"Confirmado"});}
 for(const x of args.goalMovements.filter(x=>x.status!=="Anulado"))out.push({id:`goal-${x.id}`,date:x.date,type:x.type==="Aporte"?"Gasto":"Ingreso",concept:`${x.type} · meta`,category:"Ahorro / Metas",method:"Transferencia",amount:x.amount,work:false,accountId:x.accountId||account,affectsCash:false,affectsPnl:false,capitalEffect:0,sourceType:x.type==="Aporte"?"goal_contribution":"goal_withdrawal",sourceId:x.id,status:"Confirmado"});
 return out;
}

export function mergeLinkedMovements(existing:T.Movement[], derived:T.Movement[]){
  const managed=new Set<T.SourceType>(["work","fuel","maintenance","insurance","fine","incident","loan_disbursement","card_purchase","card_payment","loan_payment","debt_payment","goal_contribution","goal_withdrawal","improvement","tire"]);
  const keep=existing.filter(x=>!x.sourceType||!managed.has(x.sourceType));
  const seen=new Set<string>();
  return [...keep,...derived.filter(x=>{const id=String(x.id); if(seen.has(id))return false; seen.add(id); return x.amount>0;})];
}

export function periodBounds(kind:"month"|"quarter"|"year", anchor:string=today){
 const d=new Date(`${anchor}T12:00:00`); const y=d.getFullYear(),m=d.getMonth();
 if(kind==="year")return {start:`${y}-01-01`,end:`${y}-12-31`};
 if(kind==="quarter"){const q=Math.floor(m/3)*3;const end=new Date(y,q+3,0);return {start:`${y}-${String(q+1).padStart(2,"0")}-01`,end:end.toISOString().slice(0,10)}}
 return {start:`${y}-${String(m+1).padStart(2,"0")}-01`,end:new Date(y,m+1,0).toISOString().slice(0,10)};
}

export function filterPeriod<TItem extends {date:string}>(rows:TItem[],start:string,end:string){return rows.filter(x=>x.date>=start&&x.date<=end)}

/** Normaliza una cuota de préstamo personal y conserva exactamente capital + interés. */
export function loanScheduleSummary(loan:T.Loan){
  const plan=simpleLoanPlan(loan.principal,loan.rate,loan.term);
  const paidPrincipal=(loan.principal-Math.max(0,loan.balance));
  const paidInterest=Math.max(0,loan.interestRecovered??0);
  return { ...plan, paidPrincipal:roundMoney(paidPrincipal), paidInterest:roundMoney(paidInterest), pendingPrincipal:roundMoney(Math.max(0,loan.balance)), pendingInterest:roundMoney(Math.max(0,plan.interest-paidInterest)), pendingTotal:roundMoney(Math.max(0,loan.balance)+Math.max(0,plan.interest-paidInterest)) };
}

export function cardInstallmentSchedule(op:T.CardOperation, card?:T.Card){
  if(op.type!=="Compra" || op.purchaseMode!=="Cuotas") return [];
  const n=Math.max(1,Math.floor(op.installments||1)); const total=roundMoney(op.amount+op.fee); const base=roundMoney(total/n);
  const start=op.statementDate||op.date; const paymentDay=card?Number(String(card.payment).match(/\d+/)?.[0]||15):Number(start.slice(8));
  const startDate=new Date(start+"T12:00:00");
  return Array.from({length:n},(_,i)=>{ const d=new Date(startDate); d.setMonth(d.getMonth()+i); d.setDate(Math.min(paymentDay,28)); const date=d.toISOString().slice(0,10); return {number:i+1,amount:i===n-1?roundMoney(total-base*(n-1)):base,date,status:i+1<=(op.currentInstallment||0)?"Facturada":"Pendiente" as const}; });
}

export function budgetStatus(budget:T.Budget, movements:T.Movement[], start:string, end:string){
  const spent=roundMoney(movements.filter(m=>m.status!=="Anulado"&&m.type==="Gasto"&&m.affectsPnl!==false&&m.category===budget.category&&m.date>=start&&m.date<=end).reduce((s,m)=>s+m.amount,0));
  const remaining=roundMoney(budget.limit-spent); const pct=budget.limit>0?roundMoney(spent/budget.limit*100):0;
  return {spent,remaining,pct,over:spent>budget.limit};
}

export function validateDataset(args:{movements:T.Movement[];accounts:T.FinancialAccount[];transfers:T.Transfer[];vehicles:T.Vehicle[];insurance:T.Insurance[];fines:T.Fine[];incidents:T.Incident[];fuel:T.FuelStop[];maintenance:T.Maintenance[];sessions:T.WorkSession[];bonuses:T.Bonus[];cards:T.Card[];cardOps:T.CardOperation[];borrowers:T.Borrower[];loans:T.Loan[];loanPayments:T.LoanPayment[];debts:T.Debt[];debtPayments:T.DebtPayment[];goals:T.Goal[];goalMovements:T.GoalMovement[];improvements?:T.VehicleImprovement[];tires?:T.TireRecord[];recurringExpenses?:T.RecurringExpense[];investments?:T.Investment[];investmentMovements?:T.InvestmentMovement[]}){
  const errors:string[]=[]; const accountIds=new Set(args.accounts.map(a=>a.id)); const vehicleIds=new Set(args.vehicles.map(v=>v.id)); const sessionIds=new Set(args.sessions.map(s=>s.id)); const cardIds=new Set(args.cards.map(c=>c.id)); const borrowerIds=new Set(args.borrowers.map(b=>b.id)); const loanIds=new Set(args.loans.map(l=>l.id)); const debtIds=new Set(args.debts.map(d=>d.id)); const goalIds=new Set(args.goals.map(g=>g.id));
  for(const m of args.movements){ if(m.amount<0) errors.push(`Movimiento ${m.id}: importe negativo`); if(m.currency!==undefined&&m.currency!=="PEN"&&m.currency!=="USD") errors.push(`Movimiento ${m.id}: moneda inválida`); if(m.accountId&&!accountIds.has(m.accountId)) errors.push(`Movimiento ${m.id}: cuenta inexistente`); const acc=m.accountId?args.accounts.find(a=>a.id===m.accountId):undefined; if(acc&&m.currency&&acc.currency!==m.currency) errors.push(`Movimiento ${m.id}: moneda no coincide con la cuenta`); if(m.sourceType&&m.sourceType!=="manual"&&m.sourceId===undefined) errors.push(`Movimiento ${m.id}: fuente sin sourceId`); }
  for(const t of args.transfers){ if(t.fromAccountId===t.toAccountId) errors.push(`Transferencia ${t.id}: origen y destino iguales`); if(!accountIds.has(t.fromAccountId)||!accountIds.has(t.toAccountId)) errors.push(`Transferencia ${t.id}: cuenta inexistente`); if(t.amount<=0||t.fee<0) errors.push(`Transferencia ${t.id}: importe inválido`); }
  for(const f of args.fuel){ if(!vehicleIds.has(f.vehicleId)) errors.push(`Combustible ${f.id}: vehículo inexistente`); if(f.total<0||Math.abs(f.total-f.items.reduce((s,i)=>s+i.total,0))>0.02) errors.push(`Combustible ${f.id}: total no coincide con sus detalles`); if(f.methods.reduce((s,x)=>s+x.amount,0)>0&&Math.abs(f.total-f.methods.reduce((s,x)=>s+x.amount,0))>0.02) errors.push(`Combustible ${f.id}: medios de pago no cuadran`); if(f.linkedSessionId!==undefined&&!sessionIds.has(f.linkedSessionId)) errors.push(`Combustible ${f.id}: jornada inexistente`); }
  for(const x of args.insurance??[]){ if(!vehicleIds.has(x.vehicleId)) errors.push(`Seguro ${x.id}: vehículo inexistente`); if(x.cost<0) errors.push(`Seguro ${x.id}: costo negativo`); if(x.accountId&&!accountIds.has(x.accountId)) errors.push(`Seguro ${x.id}: cuenta inexistente`); }
  for(const x of args.fines??[]){ if(!vehicleIds.has(x.vehicleId)) errors.push(`Multa ${x.id}: vehículo inexistente`); if(x.amount<0||x.discountAmount<0||x.discountAmount>x.amount) errors.push(`Multa ${x.id}: descuento inválido`); }
  for(const x of args.incidents??[]){ if(!vehicleIds.has(x.vehicleId)) errors.push(`Siniestro ${x.id}: vehículo inexistente`); if(x.totalCost<0||x.paidByUser<0||x.paidByThirdParty<0) errors.push(`Siniestro ${x.id}: costos inválidos`); }
  for(const m of args.maintenance){ if(!vehicleIds.has(m.vehicleId)) errors.push(`Mantenimiento ${m.id}: vehículo inexistente`); if(m.partsCost<0||m.laborCost<0) errors.push(`Mantenimiento ${m.id}: costo negativo`); if(m.linkedSessionId!==undefined&&!sessionIds.has(m.linkedSessionId)) errors.push(`Mantenimiento ${m.id}: jornada inexistente`); }
  for(const b of args.bonuses){ if(!sessionIds.has(b.workSessionId)) errors.push(`Bono ${b.id}: jornada inexistente`); }
  for(const c of args.cards){ if(c.line<0||c.used<0||c.used>c.line+0.01) errors.push(`Tarjeta ${c.id}: utilización fuera de línea`); if(c.currency!=="PEN"&&c.currency!=="USD") errors.push(`Tarjeta ${c.id}: moneda inválida`); }
  for(const o of args.cardOps){ if(!cardIds.has(o.cardId)) errors.push(`Operación tarjeta ${o.id}: tarjeta inexistente`); if(o.amount<0||o.fee<0) errors.push(`Operación tarjeta ${o.id}: importe inválido`); if(o.type==="Compra"&&o.purchaseMode==="Cuotas"&&(o.installments||0)<1) errors.push(`Operación tarjeta ${o.id}: cuotas inválidas`); }
  for(const l of args.loans){ if(!borrowerIds.has(l.borrowerId)) errors.push(`Préstamo ${l.id}: prestatario inexistente`); const plan=simpleLoanPlan(l.principal,l.rate,l.term); if(Math.abs(l.totalScheduled-plan.total)>0.02||Math.abs(l.installment-plan.installment)>0.02) errors.push(`Préstamo ${l.id}: plan de cuotas inconsistente`); if(l.balance<0||l.balance>l.principal+0.01) errors.push(`Préstamo ${l.id}: saldo inválido`); }
  for(const p of args.loanPayments){ if(!loanIds.has(p.loanId)) errors.push(`Cobro ${p.id}: préstamo inexistente`); if(Math.abs(p.amount-(p.principal+p.interest+p.lateFee))>0.02) errors.push(`Cobro ${p.id}: componentes no cuadran`); }
  for(const d of args.debts){ if(d.vehicleId&&!vehicleIds.has(d.vehicleId)) errors.push(`Deuda ${d.id}: vehículo inexistente`); if(d.balance<0||d.principal<0||d.balance>d.principal+0.01) errors.push(`Deuda ${d.id}: saldo inválido`); }
  for(const p of args.debtPayments){ if(!debtIds.has(p.debtId)) errors.push(`Pago deuda ${p.id}: deuda inexistente`); if(Math.abs(p.amount-(p.principal+p.interest+p.insurance+p.fees))>0.02) errors.push(`Pago deuda ${p.id}: componentes no cuadran`); }
  for(const g of args.goalMovements){ if(!goalIds.has(g.goalId)) errors.push(`Movimiento meta ${g.id}: meta inexistente`); if(g.amount<=0) errors.push(`Movimiento meta ${g.id}: importe inválido`); if(g.accountId&&!accountIds.has(g.accountId)) errors.push(`Movimiento meta ${g.id}: cuenta inexistente`); }
  for(const x of args.improvements??[]){ if(!vehicleIds.has(x.vehicleId)) errors.push(`Mejora ${x.id}: vehículo inexistente`); if(x.amount<0) errors.push(`Mejora ${x.id}: costo negativo`); if(x.accountId&&!accountIds.has(x.accountId)) errors.push(`Mejora ${x.id}: cuenta inexistente`); }
  for(const x of args.tires??[]){ if(!vehicleIds.has(x.vehicleId)) errors.push(`Neumático ${x.id}: vehículo inexistente`); if(x.price<0||x.repairCost<0) errors.push(`Neumático ${x.id}: costo negativo`); if(x.odometer<0) errors.push(`Neumático ${x.id}: kilometraje inválido`); }
  for(const x of args.recurringExpenses??[]){ if(x.amount<0) errors.push(`Recurrente ${x.id}: importe negativo`); if(x.accountId&&!accountIds.has(x.accountId)) errors.push(`Recurrente ${x.id}: cuenta inexistente`); if(x.endDate&&x.endDate<x.startDate) errors.push(`Recurrente ${x.id}: rango de fechas inválido`); }
  for(const x of args.investments??[]){ if(x.contributed<0||x.currentValue<0) errors.push(`Inversión ${x.id}: valor negativo`); if(x.accountId&&!accountIds.has(x.accountId)) errors.push(`Inversión ${x.id}: cuenta inexistente`); }
  for(const x of args.investmentMovements??[]){ if(!((args.investments??[]).some(i=>i.id===x.investmentId))) errors.push(`Movimiento inversión ${x.id}: inversión inexistente`); if(x.amount<=0) errors.push(`Movimiento inversión ${x.id}: importe inválido`); }
  return {ok:errors.length===0,errors};
}

/** Genera eventos futuros distribuidos por fecha para calendario y pronóstico. */
export function recurringDates(item:T.RecurringExpense, until:string, currency?:T.Currency){
  const rows:T.FinancialEvent[]=[]; let d=item.nextDate; const anchorDay=Number(item.nextDate.slice(8,10)); let guard=0;
  while(d<=until && guard++<400){
    rows.push({id:`recurring-${item.id}-${d}`,date:d,label:item.name,amount:item.amount,direction:"OUT",category:item.category,sourceType:"recurring",sourceId:item.id,currency,status:d<today?"Vencido":"Programado"});
    d=addFrequency(d,item.frequency,anchorDay);
  }
  return rows;
}

export function financialEvents(args:{debts:T.Debt[];loans:T.Loan[];cards:T.Card[];recurringExpenses:T.RecurringExpense[];insurance?:T.Insurance[];fines?:T.Fine[];maintenance?:T.Maintenance[];accounts?:T.FinancialAccount[];start:string;days?:number}){
  const currencyOf=(id?:string):T.Currency|undefined=>id?args.accounts?.find(a=>a.id===id)?.currency:undefined;
  const end=addDays(args.start,Math.max(0,args.days??90)-1); const out:T.FinancialEvent[]=[];
  const status=(date:string)=>date<today?"Vencido":"Programado" as const;
  for(const d of args.debts.filter(x=>x.status!=="Pagada")){ let date=d.nextPayment; const anchorDay=Number(d.nextPayment.slice(8,10)); let remaining=Math.max(0,d.balance); let guard=0; while(date<=end&&guard++<400&&remaining>0.009){ const amount=roundMoney(Math.min(d.installment,remaining)); if(date>=args.start) out.push({id:`debt-${d.id}-${date}`,date,label:`Pago · ${d.lender}`,amount,direction:"OUT",category:"Deuda",sourceType:"debt_payment",sourceId:d.id,currency:currencyOf(d.accountId),status:status(date)}); remaining=roundMoney(remaining-amount); date=addFrequency(date,d.frequency,anchorDay); } }
  for(const l of args.loans.filter(x=>x.status!=="Pagado")){ let date=l.nextPayment; const anchorDay=Number(l.nextPayment.slice(8,10)); let remaining=Math.max(0,l.balance); let guard=0; while(date<=end&&guard++<400&&remaining>0.009){ const amount=roundMoney(Math.min(l.installment,remaining)); if(date>=args.start) out.push({id:`loan-${l.id}-${date}`,date,label:`Cobro · ${l.borrower}`,amount,direction:"IN",category:"Préstamo otorgado",sourceType:"loan_payment",sourceId:l.id,currency:currencyOf(l.accountId),status:status(date)}); remaining=roundMoney(remaining-amount); date=addFrequency(date,l.frequency,anchorDay); } }
  for(const c of args.cards.filter(x=>x.status==="Activa"&&x.used>0)){ const day=Math.min(28,Math.max(1,Number(String(c.payment).match(/\d+/)?.[0]||15))); let d=args.start; let guard=0; while(d<=end&&guard++<100){ const base=new Date(d+"T12:00:00"); base.setDate(1); base.setDate(Math.min(day,28)); const candidate=base.toISOString().slice(0,10); if(candidate>=args.start&&candidate<=end) out.push({id:`card-${c.id}-${candidate}`,date:candidate,label:`Pago tarjeta · ${c.bank}`,amount:c.used,direction:"OUT",category:"Tarjetas",sourceType:"card_payment",sourceId:c.id,currency:(c.currency==="USD"?"USD":"PEN"),status:status(candidate)}); d=addDays(candidate,28); const nd=new Date(candidate+"T12:00:00"); nd.setDate(1); nd.setMonth(nd.getMonth()+1); d=nd.toISOString().slice(0,10); } }
  for(const r of args.recurringExpenses.filter(x=>x.active)) out.push(...recurringDates(r,end,currencyOf(r.accountId)).filter(e=>e.date>=args.start));
  for(const i of args.insurance||[]) if(i.end>=args.start&&i.end<=end&&i.paid!==true) out.push({id:`insurance-${i.id}`,date:i.end,label:`Renovación seguro · ${i.company}`,amount:i.cost,direction:"OUT",category:"Seguro",sourceType:"insurance",sourceId:i.id,currency:currencyOf(i.accountId),status:status(i.end)});
  for(const f of args.fines||[]) if(f.status==="Pendiente"&&f.due>=args.start&&f.due<=end) out.push({id:`fine-${f.id}`,date:f.due,label:`Multa · ${f.code}`,amount:Math.max(0,f.amount-f.discountAmount),direction:"OUT",category:"Multas",sourceType:"fine",sourceId:f.id,currency:currencyOf(f.accountId),status:status(f.due)});
  for(const m of args.maintenance||[]) if(m.status!=="Completado"&&m.nextDate&&m.nextDate>=args.start&&m.nextDate<=end) out.push({id:`maintenance-${m.id}`,date:m.nextDate,label:`Mantenimiento · ${m.service}`,amount:m.partsCost+m.laborCost,direction:"OUT",category:"Vehículo",sourceType:"maintenance",sourceId:m.id,currency:currencyOf(m.accountId),status:status(m.nextDate)});
  return out.sort((a,b)=>a.date.localeCompare(b.date));
}

export function cashForecastTimeline(args:{currency?:T.Currency;accounts:T.FinancialAccount[];movements:T.Movement[];transfers:T.Transfer[];debts:T.Debt[];loans:T.Loan[];recurringExpenses:T.RecurringExpense[];cards:T.Card[];insurance?:T.Insurance[];fines?:T.Fine[];maintenance?:T.Maintenance[];start?:string;days?:number}):T.ForecastPoint[]{
  const start=args.start||today; const days=Math.max(1,args.days??30); const currency=args.currency||"PEN"; const ledger=buildLedger(args); const current=accountBalances(args.accounts,ledger).filter(a=>a.currency===currency).reduce((s,a)=>s+a.balance,0); const events=financialEvents({...args,start,days}).filter(e=>e.currency===currency || (e.currency===undefined && currency==="PEN"));
  let running=current; const points:T.ForecastPoint[]=[];
  for(let i=0;i<days;i++){ const d=addDays(start,i); const es=events.filter(e=>e.date===d); const inflows=es.filter(e=>e.direction==="IN").reduce((s,e)=>s+e.amount,0); const outflows=es.filter(e=>e.direction==="OUT").reduce((s,e)=>s+e.amount,0); const opening=running; running=roundMoney(running+inflows-outflows); points.push({date:d,opening,inflows:roundMoney(inflows),outflows:roundMoney(outflows),closing:running,events:es}); }
  return points;
}

export function loanPaymentConsistency(loan:T.Loan,payments:T.LoanPayment[]){
  const active=payments.filter(p=>p.loanId===loan.id&&p.status!=="Anulado"); const principalRecovered=roundMoney(active.reduce((s,p)=>s+p.principal,0)); const interestRecovered=roundMoney(active.reduce((s,p)=>s+p.interest,0)); const fees=roundMoney(active.reduce((s,p)=>s+p.lateFee,0));
  return {principalRecovered,interestRecovered,fees,expectedPrincipalRemaining:roundMoney(Math.max(0,loan.principal-principalRecovered)),recordedBalance:roundMoney(loan.balance),principalConsistent:Math.abs(Math.max(0,loan.principal-principalRecovered)-loan.balance)<=0.02,interestWithinPlan:interestRecovered<=simpleLoanPlan(loan.principal,loan.rate,loan.term).interest+0.02};
}
