import type * as T from "@/types";

export const frequencies:T.Frequency[]=["Semanal","Quincenal","Mensual","Trimestral","Semestral","Anual","Personalizada"];
export const fuels:T.Fuel[]=["Gasolina","GLP","GNV","Diésel","Electricidad"];
export const methods:T.PaymentMethod[]=["Efectivo","Yape / Plin","Débito","Crédito","Transferencia","Billetera","Otro"];
export const initialMovements:T.Movement[]=Array.from({length:18},(_,i)=>({id:i+1,date:`2026-09-${String(Math.max(1,8-i%8)).padStart(2,"0")}`,type:i%5===0?"Ingreso":"Gasto",concept:["Pago Yango","Combustible","Supermercado","Internet","Cuota banco","Almuerzo trabajando","Manutención hijo","Mantenimiento vehículo","Ropa","Servicio eléctrico"][i%10],category:["Trabajo","Vehículo","Hogar","Trabajo","Financiero","Trabajo","Familia","Vehículo","Personal","Hogar"][i%10],method:methods[i%methods.length],amount:i%5===0?420+i*35:65+i*31,work:["Pago Yango","Combustible","Internet","Almuerzo trabajando","Mantenimiento vehículo"].includes(["Pago Yango","Combustible","Supermercado","Internet","Cuota banco","Almuerzo trabajando","Manutención hijo","Mantenimiento vehículo","Ropa","Servicio eléctrico"][i%10])}));
export const initialVehicles:T.Vehicle[]=[
{id:"v1",brand:"Toyota",model:"Corolla Cross",version:"1.8 Hybrid",year:2024,plate:"BHZ-421",km:38640,fuels:["Gasolina","Electricidad"],transmission:"CVT",value:89000,debt:42000,inspection:"Vigente",health:86,soat:"2026-09-28",insurance:"2026-12-15",manual:"Manual Toyota Corolla Cross 2024",color:"Blanco",engine:"1.8 L híbrido",vin:"JTDEMO240001",owner:"Titular demo"},
{id:"v2",brand:"Kia",model:"Picanto",version:"1.0 GLP",year:2021,plate:"T4M-918",km:119820,fuels:["Gasolina","GLP"],transmission:"Manual",value:33000,debt:0,inspection:"Vencida",health:58,soat:"2027-01-18",insurance:"2026-11-02",manual:"Manual Kia Picanto 2021",color:"Gris",engine:"1.0 L",vin:"KNADEMO210002",owner:"Titular demo"},
{id:"v3",brand:"BYD",model:"Song Plus",version:"DM-i",year:2026,plate:"A8X-306",km:2180,fuels:["Gasolina","Electricidad"],transmission:"Automática",value:139000,debt:112000,inspection:"No requerida — vehículo nuevo",health:98,soat:"2027-02-04",insurance:"2027-02-04",manual:"Manual BYD Song Plus 2026",color:"Azul",engine:"1.5 L DM-i",vin:"LVSDEMO260003",owner:"Titular demo"}
];
export const initialDocuments:T.VehicleDocument[]=[{id:1,vehicleId:"v1",type:"Tarjeta de propiedad",number:"TP-2024-001",issuer:"SUNARP",start:"2024-05-10",status:"Vigente",notes:"Documento sin vencimiento"},{id:2,vehicleId:"v1",type:"SOAT",number:"SOAT-8821",issuer:"Rímac",start:"2025-09-28",end:"2026-09-28",status:"Por vencer",cost:145},{id:3,vehicleId:"v2",type:"Revisión técnica",number:"RT-2026-442",issuer:"CITV Demo",start:"2025-08-10",end:"2026-08-10",status:"Vencido",cost:110}];
export const initialInsurance:T.Insurance[]=[{id:1,vehicleId:"v1",type:"Todo riesgo",company:"Rímac",policy:"TR-8821",start:"2025-12-15",end:"2026-12-15",cost:1120,frequency:"Anual",coverage:"Daños propios y terceros"},{id:2,vehicleId:"v2",type:"Todo riesgo",company:"Pacífico",policy:"TR-2210",start:"2025-11-02",end:"2026-11-02",cost:980,frequency:"Anual",coverage:"Daños propios y terceros"}];
export const initialFines:T.Fine[]=[{id:1,vehicleId:"v2",date:"2026-07-12",code:"G40",description:"Estacionar en zona prohibida",amount:440,discountAmount:74.8,discountPercent:83,discountUntil:"2026-07-20",status:"Pendiente",due:"2026-09-20",points:25,prescriptionEligible:true},{id:2,vehicleId:"v1",date:"2025-10-03",code:"M19",description:"Conducir sin cumplir restricciones de licencia",amount:660,discountAmount:112.2,discountPercent:83,discountUntil:"2025-10-10",status:"Pagada",due:"2025-11-03",points:50,prescriptionEligible:false}];
export const initialIncidents:T.Incident[]=[{id:1,vehicleId:"v2",type:"Accidente",date:"2026-02-18",place:"Trujillo",description:"Golpe leve en parachoques delantero; tercero reconoció parte.",responsible:"Tercero",insurance:"Pacífico",totalCost:950,recognized:700,paidByUser:250,paidByThirdParty:0,affectedPeople:"Sin lesionados",status:"Cerrado",reference:"ACC-2026-02"}];
export const initialFuel:T.FuelStop[]=[{id:1,vehicleId:"v1",date:"2026-09-05",odometer:38640,station:"Primax",accountId:"a-bbva",items:[{fuel:"Gasolina",amount:150,pricePerUnit:21.5,quantity:150/21.5,total:150}],total:150,methods:[{method:"Yape / Plin",amount:150}]},{id:2,vehicleId:"v2",date:"2026-09-04",odometer:119600,station:"Grifo Demo",accountId:"a-cash",items:[{fuel:"Gasolina",amount:64.37,pricePerUnit:15.7,quantity:4.1,total:64.37},{fuel:"GLP",amount:96.72,pricePerUnit:7.8,quantity:12.4,total:96.72}],total:161.09,methods:[{method:"Efectivo",amount:100},{method:"Débito",amount:61.09}]}];
export const initialMaintenance:T.Maintenance[]=[{id:1,vehicleId:"v1",type:"Preventivo",service:"Aceite + filtro",date:"2026-06-22",km:34200,partsCost:150,laborCost:70,performedBy:"Taller",intervalMonths:3,intervalKm:5800,nextDate:"2026-09-12",nextKm:40000,source:"Manual Toyota 2024",accountId:"a-bbva",status:"Próximo"},{id:2,vehicleId:"v2",type:"Correctivo",service:"Pastillas de freno delanteras",date:"2025-11-14",km:108200,partsCost:300,laborCost:80,performedBy:"Taller",intervalMonths:9,intervalKm:10000,nextDate:"2026-08-10",nextKm:118000,source:"Manual + taller",accountId:"a-bbva",status:"Vencido"},{id:3,vehicleId:"v2",type:"Reparación",service:"Cambio de amortiguadores",date:"2026-04-08",km:114900,partsCost:600,laborCost:180,performedBy:"Taller",source:"Reparación correctiva",accountId:"a-bbva",status:"Completado"}];
export const initialSessions:T.WorkSession[]=[{id:1,vehicleId:"v2",date:"2026-09-05",start:"06:30",end:"11:10",hours:4.67,km:82,trips:14,gross:310,commission:62,bonuses:40,fuelCost:75,otherCost:18,apps:["Yango"],accountId:"a-bcp",notes:"Bono por viajes"},{id:2,vehicleId:"v2",date:"2026-09-05",start:"14:30",end:"19:20",hours:4.83,km:96,trips:18,gross:390,commission:78,bonuses:0,fuelCost:82,otherCost:15,apps:["inDrive","Yango"],accountId:"a-bcp"}];
export const initialBonuses:T.Bonus[]=[{id:1,workSessionId:1,app:"Yango",name:"20 viajes",target:20,achieved:23,amount:80,date:"2026-09-05",status:"Obtenido"}];
export const initialCards:T.Card[]=[{id:"c1",bank:"BBVA",product:"Visa Signature",last4:"4821",currency:"PEN",line:12000,used:4180,baseUsed:2067.5,closing:"05 sep",payment:"12 sep",tea:39.99,tcea:48.1,membership:250,membershipExonerable:true,desgravamenPercent:0.35,status:"Activa"},{id:"c2",bank:"BCP",product:"LATAM Pass",last4:"1907",currency:"PEN",line:8500,used:1920,baseUsed:1920,closing:"11 sep",payment:"18 sep",tea:42.5,tcea:51.2,membership:180,membershipExonerable:true,desgravamenPercent:0.38,status:"Activa"}];
export const initialCardOps:T.CardOperation[]=[{id:1,cardId:"c1",date:"2026-09-02",type:"Compra",purchaseMode:"Cuotas",installments:3,currentInstallment:1,concept:"Laptop",amount:1600,fee:0,status:"Registrado"},{id:2,cardId:"c1",date:"2026-09-04",type:"Ruleteo",concept:"Intermediario digital",amount:500,fee:12.5,intermediary:"Ligo",cashReceived:487.5,status:"Registrado"}];
export const initialBorrowers:T.Borrower[]=[{id:"b1",name:"Juan Pérez",phone:"999111222",notes:"Amigo del trabajo"},{id:"b2",name:"Carlos Ruiz",phone:"999333444",notes:"Prestatario recurrente"},{id:"b3",name:"María López",phone:"999555666",notes:"Cliente"}];
export const initialLoans:T.Loan[]=[{id:"l1",borrowerId:"b1",borrower:"Juan Pérez",principal:5000,balance:1200,rate:0.05,frequency:"Mensual",term:18,installment:291.67,totalScheduled:5250,recovered:3800,interestRecovered:50,nextPayment:"2026-09-10",status:"Al día",startDate:"2025-04-10"},{id:"l2",borrowerId:"b2",borrower:"Carlos Ruiz",principal:2000,balance:680,rate:0.10,frequency:"Semanal",term:4,installment:550,totalScheduled:2200,recovered:1320,interestRecovered:40,nextPayment:"2026-09-20",status:"En mora",startDate:"2026-02-20"}];
export const initialLoanPayments:T.LoanPayment[]=[{id:1,loanId:"l1",date:"2026-08-10",amount:395,principal:345,interest:50,lateFee:0,status:"Confirmado"},{id:2,loanId:"l2",date:"2026-08-20",amount:265,principal:225,interest:40,lateFee:0,status:"Confirmado"}];
export const initialDebts:T.Debt[]=[{id:"d1",vehicleId:"v1",lender:"BCP",product:"Crédito vehicular",principal:145000,balance:112000,annualRate:0.128,tea:12.8,tcea:15.4,installment:2180,frequency:"Mensual",term:60,desgravamen:0.12,fees:35,nextPayment:"2026-09-10",startDate:"2026-06-10",finalDate:"2031-06-10",status:"Activa"},{id:"d2",lender:"Interbank",product:"Préstamo personal",principal:35000,balance:28600,annualRate:0.184,tea:18.4,tcea:21.2,installment:780,frequency:"Mensual",term:48,desgravamen:0.18,fees:20,nextPayment:"2026-09-15",startDate:"2026-05-15",finalDate:"2030-04-15",status:"Activa"}];
export const initialDebtPayments:T.DebtPayment[]=[{id:1,debtId:"d1",date:"2026-08-10",amount:2180,principal:970,interest:1175,insurance:35,fees:0,status:"Confirmado"},{id:2,debtId:"d2",date:"2026-08-15",amount:780,principal:350,interest:410,insurance:20,fees:0,status:"Confirmado"}];
export const initialGoals:T.Goal[]=[{id:"g1",name:"Fondo de emergencia",target:15000,current:8500,deadline:"2026-12-31",category:"Seguridad",frequency:"Mensual"},{id:"g2",name:"Inicial de vivienda",target:50000,current:17200,deadline:"2028-06-30",category:"Vivienda",frequency:"Mensual"}];


export const initialImprovements:T.VehicleImprovement[]=[
{id:"vi1",vehicleId:"v2",date:"2026-03-15",type:"Pantalla",description:"Pantalla multimedia con cámara de retroceso",amount:1250,accountId:"a-bcp",usefulLifeMonths:48},
{id:"vi2",vehicleId:"v2",date:"2026-05-02",type:"Polarizado",description:"Polarizado de lunas",amount:420,accountId:"a-cash",usefulLifeMonths:36}
];
export const initialTires:T.TireRecord[]=[
{id:"t1",vehicleId:"v2",brand:"Michelin",model:"Energy XM2+",size:"175/65 R14",date:"2026-01-20",odometer:110500,price:1150,position:"Juego completo",estimatedLifeKm:50000,punctureRepair:false,repairCost:0,status:"Instalado"}
];
export const initialRecurringExpenses:T.RecurringExpense[]=[
{id:"re1",name:"Internet hogar",category:"Hogar",amount:89,frequency:"Mensual",startDate:"2026-01-05",nextDate:"2026-10-05",method:"Débito",accountId:"a-bbva",active:true},
{id:"re2",name:"Plan móvil",category:"Personal",amount:59.9,frequency:"Mensual",startDate:"2026-01-12",nextDate:"2026-10-12",method:"Crédito",accountId:"a-bcp",active:true}
];
export const initialInvestments:T.Investment[]=[
{id:"inv1",name:"Depósito a plazo demo",type:"Depósito",currency:"PEN",contributed:5000,currentValue:5235,date:"2026-01-15",accountId:"a-savings",notes:"Rendimiento acumulado de demostración"}
];
export const initialInvestmentMovements:T.InvestmentMovement[]=[
{id:"im1",investmentId:"inv1",date:"2026-01-15",type:"Aporte",amount:5000,accountId:"a-savings",status:"Confirmado"}
];

export const initialAccounts:T.FinancialAccount[]=[
{id:"a-cash",name:"Efectivo",type:"Efectivo",currency:"PEN",openingBalance:1200,balance:1200,status:"Activa"},
{id:"a-bbva",name:"Cuenta BBVA",type:"Cuenta bancaria",currency:"PEN",openingBalance:6800,balance:6800,status:"Activa"},
{id:"a-bcp",name:"Cuenta BCP",type:"Cuenta bancaria",currency:"PEN",openingBalance:4200,balance:4200,status:"Activa"},
{id:"a-yape",name:"Yape / Plin",type:"Billetera digital",currency:"PEN",openingBalance:950,balance:950,status:"Activa"},
{id:"a-savings",name:"Ahorro emergencia",type:"Cuenta ahorro",currency:"PEN",openingBalance:5000,balance:5000,status:"Activa"}
];
export const initialTransfers:T.Transfer[]=[
{id:"tr1",date:"2026-08-03",fromAccountId:"a-bbva",toAccountId:"a-yape",amount:500,fee:0,notes:"Liquidez semanal",status:"Confirmado"},
{id:"tr2",date:"2026-08-15",fromAccountId:"a-bcp",toAccountId:"a-savings",amount:1000,fee:0,notes:"Aporte al fondo de emergencia",status:"Confirmado"}
];
export const initialGoalMovements:T.GoalMovement[]=[
{id:1,goalId:"g1",date:"2026-07-31",type:"Aporte",amount:1500,accountId:"a-savings",status:"Confirmado",notes:"Aporte mensual"},
{id:2,goalId:"g1",date:"2026-08-31",type:"Aporte",amount:2000,accountId:"a-savings",status:"Confirmado",notes:"Aporte mensual + extra"},
{id:3,goalId:"g2",date:"2026-08-30",type:"Aporte",amount:1200,accountId:"a-bcp",status:"Confirmado",notes:"Ahorro para vivienda"}
];
export const initialBudgets:T.Budget[]=[
{id:1,name:"Comida hogar",limit:800,category:"Personal",period:"Mensual",active:true},
{id:2,name:"Combustible laboral",limit:1200,category:"Trabajo",period:"Mensual",active:true},
{id:3,name:"Mantenimiento vehículo",limit:500,category:"Vehículo",period:"Mensual",active:true},
{id:4,name:"Manutención hijo",limit:700,category:"Familia",period:"Mensual",active:true},
{id:5,name:"Servicios del hogar",limit:450,category:"Hogar",period:"Mensual",active:true},
{id:6,name:"Ocio",limit:300,category:"Personal",period:"Mensual",active:true}
];

// Histórico demo adicional: datos deterministas para probar dashboard, reportes y relaciones sin depender de una BD.
for(let m=0;m<12;m++){
  const month=new Date(2025,9+m,1);
  const y=month.getFullYear(), mo=String(month.getMonth()+1).padStart(2,"0");
  const day=`${y}-${mo}-18`;
  const sessionId=100+m;
  const vehicleId=m%2===0?"v2":"v1";
  const gross=360+m*18, commission=Math.round(gross*0.2*100)/100, bonus=m%3===0?60:0, km=95+m*4;
  initialSessions.push({id:sessionId,vehicleId,date:day,start:"07:00",end:"13:00",hours:6,km,trips:18+m%7,gross,commission,bonuses:bonus,fuelCost:0,otherCost:12+m%4,apps:m%2?["Yango","inDrive"]:["Yango"],accountId:m%2?"a-bcp":"a-bbva",fuelAccounting:"Abastecimientos",notes:"Histórico demo vinculado a abastecimiento"});
  const fuelTotal=70+m*3.25;
  initialFuel.push({id:100+m,vehicleId,date:`${y}-${mo}-18`,odometer:118000+m*850,station:m%2?"Primax":"Grifo Demo",accountId:m%2?"a-bcp":"a-bbva",items:[{fuel:m%2?"GLP":"Gasolina",amount:fuelTotal,pricePerUnit:m%2?7.8:15.7,quantity:fuelTotal/(m%2?7.8:15.7),total:fuelTotal}],total:fuelTotal,methods:[{method:"Débito",amount:fuelTotal}],linkedSessionId:sessionId,notes:"Abastecimiento asociado a jornada histórica"});
  if(m%2===0) initialMaintenance.push({id:100+m,vehicleId,type:"Preventivo",service:"Servicio periódico + filtros",date:`${y}-${mo}-20`,km:118200+m*850,partsCost:120+m*4,laborCost:60,performedBy:"Taller",intervalMonths:3,intervalKm:7000,nextDate:`${y}-${String((month.getMonth()+4)%12+1).padStart(2,"0")}-20`,nextKm:125000+m*850,source:"Histórico demo",status:"Completado",accountId:"a-bbva",linkedSessionId:sessionId});
  initialMovements.push({id:`hist-${m}`,date:day,type:m%4===0?"Ingreso":"Gasto",concept:m%4===0?"Ingreso adicional histórico":"Gasto personal histórico",category:m%4===0?"Trabajo":"Personal",method:m%3===0?"Transferencia":"Débito",amount:m%4===0?280+m*12:55+m*7,work:m%4===0,accountId:m%2?"a-bcp":"a-bbva",affectsCash:true,affectsPnl:true,status:"Confirmado"});
}
