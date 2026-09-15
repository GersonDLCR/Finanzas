/**
 * Explicit Frontend <-> Supabase DTO boundary.
 * UI/domain IDs may remain string|number for demo data; Supabase persistence
 * uses UUIDs. Keep this file as the only place where column naming/type
 * differences are translated.
 */
import type * as T from "@/types";

type Row = Record<string, any>;
const id = (v: unknown) => String(v);
const date = (v: unknown) => v == null ? "" : String(v).slice(0, 10);
const num = (v: unknown, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const currency = (v: unknown): T.Currency => v === "USD" ? "USD" : "PEN";

export const accountToRow = (x:T.FinancialAccount, userId:string):Row => ({
  id:x.id, user_id:userId, name:x.name, type:x.type, currency:x.currency,
  opening_balance:x.openingBalance, status:x.status, notes:x.notes ?? null,
});
export const rowToAccount = (r:Row):T.FinancialAccount => ({
  id:id(r.id), name:String(r.name), type:r.type, currency:currency(r.currency),
  openingBalance:num(r.opening_balance), balance:num(r.balance, num(r.opening_balance)),
  status:r.status === "Inactiva" ? "Inactiva" : "Activa", notes:r.notes ?? undefined,
});

export const movementToRow = (x:T.Movement, userId:string):Row => ({
  id:typeof x.id === "string" ? x.id : undefined, user_id:userId, date:x.date,
  type:x.type, concept:x.concept, category_id:x.category || null, account_id:x.accountId || null,
  method:x.method, amount:x.amount, currency:x.currency || "PEN", affects_cash:x.affectsCash !== false,
  affects_pnl:x.affectsPnl !== false, capital_effect:x.capitalEffect ?? 0,
  source_type:x.sourceType || "manual", source_id:x.sourceId == null ? null : String(x.sourceId),
  linked_work_session_id:x.linkedSessionId == null ? null : String(x.linkedSessionId),
  status:x.status || "Confirmado", notes:x.notes ?? null,
});
export const rowToMovement = (r:Row):T.Movement => ({
  id:id(r.id), date:date(r.date), type:r.type, concept:String(r.concept), category:String(r.category ?? "Sin categoría"),
  method:r.method || "Otro", amount:num(r.amount), currency:currency(r.currency), work:r.source_type === "work",
  accountId:r.account_id ? id(r.account_id) : undefined, sourceType:r.source_type, sourceId:r.source_id ? id(r.source_id) : undefined,
  linkedSessionId:r.linked_work_session_id ? Number(r.linked_work_session_id) || undefined : undefined,
  affectsCash:r.affects_cash, affectsPnl:r.affects_pnl, capitalEffect:num(r.capital_effect), status:r.status,
  notes:r.notes ?? undefined,
});

export const vehicleToRow = (x:T.Vehicle,userId:string):Row => ({
  id:x.id,user_id:userId,brand:x.brand,model:x.model,version:x.version,year:x.year,plate:x.plate,km:x.km,
  fuels:x.fuels,transmission:x.transmission,value:x.value,debt:x.debt,inspection:x.inspection,health:x.health,
  soat_date:x.soat || null,insurance_date:x.insurance || null,manual:x.manual,color:x.color,engine:x.engine,vin:x.vin,owner:x.owner,
});
export const rowToVehicle = (r:Row):T.Vehicle => ({
  id:id(r.id),brand:String(r.brand),model:String(r.model),version:String(r.version ?? ""),year:num(r.year),plate:String(r.plate),km:num(r.km),
  fuels:Array.isArray(r.fuels) ? r.fuels : [],transmission:String(r.transmission ?? ""),value:num(r.value),debt:num(r.debt),inspection:String(r.inspection ?? ""),
  health:num(r.health,100),soat:date(r.soat_date),insurance:date(r.insurance_date),manual:String(r.manual ?? ""),color:String(r.color ?? ""),engine:String(r.engine ?? ""),vin:String(r.vin ?? ""),owner:String(r.owner ?? ""),
});

export const documentToRow=(x:T.VehicleDocument,userId:string):Row=>({id:typeof x.id === "string" ? x.id : undefined,user_id:userId,vehicle_id:x.vehicleId,type:x.type,number:x.number,issuer:x.issuer,start_date:x.start||null,end_date:x.end||null,status:x.status,cost:x.cost??0,notes:x.notes??null});
export const rowToDocument=(r:Row):T.VehicleDocument=>({id:Number(r.id)||id(r.id),vehicleId:id(r.vehicle_id),type:String(r.type),number:String(r.number??""),issuer:String(r.issuer??""),start:date(r.start_date),end:r.end_date?date(r.end_date):undefined,status:String(r.status??""),cost:num(r.cost),notes:r.notes??undefined});

export const insuranceToRow=(x:T.Insurance,userId:string):Row=>({id:typeof x.id === "string" ? x.id : undefined,user_id:userId,vehicle_id:x.vehicleId,type:x.type,company:x.company,policy:x.policy,start_date:x.start,end_date:x.end,cost:x.cost,frequency:x.frequency,coverage:x.coverage??null,account_id:x.accountId??null,paid:x.paid!==false,notes:x.notes??null});
export const rowToInsurance=(r:Row):T.Insurance=>({id:Number(r.id)||id(r.id),vehicleId:id(r.vehicle_id),type:String(r.type),company:String(r.company??""),policy:String(r.policy??""),start:date(r.start_date),end:date(r.end_date),cost:num(r.cost),frequency:r.frequency,coverage:r.coverage??undefined,accountId:r.account_id? id(r.account_id):undefined,paid:r.paid,notes:r.notes??undefined});

export const fineToRow=(x:T.Fine,userId:string):Row=>({id:typeof x.id === "string" ? x.id : undefined,user_id:userId,vehicle_id:x.vehicleId,date:x.date,code:x.code,description:x.description,amount:x.amount,discount_amount:x.discountAmount,discount_percent:x.discountPercent,discount_until:x.discountUntil||null,status:x.status,due_date:x.due||null,points:x.points??null,prescription_eligible:x.prescriptionEligible,notes:x.notes??null});
export const rowToFine=(r:Row):T.Fine=>({id:Number(r.id)||id(r.id),vehicleId:id(r.vehicle_id),date:date(r.date),code:String(r.code??""),description:String(r.description??""),amount:num(r.amount),discountAmount:num(r.discount_amount),discountPercent:num(r.discount_percent),discountUntil:date(r.discount_until),status:r.status,due:date(r.due_date),points:r.points==null?undefined:num(r.points),prescriptionEligible:Boolean(r.prescription_eligible),notes:r.notes??undefined});

export const workSessionToRow=(x:T.WorkSession,userId:string):Row=>({id:typeof x.id === "string" ? x.id : undefined,user_id:userId,vehicle_id:x.vehicleId,date:x.date,start_time:x.start,end_time:x.end,hours:x.hours,km:x.km,trips:x.trips,gross:x.gross,commission:x.commission,bonuses:x.bonuses,fuel_cost:x.fuelCost,other_cost:x.otherCost,account_id:x.accountId??null,fuel_accounting:x.fuelAccounting||"Jornada",notes:x.notes??null});
export const rowToWorkSession=(r:Row):T.WorkSession=>({id:Number(r.id)||id(r.id),vehicleId:id(r.vehicle_id),date:date(r.date),start:String(r.start_time),end:String(r.end_time),hours:num(r.hours),km:num(r.km),trips:num(r.trips),gross:num(r.gross),commission:num(r.commission),bonuses:num(r.bonuses),fuelCost:num(r.fuel_cost),otherCost:num(r.other_cost),apps:Array.isArray(r.apps)?r.apps:[],accountId:r.account_id? id(r.account_id):undefined,fuelAccounting:r.fuel_accounting,notes:r.notes??undefined});

export const maintenanceToRow=(x:T.Maintenance,userId:string):Row=>({id:typeof x.id === "string" ? x.id : undefined,user_id:userId,vehicle_id:x.vehicleId,work_session_id:x.linkedSessionId==null?null:String(x.linkedSessionId),account_id:x.accountId??null,type:x.type,service:x.service,date:x.date,km:x.km,parts_cost:x.partsCost,labor_cost:x.laborCost,performed_by:x.performedBy,interval_months:x.intervalMonths??null,interval_km:x.intervalKm??null,next_date:x.nextDate??null,next_km:x.nextKm??null,source:x.source,status:x.status,notes:x.notes??null});
export const rowToMaintenance=(r:Row):T.Maintenance=>({id:Number(r.id)||id(r.id),vehicleId:id(r.vehicle_id),type:r.type,service:String(r.service),date:date(r.date),km:num(r.km),partsCost:num(r.parts_cost),laborCost:num(r.labor_cost),performedBy:r.performed_by,intervalMonths:r.interval_months==null?undefined:num(r.interval_months),intervalKm:r.interval_km==null?undefined:num(r.interval_km),nextDate:r.next_date?date(r.next_date):undefined,nextKm:r.next_km==null?undefined:num(r.next_km),source:String(r.source??""),status:r.status,accountId:r.account_id? id(r.account_id):undefined,linkedSessionId:r.work_session_id?Number(r.work_session_id)||undefined:undefined,notes:r.notes??undefined});

export const loanToRow=(x:T.Loan,userId:string):Row=>({id:x.id,user_id:userId,borrower_id:x.borrowerId,principal:x.principal,balance:x.balance,rate:x.rate,frequency:x.frequency,term:x.term,installment:x.installment,total_scheduled:x.totalScheduled,recovered:x.recovered,interest_recovered:x.interestRecovered??0,next_payment:x.nextPayment,start_date:x.startDate,account_id:x.accountId??null,status:x.status,notes:x.notes??null});
export const rowToLoan=(r:Row,borrowerName=""):T.Loan=>({id:id(r.id),borrowerId:id(r.borrower_id),borrower:borrowerName,principal:num(r.principal),balance:num(r.balance),rate:num(r.rate),frequency:r.frequency,term:num(r.term),installment:num(r.installment),totalScheduled:num(r.total_scheduled),recovered:num(r.recovered),interestRecovered:num(r.interest_recovered),nextPayment:date(r.next_payment),status:r.status,startDate:date(r.start_date),accountId:r.account_id?id(r.account_id):undefined,notes:r.notes??undefined});

export const debtToRow=(x:T.Debt,userId:string):Row=>({id:x.id,user_id:userId,vehicle_id:x.vehicleId??null,lender:x.lender,product:x.product,principal:x.principal,balance:x.balance,annual_rate:x.annualRate,tea:x.tea,tcea:x.tcea,installment:x.installment,frequency:x.frequency,term:x.term,desgravamen:x.desgravamen,fees:x.fees,next_payment:x.nextPayment,start_date:x.startDate,final_date:x.finalDate,account_id:x.accountId??null,status:x.status});
export const rowToDebt=(r:Row):T.Debt=>({id:id(r.id),vehicleId:r.vehicle_id?id(r.vehicle_id):undefined,lender:String(r.lender),product:String(r.product),principal:num(r.principal),balance:num(r.balance),annualRate:num(r.annual_rate),tea:num(r.tea),tcea:num(r.tcea),installment:num(r.installment),frequency:r.frequency,term:num(r.term),desgravamen:num(r.desgravamen),fees:num(r.fees),nextPayment:date(r.next_payment),startDate:date(r.start_date),finalDate:date(r.final_date),accountId:r.account_id?id(r.account_id):undefined,status:r.status});

export const goalToRow=(x:T.Goal,userId:string):Row=>({id:x.id,user_id:userId,name:x.name,target:x.target,current_amount:x.current,deadline:x.deadline,category:x.category,frequency:x.frequency,notes:x.notes??null});
export const rowToGoal=(r:Row):T.Goal=>({id:id(r.id),name:String(r.name),target:num(r.target),current:num(r.current_amount),deadline:date(r.deadline),category:String(r.category??""),frequency:r.frequency,notes:r.notes??undefined});
export const budgetToRow=(x:T.Budget,userId:string):Row=>({id:typeof x.id === "string" ? x.id : undefined,user_id:userId,name:x.name,limit_amount:x.limit,category_id:x.category||null,period:x.period,active:x.active});
export const rowToBudget=(r:Row):T.Budget=>({id:Number(r.id)||id(r.id),name:String(r.name),limit:num(r.limit_amount),category:String(r.category??""),period:r.period,active:Boolean(r.active)});

export const transferToRow=(x:T.Transfer,userId:string):Row=>({id:x.id,user_id:userId,date:x.date,from_account_id:x.fromAccountId,to_account_id:x.toAccountId,amount:x.amount,fee:x.fee,status:x.status,notes:x.notes??null});
export const rowToTransfer=(r:Row):T.Transfer=>({id:id(r.id),date:date(r.date),fromAccountId:id(r.from_account_id),toAccountId:id(r.to_account_id),amount:num(r.amount),fee:num(r.fee),status:r.status,notes:r.notes??undefined});

/** Fails fast before persistence instead of silently inventing ownership/currency data. */
export function assertPersistableMovement(x:T.Movement){
  if(!x.accountId) throw new Error("El movimiento monetario requiere accountId antes de persistirse.");
  if(!x.currency) throw new Error("El movimiento monetario requiere currency antes de persistirse.");
}
export function assertSameCurrency(a:T.FinancialAccount,b:T.FinancialAccount){
  if(a.currency!==b.currency) throw new Error("Transferencia entre monedas distintas requiere una operación FX explícita.");
}
