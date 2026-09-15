import type * as T from "@/types";
import { today } from "@/lib/format";

export const sum = (values:number[]) => values.reduce((a,b)=>a+b,0);
export const movementTotals = (movements:T.Movement[]) => {
  const active=movements.filter(m=>m.status!=="Anulado");
  const income=sum(active.filter(m=>m.type==="Ingreso"&&m.affectsPnl!==false).map(m=>m.amount));
  const expenses=sum(active.filter(m=>m.type==="Gasto"&&m.affectsPnl!==false).map(m=>m.amount));
  const cashIn=sum(active.filter(m=>m.type==="Ingreso"&&m.affectsCash!==false).map(m=>m.amount));
  const cashOut=sum(active.filter(m=>m.type==="Gasto"&&m.affectsCash!==false).map(m=>m.amount));
  return {income,expenses,net:income-expenses,cashIn,cashOut,cashFlow:cashIn-cashOut};
};
export const workProfit = (sessions:T.WorkSession[]) => sum(sessions.map(s=>s.gross-s.commission+s.bonuses-s.fuelCost-s.otherCost));
export const workCost = (sessions:T.WorkSession[]) => sum(sessions.map(s=>s.commission+s.fuelCost+s.otherCost));
export const workGross = (sessions:T.WorkSession[]) => sum(sessions.map(s=>s.gross));
export const workHours = (sessions:T.WorkSession[]) => sum(sessions.map(s=>s.hours));
export const workKm = (sessions:T.WorkSession[]) => sum(sessions.map(s=>s.km));
export const vehicleCost = (fuel:T.FuelStop[], maintenance:T.Maintenance[]) => sum(fuel.map(x=>x.total)) + sum(maintenance.map(x=>x.partsCost+x.laborCost));
export const debtTotals = (debts:T.Debt[], cards:T.Card[]) => ({
  bank: sum(debts.map(d=>d.balance)),
  cards: sum(cards.map(c=>c.used)),
  total: sum(debts.map(d=>d.balance))+sum(cards.map(c=>c.used)),
});
export const loanReceivables = (loans:T.Loan[]) => sum(loans.map(l=>Math.max(0,l.balance)));
export const netWorth = (vehicles:T.Vehicle[], loans:T.Loan[], debts:T.Debt[], cards:T.Card[], cash:number) =>
  sum(vehicles.map(v=>v.value)) + loanReceivables(loans) + Math.max(0,cash) - sum(debts.map(d=>d.balance)) - sum(cards.map(c=>c.used));

export type FinancialEvent = { id:string; date:string; label:string; amount:number; kind:"inflow"|"outflow"|"info"; source:string };
export function buildFinancialEvents(input:{vehicles:T.Vehicle[];maintenance:T.Maintenance[];loans:T.Loan[];debts:T.Debt[];cards:T.Card[];documents:T.VehicleDocument[];insurance:T.Insurance[];fines:T.Fine[]}):FinancialEvent[] {
  const {vehicles,maintenance,loans,debts,cards,documents,insurance,fines}=input;
  return [
    ...debts.map(d=>({id:`debt-${d.id}`,date:d.nextPayment,label:`Pago · ${d.lender} · ${d.product}`,amount:-d.installment,kind:"outflow" as const,source:"debt"})),
    ...loans.filter(l=>l.balance>0).map(l=>({id:`loan-${l.id}`,date:l.nextPayment,label:`Cobro · ${l.borrower}`,amount:l.installment,kind:"inflow" as const,source:"loan"})),
    ...maintenance.filter(m=>m.nextDate).map(m=>({id:`maintenance-${m.id}`,date:m.nextDate!,label:`Mantenimiento · ${vehicles.find(v=>v.id===m.vehicleId)?.model||"Vehículo"}`,amount:-(m.partsCost+m.laborCost),kind:"outflow" as const,source:"maintenance"})),
    ...cards.map(c=>({id:`card-${c.id}`,date:cardPaymentDate(c.payment),label:`Pago tarjeta · ${c.bank}`,amount:-c.used,kind:"outflow" as const,source:"card"})),
    ...vehicles.flatMap(v=>documents.filter(d=>d.vehicleId===v.id && d.end).map(d=>({id:`document-${d.id}`,date:d.end!,label:`Vencimiento · ${v.plate} · ${d.type}`,amount:0,kind:"info" as const,source:"document"}))),
    ...insurance.map(i=>({id:`insurance-${i.id}`,date:i.end,label:`Seguro · ${vehicles.find(v=>v.id===i.vehicleId)?.plate||"vehículo"}`,amount:-i.cost,kind:"outflow" as const,source:"insurance"})),
    ...fines.filter(f=>f.status!=="Pagada").map(f=>({id:`fine-${f.id}`,date:f.due,label:`Multa · ${f.code}`,amount:-f.amount,kind:"outflow" as const,source:"fine"})),
  ].sort((a,b)=>a.date.localeCompare(b.date));
}

export function buildAlerts(input:{vehicles:T.Vehicle[];maintenance:T.Maintenance[];loans:T.Loan[];debts:T.Debt[];cards:T.Card[];documents:T.VehicleDocument[];insurance:T.Insurance[];fines:T.Fine[]}):string[] {
  const {vehicles,maintenance,loans,debts,cards,documents,insurance,fines}=input;
  return [
    ...maintenance.filter(m=>m.status==="Vencido").map(m=>`Mantenimiento vencido: ${vehicles.find(v=>v.id===m.vehicleId)?.model||"Vehículo"} · ${m.service}`),
    ...documents.filter(d=>d.end && d.end<today).map(d=>`Documento vencido: ${d.type} · ${vehicles.find(v=>v.id===d.vehicleId)?.plate||"vehículo"}`),
    ...insurance.filter(i=>i.end<today).map(i=>`Seguro vencido: ${i.type} · ${vehicles.find(v=>v.id===i.vehicleId)?.plate||"vehículo"}`),
    ...fines.filter(f=>f.status!=="Pagada" && f.due<today).map(f=>`Multa vencida: ${f.code} · ${f.description}`),
    ...loans.filter(l=>l.status==="En mora" || l.nextPayment<today).map(l=>`Préstamo pendiente: ${l.borrower} · ${l.nextPayment}`),
    ...debts.filter(d=>d.nextPayment<=today).map(d=>`Pago de deuda: ${d.lender} · ${d.nextPayment}`),
    ...cards.map(c=>`Pago tarjeta: ${c.bank} · ${c.payment}`),
  ];
}

function cardPaymentDate(value:string){
  const m=value.match(/(\d{1,2})/);
  const day=Math.min(28,Math.max(1,m?Number(m[1]):12));
  const [y,mo]=today.split("-").map(Number);
  return `${y}-${String(mo).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}
