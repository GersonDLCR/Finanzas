import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");

const root=path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),"fin360-logic-"));
function compile(src,out){
  let code=fs.readFileSync(src,"utf8").replace(/import type \* as T from "@\/types";\n/g,"").replace('import { addDays, paymentFor, periodRate, today } from "@/lib/format";','const {addDays,paymentFor,periodRate,today}=require("./format.cjs");');
  code=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  fs.writeFileSync(out,code);
}
compile(path.join(root,"lib/format.ts"),path.join(tmp,"format.cjs"));
compile(path.join(root,"lib/finance/domain.ts"),path.join(tmp,"domain.cjs"));
const d=await import(pathToFileURL(path.join(tmp,"domain.cjs")).href);
const loan=d.simpleLoanPlan(2000,.10,4);
if(loan.interest!==200||loan.total!==2200||loan.installment!==550||loan.installments.reduce((s,x)=>s+x.amount,0)!==2200) throw new Error("Préstamo simple: cálculo incorrecto");
const debt=d.applyDebtPayment({id:"d",balance:10000,annualRate:.12,frequency:"Mensual",desgravamen:.12,fees:20},1000,"2026-09-08");
if(Math.abs(debt.amount-(debt.principal+debt.interest+debt.insurance+debt.fees))>.01) throw new Error("Deuda: componentes no cuadran");
const schedule=d.cardInstallmentSchedule({id:3,cardId:"c",date:"2026-09-02",type:"Compra",purchaseMode:"Cuotas",installments:3,amount:900,fee:0,status:"Registrado",statementDate:"2026-09-12"},{id:"c",bank:"BBVA",product:"Visa",last4:"0000",currency:"PEN",line:5000,used:900,closing:"05 sep",payment:"12 sep",tea:40,tcea:45,membership:0,membershipExonerable:false,desgravamenPercent:0,status:"Activa"});
if(schedule.length!==3||schedule[0].date!=="2026-09-12"||schedule[1].date!=="2026-10-12"||schedule[2].amount!==300) throw new Error("Tarjeta: calendario de cuotas incorrecto");
const card=d.cardUsage([{id:1,cardId:"c",date:"2026-09-01",type:"Compra",amount:100,fee:5,status:"Confirmado"},{id:2,cardId:"c",date:"2026-09-02",type:"Pago",amount:40,fee:0,status:"Confirmado"}],"c");
if(card!==65) throw new Error("Tarjeta: utilización incorrecta");
const consistency=d.loanPaymentConsistency({id:"l",borrowerId:"b",borrower:"B",principal:2000,balance:1500,rate:.1,frequency:"Semanal",term:4,installment:550,totalScheduled:2200,recovered:500,nextPayment:"2026-09-20",status:"Al día",startDate:"2026-09-01"},[{id:4,loanId:"l",date:"2026-09-08",amount:550,principal:500,interest:50,lateFee:0,status:"Confirmado"}]);
if(!consistency.principalConsistent) throw new Error("Préstamo: consistencia de saldo incorrecta");
const events=d.financialEvents({start:"2026-09-12",days:30,debts:[{id:"d",lender:"B",product:"P",principal:1000,balance:500,annualRate:.12,tea:12,tcea:12,installment:100,frequency:"Mensual",desgravamen:0,fees:0,nextPayment:"2026-09-15",startDate:"2026-01-15",finalDate:"2027-01-15",status:"Activa"}],loans:[],cards:[],recurringExpenses:[{id:"r",name:"Internet",category:"Hogar",amount:80,frequency:"Mensual",startDate:"2026-01-01",nextDate:"2026-09-20",method:"Débito",active:true}],insurance:[],fines:[],maintenance:[]});
if(events.length!==2||events[0].date!=="2026-09-15"||events[1].date!=="2026-09-20") throw new Error("Pronóstico: eventos por fecha incorrectos");
const recurring=d.recurringDates({id:"r2",name:"Alquiler",category:"Hogar",amount:1000,frequency:"Mensual",startDate:"2026-01-31",nextDate:"2026-01-31",method:"Transferencia",active:true},"2026-05-31");
if(recurring.map(x=>x.date).join(",")!=="2026-01-31,2026-02-28,2026-03-31,2026-04-30,2026-05-31") throw new Error("Recurrencia mensual: avance de calendario incorrecto");
const future=d.financialEvents({start:"2026-09-12",days:60,debts:[{id:"d2",lender:"Banco",product:"Crédito",principal:1000,balance:500,annualRate:.12,tea:12,tcea:12,installment:100,frequency:"Mensual",desgravamen:0,fees:0,nextPayment:"2026-09-15",startDate:"2026-01-15",finalDate:"2027-01-15",status:"Activa"}],loans:[],cards:[],recurringExpenses:[],insurance:[],fines:[],maintenance:[]});
if(future.length!==2||future[0].date!=="2026-09-15"||future[1].date!=="2026-10-15") throw new Error("Pronóstico: múltiples cuotas de deuda incorrectas");

const partial=d.financialEvents({start:"2026-09-12",days:70,debts:[{id:"d3",lender:"Banco",product:"Crédito",principal:550,balance:250,annualRate:.12,tea:12,tcea:12,installment:100,frequency:"Mensual",desgravamen:0,fees:0,nextPayment:"2026-09-15",startDate:"2026-01-15",finalDate:"2027-01-15",status:"Activa"}],loans:[],cards:[],recurringExpenses:[],insurance:[],fines:[],maintenance:[]});
if(partial.length!==3||partial.map(x=>x.amount).join(",")!=="100,100,50") throw new Error("Pronóstico: última cuota parcial incorrecta");
const partialLoan=d.financialEvents({start:"2026-09-12",days:70,debts:[],loans:[{id:"l2",borrowerId:"b",borrower:"B",principal:550,balance:250,rate:.1,frequency:"Mensual",term:4,installment:100,totalScheduled:605,recovered:355,nextPayment:"2026-09-15",status:"Al día",startDate:"2026-01-15"}],cards:[],recurringExpenses:[],insurance:[],fines:[],maintenance:[]});
if(partialLoan.length!==3||partialLoan.map(x=>x.amount).join(",")!=="100,100,50") throw new Error("Pronóstico: última cuota parcial del préstamo incorrecta");

console.log("FINANZAS 360 logic smoke: OK");
