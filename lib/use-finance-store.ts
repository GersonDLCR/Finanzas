"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type * as T from "@/types";
import { frequencies, initialBonuses, initialCardOps, initialCards, initialDebts, initialDebtPayments, initialDocuments, initialFines, initialFuel, initialGoals, initialIncidents, initialInsurance, initialLoanPayments, initialLoans, initialMaintenance, initialMovements, initialSessions, initialVehicles, initialBorrowers, initialAccounts, initialTransfers, initialGoalMovements, initialBudgets, initialImprovements, initialTires, initialRecurringExpenses, initialInvestments, initialInvestmentMovements } from "@/data/demo";
import { addDays, today } from "@/lib/format";
import { clearDemoData, load, save } from "@/lib/storage";
import { financialEvents } from "@/lib/finance/domain";
import { validateDataset } from "@/lib/finance/domain";
import { financialPeriodReport, vehicleProfitability, cashForecast } from "@/lib/finance/analytics";
import { applyDebtPayment, applyLoanPayment, buildLedger, cardUsage, dashboardSnapshot, nextDue, simpleLoanPlan, deriveLinkedMovements, mergeLinkedMovements } from "@/lib/finance/domain";
import type { Dispatch, SetStateAction } from "react";

export function useFinanceStore(){
  const [movements,setMovements]=useState<T.Movement[]>(initialMovements);
  const [accounts,setAccounts]=useState<T.FinancialAccount[]>(initialAccounts);
  const [transfers,setTransfers]=useState<T.Transfer[]>(initialTransfers);
  const [audit,setAudit]=useState<T.AuditEntry[]>([]);
  const [vehicles,setVehicles]=useState<T.Vehicle[]>(initialVehicles);
  const [documents,setDocuments]=useState<T.VehicleDocument[]>(initialDocuments);
  const [insurance,setInsurance]=useState<T.Insurance[]>(initialInsurance);
  const [fines,setFines]=useState<T.Fine[]>(initialFines);
  const [incidents,setIncidents]=useState<T.Incident[]>(initialIncidents);
  const [fuelStops,setFuelStops]=useState<T.FuelStop[]>(initialFuel);
  const [maintenance,setMaintenance]=useState<T.Maintenance[]>(initialMaintenance);
  const [sessions,setSessions]=useState<T.WorkSession[]>(initialSessions);
  const [bonuses,setBonuses]=useState<T.Bonus[]>(initialBonuses);
  const [cards,setCards]=useState<T.Card[]>(initialCards);
  const [cardOps,setCardOps]=useState<T.CardOperation[]>(initialCardOps);
  const [borrowers,setBorrowers]=useState<T.Borrower[]>(initialBorrowers);
  const [loans,setLoans]=useState<T.Loan[]>(initialLoans);
  const [loanPayments,setLoanPayments]=useState<T.LoanPayment[]>(initialLoanPayments);
  const [debts,setDebts]=useState<T.Debt[]>(initialDebts);
  const [debtPayments,setDebtPayments]=useState<T.DebtPayment[]>(initialDebtPayments);
  const [goals,setGoals]=useState<T.Goal[]>(initialGoals);
  const [goalMovements,setGoalMovements]=useState<T.GoalMovement[]>(initialGoalMovements);
  const [budgets,setBudgets]=useState<T.Budget[]>(initialBudgets);
  const [improvements,setImprovements]=useState<T.VehicleImprovement[]>(initialImprovements);
  const [tires,setTires]=useState<T.TireRecord[]>(initialTires);
  const [recurringExpenses,setRecurringExpenses]=useState<T.RecurringExpense[]>(initialRecurringExpenses);
  const [investments,setInvestments]=useState<T.Investment[]>(initialInvestments);
  const [investmentMovements,setInvestmentMovements]=useState<T.InvestmentMovement[]>(initialInvestmentMovements);
  const [hydrated,setHydrated]=useState(false);
  const cardMigrationDone=useRef(false);

  const defaultAccountId=useMemo(()=>accounts.find(a=>a.type==="Cuenta bancaria"&&a.status==="Activa")?.id||accounts[0]?.id,[accounts]);

  const ledger=useMemo(()=>buildLedger({movements,accounts,transfers}),[movements,accounts,transfers]);
  const accountBalances=useMemo(()=>accounts.map(a=>({...a,balance:a.openingBalance+ledger.filter(e=>e.accountId===a.id).reduce((s,e)=>s+(e.direction==="IN"?e.cashAmount:-e.cashAmount),0)})),[accounts,ledger]);
  const snapshot=useMemo(()=>dashboardSnapshot({movements,accounts,loans,debts,cards,sessions,vehicles}),[movements,accounts,loans,debts,cards,sessions,vehicles]);
  useEffect(()=>{
    const pairs:[string,unknown,Dispatch<SetStateAction<any[]>>][]=[
      ["movements",initialMovements,setMovements],["accounts",initialAccounts,setAccounts],["transfers",initialTransfers,setTransfers],["audit",[],setAudit],["vehicles",initialVehicles,setVehicles],["documents",initialDocuments,setDocuments],["insurance",initialInsurance,setInsurance],["fines",initialFines,setFines],["incidents",initialIncidents,setIncidents],["fuel",initialFuel,setFuelStops],["maintenance",initialMaintenance,setMaintenance],["sessions",initialSessions,setSessions],["bonuses",initialBonuses,setBonuses],["cards",initialCards,setCards],["cardops",initialCardOps,setCardOps],["borrowers",initialBorrowers,setBorrowers],["loans",initialLoans,setLoans],["loanpayments",initialLoanPayments,setLoanPayments],["debts",initialDebts,setDebts],["debtpayments",initialDebtPayments,setDebtPayments],["goals",initialGoals,setGoals],["goalmovements",initialGoalMovements,setGoalMovements],["budgets",initialBudgets,setBudgets],["improvements",initialImprovements,setImprovements],["tires",initialTires,setTires],["recurring",initialRecurringExpenses,setRecurringExpenses],["investments",initialInvestments,setInvestments],["investmentmovements",initialInvestmentMovements,setInvestmentMovements]
    ];
    pairs.forEach(([key,fallback,setter])=>setter(load(`f360-${key}`,fallback) as any));
    setHydrated(true);
  },[]);

  useEffect(()=>{
    if(!hydrated)return;
    if(!cardMigrationDone.current){
      cardMigrationDone.current=true;
      setCards(prev=>prev.map(c=>c.baseUsed===undefined?{...c,baseUsed:Math.max(0,c.used-cardUsage(cardOps,c.id))}:c));
    }
    const derived=deriveLinkedMovements({sessions,fuel:fuelStops,maintenance,insurance,fines,incidents,loans,cardOps,loanPayments,debtPayments,goalMovements,defaultAccountId});
    setMovements(prev=>mergeLinkedMovements(prev.map(m=>({...m,accountId:m.accountId||defaultAccountId,affectsCash:m.affectsCash!==false,affectsPnl:m.affectsPnl!==false,status:m.status||"Confirmado"})),derived));
  },[hydrated,sessions,fuelStops,maintenance,insurance,fines,incidents,loans,cardOps,loanPayments,debtPayments,goalMovements,defaultAccountId]);

  useEffect(()=>{
    if(!hydrated)return;
    const pairs:[string,unknown][]=[
      ["movements",movements],["accounts",accounts],["transfers",transfers],["audit",audit],["vehicles",vehicles],["documents",documents],["insurance",insurance],["fines",fines],["incidents",incidents],["fuel",fuelStops],["maintenance",maintenance],["sessions",sessions],["bonuses",bonuses],["cards",cards],["cardops",cardOps],["borrowers",borrowers],["loans",loans],["loanpayments",loanPayments],["debts",debts],["debtpayments",debtPayments],["goals",goals],["goalmovements",goalMovements],["budgets",budgets],["improvements",improvements],["tires",tires],["recurring",recurringExpenses],["investments",investments],["investmentmovements",investmentMovements]
    ];
    pairs.forEach(([key,value])=>save(`f360-${key}`,value));
  },[hydrated,movements,accounts,transfers,audit,vehicles,documents,insurance,fines,incidents,fuelStops,maintenance,sessions,bonuses,cards,cardOps,borrowers,loans,loanPayments,debts,debtPayments,goals,goalMovements,budgets,improvements,tires,recurringExpenses,investments,investmentMovements]);

  const auditAction=useCallback((action:T.AuditEntry["action"],entity:string,entityId:string|number|undefined,summary:string)=>{
    setAudit(p=>[{id:`a-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,date:today,action,entity,entityId,summary},...p].slice(0,500));
  },[]);

  const crud=useCallback(<E extends {id:number|string}>(setter:Dispatch<SetStateAction<E[]>>,entity:E,entityName="Registro")=>{
    const normalized=(entityName==="Movimiento"?{...entity,accountId:(entity as any).accountId||defaultAccountId,affectsCash:(entity as any).affectsCash!==false,affectsPnl:(entity as any).affectsPnl!==false,status:(entity as any).status||"Confirmado"}:entity) as E;
    setter(prev=>prev.some(x=>x.id===normalized.id)?prev.map(x=>x.id===normalized.id?normalized:x):[normalized,...prev]);
    auditAction("CREATE",entityName,entity.id,`Registro ${entity.id} guardado`);
  },[auditAction,defaultAccountId]);
  const remove=useCallback(<E extends {id:number|string}>(setter:Dispatch<SetStateAction<E[]>>,id:E["id"],entityName="Registro")=>{setter(prev=>prev.filter(x=>x.id!==id));auditAction("DELETE",entityName,id,`Registro ${id} eliminado`);},[auditAction]);

  const removeMovement=useCallback((id:number|string)=>{const found=movements.find(m=>String(m.id)===String(id));if(!found)return; if(found.sourceType&&found.sourceType!=="manual"){setMovements(p=>p.map(m=>String(m.id)===String(id)?{...m,status:"Anulado"}:m));auditAction("REVERSE","Movimiento vinculado",id,"Movimiento vinculado anulado para conservar trazabilidad del registro origen");}else{setMovements(p=>p.filter(m=>String(m.id)!==String(id)));auditAction("DELETE","Movimiento",id,"Movimiento manual eliminado");}},[movements,auditAction]);

  const upsertMovement=useCallback((m:T.Movement)=>setMovements(p=>p.some(x=>x.id===m.id)?p.map(x=>x.id===m.id?m:x):[m,...p]),[]);
  const removeSourceMovements=useCallback((source:T.SourceType,id:string|number)=>setMovements(p=>p.filter(m=>!(m.sourceType===source&&String(m.sourceId)===String(id)))),[]);
  const syncSourceMovements=useCallback((source:T.SourceType,id:string|number,rows:T.Movement[])=>{
    removeSourceMovements(source,id);
    setMovements(p=>[...rows.filter(x=>x.amount>0).map(x=>({...x,sourceType:source,sourceId:id,status:"Confirmado" as const})),...p]);
  },[removeSourceMovements]);

  const saveWork=useCallback((x:T.WorkSession)=>{
    setSessions(p=>p.some(s=>s.id===x.id)?p.map(s=>s.id===x.id?x:s):[x,...p]);
    const rows:T.Movement[]=[
      {id:`work-${x.id}-gross`,date:x.date,type:"Ingreso",concept:`Jornada · ${x.apps.join(" + ")||"Trabajo"}`,category:"Trabajo",method:"Transferencia",amount:x.gross,work:true,accountId:x.accountId||defaultAccountId,affectsCash:true,affectsPnl:true},
      {id:`work-${x.id}-commission`,date:x.date,type:"Gasto",concept:"Comisión de aplicativo",category:"Trabajo",method:"Transferencia",amount:x.commission,work:true,accountId:x.accountId||defaultAccountId,affectsCash:true,affectsPnl:true},
      {id:`work-${x.id}-fuel`,date:x.date,type:"Gasto",concept:"Combustible de jornada",category:"Vehículo",method:"Efectivo",amount:x.fuelAccounting==="Abastecimientos"?0:x.fuelCost,work:true,accountId:x.accountId||defaultAccountId,affectsCash:true,affectsPnl:true},
      {id:`work-${x.id}-other`,date:x.date,type:"Gasto",concept:"Otros costos de jornada",category:"Trabajo",method:"Efectivo",amount:x.otherCost,work:true,accountId:x.accountId||defaultAccountId,affectsCash:true,affectsPnl:true}
    ];
    if(x.bonuses>0) rows.push({id:`work-${x.id}-bonus`,date:x.date,type:"Ingreso",concept:"Bonos de jornada",category:"Trabajo",method:"Transferencia",amount:x.bonuses,work:true,accountId:x.accountId||defaultAccountId,affectsCash:true,affectsPnl:true});
    syncSourceMovements("work",x.id,rows); auditAction("UPDATE","Jornada",x.id,"Jornada guardada y conectada al libro financiero");
  },[syncSourceMovements,auditAction,defaultAccountId]);

  const saveFuel=useCallback((x:T.FuelStop)=>{
    setFuelStops(p=>p.some(v=>v.id===x.id)?p.map(v=>v.id===x.id?x:v):[x,...p]);
    syncSourceMovements("fuel",x.id,[{id:`fuel-${x.id}`,date:x.date,type:"Gasto",concept:`Combustible · ${x.station}`,category:"Vehículo",method:x.methods[0]?.method||"Otro",amount:x.total,work:Boolean(x.linkedSessionId),accountId:x.accountId||defaultAccountId,affectsCash:true,affectsPnl:true,linkedSessionId:x.linkedSessionId}]);
    auditAction("UPDATE","Combustible",x.id,"Abastecimiento guardado y conectado a Finanzas");
  },[syncSourceMovements,auditAction,defaultAccountId]);

  const saveMaintenance=useCallback((x:T.Maintenance)=>{
    setMaintenance(p=>p.some(v=>v.id===x.id)?p.map(v=>v.id===x.id?x:v):[x,...p]);
    const amount=x.partsCost+x.laborCost;
    syncSourceMovements("maintenance",x.id,[{id:`maintenance-${x.id}`,date:x.date,type:"Gasto",concept:`Mantenimiento · ${x.service}`,category:"Vehículo",method:"Efectivo",amount,work:Boolean(x.linkedSessionId),accountId:x.accountId||defaultAccountId,affectsCash:true,affectsPnl:true,linkedSessionId:x.linkedSessionId}]);
    auditAction("UPDATE","Mantenimiento",x.id,"Mantenimiento guardado y conectado a Finanzas");
  },[syncSourceMovements,auditAction,defaultAccountId]);

  const saveImprovement=useCallback((x:T.VehicleImprovement)=>{
    setImprovements(p=>p.some(v=>v.id===x.id)?p.map(v=>v.id===x.id?x:v):[x,...p]);
    syncSourceMovements("improvement",x.id,[{id:`improvement-${x.id}`,date:x.date,type:"Gasto",concept:`Mejora vehicular · ${x.description}`,category:"Vehículo",method:"Efectivo",amount:x.amount,work:false,accountId:x.accountId||defaultAccountId,affectsCash:true,affectsPnl:true}]);
    auditAction("UPDATE","Mejora vehicular",x.id,"Mejora guardada y conectada a Finanzas");
  },[syncSourceMovements,auditAction,defaultAccountId]);

  const saveTire=useCallback((x:T.TireRecord)=>{
    setTires(p=>p.some(v=>v.id===x.id)?p.map(v=>v.id===x.id?x:v):[x,...p]);
    const amount=x.price+x.repairCost;
    syncSourceMovements("tire",x.id,[{id:`tire-${x.id}`,date:x.date,type:"Gasto",concept:`Neumático · ${x.brand} ${x.model}`,category:"Vehículo",method:"Efectivo",amount,work:false,accountId:x.accountId||defaultAccountId,affectsCash:true,affectsPnl:true}]);
    auditAction("UPDATE","Neumático",x.id,"Neumático guardado y conectado a Finanzas");
  },[syncSourceMovements,auditAction,defaultAccountId]);

  const registerLoan=useCallback((loan:T.Loan)=>{const plan=simpleLoanPlan(loan.principal,loan.rate,loan.term);const exists=loans.some(x=>x.id===loan.id);const normalized={...loan,installment:plan.installment,totalScheduled:plan.total,nextPayment:loan.nextPayment||addDays(loan.startDate,frequencyDaysLocal(loan.frequency))};setLoans(p=>exists?p.map(x=>x.id===loan.id?normalized:x):[normalized,...p]);if(!exists)syncSourceMovements("loan_disbursement",loan.id,[{id:`loan-${loan.id}-disbursement`,date:loan.startDate,type:"Gasto",concept:`Capital entregado · ${loan.borrower}`,category:"Préstamos por cobrar",method:"Transferencia",amount:loan.principal,work:false,accountId:loan.accountId||defaultAccountId,affectsCash:true,affectsPnl:false,capitalEffect:-loan.principal}]);auditAction(exists?"UPDATE":"CREATE","Préstamo",loan.id,exists?"Préstamo actualizado":"Préstamo creado y capital vinculado");return normalized;},[loans,syncSourceMovements,auditAction,defaultAccountId]);

  const registerLoanPayment=useCallback((loan:T.Loan,requested:number)=>{
    if(requested<=0||loan.balance<=0)return false;
    const payment=applyLoanPayment(loan,requested,today,loan.status==="En mora"?20:0);
    setLoanPayments(p=>[payment,...p]);
    setLoans(p=>p.map(x=>x.id===loan.id?{...x,balance:Math.max(0,x.balance-payment.principal),recovered:x.recovered+payment.principal,interestRecovered:(x.interestRecovered??0)+payment.interest,status:x.balance-payment.principal<=0?"Pagado":"Al día",nextPayment:nextDue(today,x.frequency)}:x));
    syncSourceMovements("loan_payment",payment.id,[
      {id:`loan-${payment.id}-principal`,date:payment.date,type:"Ingreso",concept:`Cobro de capital · ${loan.borrower}`,category:"Préstamos por cobrar",method:"Transferencia",amount:payment.principal,work:false,accountId:loan.accountId||defaultAccountId,affectsCash:true,affectsPnl:false,capitalEffect:payment.principal},
      {id:`loan-${payment.id}-interest`,date:payment.date,type:"Ingreso",concept:`Interés cobrado · ${loan.borrower}`,category:"Rendimientos financieros",method:"Transferencia",amount:payment.interest+payment.lateFee,work:false,accountId:loan.accountId||defaultAccountId,affectsCash:true,affectsPnl:true}
    ]);
    auditAction("CREATE","Cobro de préstamo",payment.id,`Cobro de ${payment.amount} registrado`); return true;
  },[syncSourceMovements,auditAction,defaultAccountId]);

  const reverseLoanPayment=useCallback((p:T.LoanPayment)=>{if(p.status==="Anulado")return;setLoanPayments(xs=>xs.map(x=>x.id===p.id?{...x,status:"Anulado"}:x));setLoans(xs=>xs.map(x=>x.id===p.loanId?{...x,balance:x.balance+p.principal,recovered:Math.max(0,x.recovered-p.principal),interestRecovered:Math.max(0,(x.interestRecovered??0)-p.interest),status:"Al día"}:x));removeSourceMovements("loan_payment",p.id);auditAction("REVERSE","Cobro de préstamo",p.id,"Cobro revertido y movimientos vinculados anulados");},[removeSourceMovements,auditAction]);

  const registerDebtPayment=useCallback((debt:T.Debt,requested:number)=>{
    if(requested<=0||debt.balance<=0)return false;
    const payment=applyDebtPayment(debt,requested,today);
    setDebtPayments(p=>[payment,...p]);
    setDebts(p=>p.map(x=>x.id===debt.id?{...x,balance:Math.max(0,x.balance-payment.principal),status:x.balance-payment.principal<=0?"Pagada":"Activa",nextPayment:nextDue(today,x.frequency)}:x));
    syncSourceMovements("debt_payment",payment.id,[
      {id:`debt-${payment.id}-principal`,date:payment.date,type:"Gasto",concept:`Amortización de capital · ${debt.lender}`,category:"Deuda / Capital",method:"Transferencia",amount:payment.principal,work:false,accountId:debt.accountId||defaultAccountId,affectsCash:true,affectsPnl:false,capitalEffect:-payment.principal},
      {id:`debt-${payment.id}-interest`,date:payment.date,type:"Gasto",concept:`Interés de deuda · ${debt.lender}`,category:"Financiero",method:"Transferencia",amount:payment.interest+payment.insurance+payment.fees,work:false,accountId:debt.accountId||defaultAccountId,affectsCash:true,affectsPnl:true}
    ]);
    auditAction("CREATE","Pago de deuda",payment.id,`Pago de ${payment.amount} registrado`); return true;
  },[syncSourceMovements,auditAction,defaultAccountId]);

  const reverseDebtPayment=useCallback((p:T.DebtPayment)=>{if(p.status==="Anulado")return;setDebtPayments(xs=>xs.map(x=>x.id===p.id?{...x,status:"Anulado"}:x));setDebts(xs=>xs.map(x=>x.id===p.debtId?{...x,balance:x.balance+p.principal,status:"Activa"}:x));removeSourceMovements("debt_payment",p.id);auditAction("REVERSE","Pago de deuda",p.id,"Pago revertido y movimientos vinculados anulados");},[removeSourceMovements,auditAction]);

  const saveCardOperation=useCallback((op:T.CardOperation)=>{
    const old=cardOps.find(x=>x.id===op.id);
    const card=cards.find(c=>c.id===op.cardId);
    const accountId=op.accountId||defaultAccountId;
    const account=accountBalances.find(a=>a.id===accountId);
    if(!card||!account||account.currency!==card.currency) return false;
    const normalized={...op,id:op.id||Date.now(),status:op.status||"Confirmado",accountId};
    if(normalized.type==="Compra"&&normalized.purchaseMode==="Cuotas"){
      const n=Math.max(1,Math.floor(normalized.installments||1));
      normalized.installmentAmount=Math.round(((normalized.amount+normalized.fee)/n+Number.EPSILON)*100)/100;
    }
    setCardOps(prev=>old?prev.map(x=>x.id===old.id?normalized:x):[normalized,...prev]);
    setCards(prev=>prev.map(c=>c.id===normalized.cardId?{...c,used:Math.max(0,Math.min(c.line,(c.baseUsed??c.used)+cardUsage([...cardOps.filter(x=>x.id!==old?.id),normalized],c.id)))}:c));
    auditAction(old?"UPDATE":"CREATE","Operación de tarjeta",normalized.id,"Operación guardada; sus movimientos financieros se regeneran desde el origen");
  },[cardOps,auditAction,defaultAccountId,accounts,cards,accountBalances]);

  const removeCardOperation=useCallback((id:number)=>{const op=cardOps.find(x=>x.id===id);setCardOps(p=>p.filter(x=>x.id!==id));if(op)removeSourceMovements(op.type==="Pago"?"card_payment":"card_purchase",id);auditAction("DELETE","Operación de tarjeta",id,"Operación eliminada y movimiento vinculado eliminado");},[removeSourceMovements,auditAction]);

  const saveInvestmentMovement=useCallback((investment:T.Investment,movement:Omit<T.InvestmentMovement,"id"|"investmentId"|"date"|"status">)=>{
    const amount=Number(movement.amount); if(!Number.isFinite(amount)||amount<=0)return false;
    const needsCash=movement.type!=="Rendimiento"; const account=movement.accountId?accounts.find(a=>a.id===movement.accountId):undefined;
    if(needsCash&&(!account||account.status!=="Activa"||account.currency!==investment.currency))return false;
    if(movement.type==="Aporte"&&account && account.balance<amount)return false;
    if(movement.type==="Retiro"&&investment.currentValue<amount)return false;
    const im:T.InvestmentMovement={...movement,id:Date.now(),investmentId:investment.id,date:today,status:"Confirmado"};
    setInvestmentMovements(p=>[im,...p]);
    setInvestments(p=>p.map(i=>i.id===investment.id?{...i,contributed:Math.max(0,i.contributed+(movement.type==="Aporte"?amount:movement.type==="Retiro"?-Math.min(amount,i.contributed):0)),currentValue:Math.max(0,i.currentValue+(movement.type==="Aporte"?amount:movement.type==="Retiro"?-amount:amount))}:i));
    if(needsCash) syncSourceMovements("investment",im.id,[{id:`investment-${im.id}`,date:im.date,type:movement.type==="Aporte"?"Gasto":"Ingreso",concept:`${movement.type} · ${investment.name}`,category:"Inversiones",method:"Transferencia",amount,work:false,accountId:account?.id,affectsCash:true,affectsPnl:false,capitalEffect:movement.type==="Aporte"?-amount:amount}]);
    auditAction("CREATE",`Inversión · ${movement.type}`,im.id,`${movement.type} de ${amount} registrado`); return true;
  },[accounts,syncSourceMovements,auditAction]);

  const reverseInvestmentMovement=useCallback((im:T.InvestmentMovement)=>{
    if(im.status==="Anulado")return; const investment=investments.find(i=>i.id===im.investmentId); if(!investment)return;
    setInvestmentMovements(p=>p.map(x=>x.id===im.id?{...x,status:"Anulado"}:x));
    setInvestments(p=>p.map(i=>i.id===im.investmentId?{...i,contributed:Math.max(0,i.contributed+(im.type==="Aporte"?-im.amount:im.type==="Retiro"?im.amount:0)),currentValue:Math.max(0,i.currentValue+(im.type==="Aporte"?-im.amount:im.type==="Retiro"?im.amount:-im.amount))}:i));
    if(im.type!=="Rendimiento") removeSourceMovements("investment",im.id);
    auditAction("REVERSE",`Inversión · ${im.type}`,im.id,"Movimiento de inversión revertido");
  },[investments,removeSourceMovements,auditAction]);

  const saveGoalContribution=useCallback((goal:T.Goal,amount:number,accountId?:string)=>{
    if(!amount)return false; const type=amount>0?"Aporte":"Retiro" as const; const abs=Math.abs(amount); if(type==="Retiro"&&goal.current<abs)return false;
    const gm:T.GoalMovement={id:Date.now(),goalId:goal.id,date:today,type,amount:abs,accountId:accountId||defaultAccountId,status:"Confirmado"}; setGoalMovements(p=>[gm,...p]); setGoals(p=>p.map(g=>g.id===goal.id?{...g,current:Math.max(0,Math.min(g.target,g.current+amount))}:g));
    syncSourceMovements(type==="Aporte"?"goal_contribution":"goal_withdrawal",gm.id,[{id:`goal-${gm.id}`,date:gm.date,type:type==="Aporte"?"Gasto":"Ingreso",concept:`${type} · ${goal.name}`,category:"Ahorro / Metas",method:"Transferencia",amount:abs,work:false,accountId:gm.accountId,affectsCash:false,affectsPnl:false,capitalEffect:type==="Aporte"?-abs:abs}]);
    auditAction("CREATE",`Meta · ${type}`,gm.id,`${type} de ${abs} registrado`); return true;
  },[syncSourceMovements,auditAction,defaultAccountId]);

  const reverseGoalMovement=useCallback((gm:T.GoalMovement)=>{if(gm.status==="Anulado")return;setGoalMovements(p=>p.map(x=>x.id===gm.id?{...x,status:"Anulado"}:x));setGoals(p=>p.map(g=>g.id===gm.goalId?{...g,current:gm.type==="Aporte"?Math.max(0,g.current-gm.amount):Math.min(g.target,g.current+gm.amount)}:g));removeSourceMovements(gm.type==="Aporte"?"goal_contribution":"goal_withdrawal",gm.id);auditAction("REVERSE",`Meta · ${gm.type}`,gm.id,"Movimiento de meta revertido");},[removeSourceMovements,auditAction]);

  const deleteVehicle=useCallback((id:string)=>{const sessionIds=sessions.filter(s=>s.vehicleId===id).map(s=>s.id);setVehicles(p=>p.filter(v=>v.id!==id));setDocuments(p=>p.filter(x=>x.vehicleId!==id));setInsurance(p=>p.filter(x=>x.vehicleId!==id));setFines(p=>p.filter(x=>x.vehicleId!==id));setIncidents(p=>p.filter(x=>x.vehicleId!==id));setFuelStops(p=>p.filter(x=>x.vehicleId!==id));setMaintenance(p=>p.filter(x=>x.vehicleId!==id));setImprovements(p=>p.filter(x=>x.vehicleId!==id));setTires(p=>p.filter(x=>x.vehicleId!==id));setSessions(p=>p.filter(x=>x.vehicleId!==id));setBonuses(p=>p.filter(b=>!sessionIds.includes(b.workSessionId)));sessionIds.forEach(s=>removeSourceMovements("work",s));fuelStops.filter(x=>x.vehicleId===id).forEach(x=>removeSourceMovements("fuel",x.id));maintenance.filter(x=>x.vehicleId===id).forEach(x=>removeSourceMovements("maintenance",x.id));improvements.filter(x=>x.vehicleId===id).forEach(x=>removeSourceMovements("improvement",x.id));tires.filter(x=>x.vehicleId===id).forEach(x=>removeSourceMovements("tire",x.id));auditAction("DELETE","Vehículo",id,"Vehículo eliminado con sus dependencias");},[sessions,fuelStops,maintenance,improvements,tires,removeSourceMovements,auditAction]);
  const deleteLoan=useCallback((id:string)=>{setLoans(p=>p.filter(x=>x.id!==id));const ids=loanPayments.filter(x=>x.loanId===id).map(x=>x.id);setLoanPayments(p=>p.filter(x=>x.loanId!==id));ids.forEach(x=>removeSourceMovements("loan_payment",x));removeSourceMovements("loan_disbursement",id);auditAction("DELETE","Préstamo",id,"Préstamo e historial eliminados");},[loanPayments,removeSourceMovements,auditAction]);
  const deleteDebt=useCallback((id:string)=>{setDebts(p=>p.filter(x=>x.id!==id));const ids=debtPayments.filter(x=>x.debtId===id).map(x=>x.id);setDebtPayments(p=>p.filter(x=>x.debtId!==id));ids.forEach(x=>removeSourceMovements("debt_payment",x));auditAction("DELETE","Deuda",id,"Deuda e historial eliminados");},[debtPayments,removeSourceMovements,auditAction]);
  const deleteCard=useCallback((id:string)=>{setCards(p=>p.filter(x=>x.id!==id));const ops=cardOps.filter(x=>x.cardId===id);setCardOps(p=>p.filter(x=>x.cardId!==id));ops.forEach(op=>removeSourceMovements(op.type==="Pago"?"card_payment":"card_purchase",op.id));auditAction("DELETE","Tarjeta",id,"Tarjeta, operaciones y movimientos vinculados eliminados");},[cardOps,removeSourceMovements,auditAction]);

  const saveTransfer=useCallback((t:T.Transfer)=>{const from=accountBalances.find(a=>a.id===t.fromAccountId); const to=accountBalances.find(a=>a.id===t.toAccountId); if(!from||!to||from.id===to.id||from.currency!==to.currency||t.amount<=0||t.fee<0||t.amount+t.fee>from.balance)return false;setTransfers(p=>p.some(x=>x.id===t.id)?p.map(x=>x.id===t.id?t:x):[t,...p]);auditAction("TRANSFER","Transferencia",t.id,`Transferencia de ${t.amount} registrada`);return true;},[auditAction,accountBalances]);

  const alerts=useMemo(()=>{const events=financialEvents({start:today,days:90,debts,loans,cards,recurringExpenses,insurance,fines,maintenance,accounts}); const overdueDocs=documents.filter(d=>d.end&&d.end<today).map(d=>`Documento vencido: ${d.type} · ${vehicles.find(v=>v.id===d.vehicleId)?.plate||"vehículo"}`); return [...events.filter(e=>e.status==="Vencido").map(e=>`${e.label}: ${e.date}`),...overdueDocs];},[vehicles,maintenance,loans,debts,cards,documents,insurance,fines,recurringExpenses]);
  const integrity=useMemo(()=>validateDataset({movements,accounts,transfers,vehicles,insurance,fines,incidents,fuel:fuelStops,maintenance,sessions,bonuses,cards,cardOps,borrowers,loans,loanPayments,debts,debtPayments,goals,goalMovements,improvements,tires,recurringExpenses,investments,investmentMovements}),[movements,accounts,transfers,vehicles,insurance,fines,incidents,fuelStops,maintenance,sessions,bonuses,cards,cardOps,borrowers,loans,loanPayments,debts,debtPayments,goals,goalMovements,improvements,tires,recurringExpenses,investments,investmentMovements]);
  const getPeriodReport=useCallback((start:string,end:string)=>financialPeriodReport({movements,sessions,fuel:fuelStops,maintenance,start,end}),[movements,sessions,fuelStops,maintenance]);
  const getVehicleProfitability=useCallback((vehicleId:string,start:string,end:string)=>vehicleProfitability({vehicleId,sessions,fuel:fuelStops,maintenance,start,end}),[sessions,fuelStops,maintenance]);
  const getCashForecast=useCallback((days=30)=>cashForecast({accounts,movements,transfers,debts,loans,recurringExpenses,cards,insurance,fines,maintenance,days}),[accounts,movements,transfers,debts,loans,recurringExpenses,cards,insurance,fines,maintenance]);
  const resetDemo=useCallback(()=>{clearDemoData();window.location.reload()},[]);
  return {defaultAccountId,movements,setMovements,accounts,setAccounts,transfers,setTransfers,audit,setAudit,vehicles,setVehicles,documents,setDocuments,insurance,setInsurance,fines,setFines,incidents,setIncidents,fuelStops,setFuelStops,maintenance,setMaintenance,sessions,setSessions,bonuses,setBonuses,cards,setCards,cardOps,setCardOps,borrowers,setBorrowers,loans,setLoans,loanPayments,setLoanPayments,debts,setDebts,debtPayments,setDebtPayments,goals,setGoals,goalMovements,setGoalMovements,budgets,setBudgets,improvements,setImprovements,tires,setTires,recurringExpenses,setRecurringExpenses,investments,setInvestments,investmentMovements,setInvestmentMovements,crud,remove,saveWork,saveFuel,saveMaintenance,registerLoan,registerLoanPayment,reverseLoanPayment,registerDebtPayment,reverseDebtPayment,saveCardOperation,removeCardOperation,saveGoalContribution,reverseGoalMovement,saveInvestmentMovement,reverseInvestmentMovement,saveTransfer,removeMovement,deleteVehicle,deleteLoan,deleteDebt,deleteCard,saveImprovement,saveTire,ledger,accountBalances,snapshot,alerts,integrity,getPeriodReport,getVehicleProfitability,getCashForecast,resetDemo,frequencies};
}
function frequencyDaysLocal(f:T.Frequency){return f==="Semanal"?7:f==="Quincenal"?14:f==="Mensual"?30:f==="Trimestral"?90:f==="Semestral"?180:f==="Anual"?365:30}
