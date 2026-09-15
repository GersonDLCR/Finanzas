export type Section = "dashboard"|"trabajo"|"finanzas"|"tarjetas"|"prestamos"|"deudas"|"vehiculos"|"presupuesto"|"ahorros"|"patrimonio"|"calendario"|"alertas"|"reportes"|"configuracion";
export type Frequency = "Semanal"|"Quincenal"|"Mensual"|"Trimestral"|"Semestral"|"Anual"|"Personalizada";
export type Fuel = "Gasolina"|"GLP"|"GNV"|"Diésel"|"Electricidad";
export type PaymentMethod = "Efectivo"|"Yape / Plin"|"Débito"|"Crédito"|"Transferencia"|"Billetera"|"Otro";
export type RecordStatus = "Borrador"|"Confirmado"|"Anulado";
export type AccountType = "Efectivo"|"Cuenta bancaria"|"Billetera digital"|"Cuenta ahorro"|"Otro";
export type Currency = "PEN"|"USD";

export interface Movement {
  id:number|string; date:string; type:"Ingreso"|"Gasto"; concept:string; category:string; method:PaymentMethod; amount:number; currency?:Currency; work:boolean; notes?:string;
  accountId?:string; sourceType?:SourceType; sourceId?:string|number; linkedSessionId?:string|number; affectsCash?:boolean; affectsPnl?:boolean; capitalEffect?:number; status?:RecordStatus;
}
export type SourceType = "manual"|"work"|"fuel"|"maintenance"|"insurance"|"fine"|"incident"|"card_purchase"|"card_payment"|"loan_disbursement"|"loan_payment"|"debt_payment"|"goal_contribution"|"goal_withdrawal"|"investment"|"improvement"|"tire"|"transfer";

export interface FinancialAccount { id:string; name:string; type:AccountType; currency:Currency; openingBalance:number; balance:number; status:"Activa"|"Inactiva"; notes?:string }
export interface Transfer { id:string; date:string; fromAccountId:string; toAccountId:string; amount:number; fee:number; notes?:string; status:RecordStatus }
export interface LedgerEntry { id:string; date:string; accountId?:string; sourceType:SourceType; sourceId?:string|number; direction:"IN"|"OUT"; currency?:Currency; cashAmount:number; pnlAmount:number; capitalAmount:number; category?:string; concept:string; status:RecordStatus; notes?:string }
export interface AuditEntry { id:string; date:string; action:"CREATE"|"UPDATE"|"DELETE"|"REVERSE"|"TRANSFER"|"RESET"; entity:string; entityId?:string|number; summary:string }

export interface Vehicle { id:string; brand:string; model:string; version:string; year:number; plate:string; km:number; fuels:Fuel[]; transmission:string; value:number; debt:number; inspection:string; health:number; soat:string; insurance:string; manual:string; color:string; engine:string; vin:string; owner:string }
export interface VehicleDocument { id:string|number; vehicleId:string; type:string; number:string; issuer:string; start:string; end?:string; status:string; cost?:number; notes?:string }
export interface Insurance { id:string|number; vehicleId:string; type:string; company:string; policy:string; start:string; end:string; cost:number; frequency:Frequency; coverage?:string; accountId?:string; paid?:boolean; notes?:string }
export interface Fine { id:string|number; vehicleId:string; accountId?:string; date:string; code:string; description:string; amount:number; discountAmount:number; discountPercent:number; discountUntil:string; status:"Pendiente"|"Pagada"|"Impugnada"|"Prescripción en evaluación"; due:string; points?:number; prescriptionEligible:boolean; notes?:string }
export interface Incident { id:number; vehicleId:string; type:"Accidente"|"Robo"; date:string; place:string; description:string; responsible:string; insurance:string; totalCost:number; recognized:number; paidByUser:number; paidByThirdParty:number; accountId?:string; affectedPeople:string; status:string; reference?:string; notes?:string }
export interface FuelItem { fuel:Fuel; amount:number; pricePerUnit:number; quantity:number; total:number }
export interface FuelStop { id:number; vehicleId:string; date:string; odometer:number; station:string; items:FuelItem[]; total:number; methods:{method:PaymentMethod;amount:number}[]; accountId?:string; linkedSessionId?:number; notes?:string }
export interface VehicleImprovement { id:string|number; vehicleId:string; date:string; type:"Accesorio"|"Audio"|"Iluminación"|"Pintura"|"Polarizado"|"Vinilo"|"Aros"|"Cámara"|"Pantalla"|"Sensores"|"Tuning"|"Reparación"|"Otro"; description:string; amount:number; accountId?:string; usefulLifeMonths?:number; notes?:string }
export interface TireRecord { id:string|number; vehicleId:string; accountId?:string; brand:string; model:string; size:string; date:string; odometer:number; price:number; position:string; estimatedLifeKm?:number; punctureRepair:boolean; repairCost:number; status:"Instalado"|"Retirado"|"Reparado"; notes?:string }
export interface RecurringExpense { id:string; name:string; category:string; amount:number; frequency:Frequency; startDate:string; nextDate:string; endDate?:string; method:PaymentMethod; accountId?:string; active:boolean; notes?:string }
export interface Investment { id:string; name:string; type:"Fondo"|"Acción"|"Depósito"|"Cripto"|"Negocio"|"Otro"; currency:Currency; contributed:number; currentValue:number; date:string; accountId?:string; notes?:string }
export interface InvestmentMovement { id:string|number; investmentId:string; date:string; type:"Aporte"|"Retiro"|"Rendimiento"; amount:number; accountId?:string; notes?:string; status:RecordStatus }
export interface FinancialEvent { id:string; date:string; label:string; amount:number; direction:"IN"|"OUT"|"NEUTRAL"; category:string; sourceType:SourceType|"document"|"recurring"; sourceId?:string|number; currency?:Currency; status:"Programado"|"Vencido"|"Proyectado" }

export interface Maintenance { id:string|number; vehicleId:string; type:"Preventivo"|"Correctivo"|"Mayor"|"Menor"|"Reparación"; service:string; date:string; km:number; partsCost:number; laborCost:number; performedBy:"Taller"|"Propietario"; intervalMonths?:number; intervalKm?:number; nextDate?:string; nextKm?:number; source:string; status:"Programado"|"Próximo"|"Vencido"|"Completado"; accountId?:string; linkedSessionId?:string|number; notes?:string }
export interface WorkSession { id:string|number; vehicleId:string; date:string; start:string; end:string; hours:number; km:number; trips:number; gross:number; commission:number; bonuses:number; fuelCost:number; otherCost:number; apps:string[]; notes?:string; accountId?:string; fuelAccounting?:"Jornada"|"Abastecimientos"|"Mixto" }
export interface Bonus { id:number; workSessionId:number; app:string; name:string; target:number; achieved:number; amount:number; date:string; status:"Potencial"|"Obtenido" }
export interface Card { id:string; bank:string; product:string; last4:string; currency:Currency; line:number; used:number; baseUsed?:number; closing:string; payment:string; tea:number; tcea:number; membership:number; membershipExonerable:boolean; desgravamenPercent:number; status:"Activa"|"Cancelada" }
export interface CardOperation { id:number; cardId:string; date:string; type:"Compra"|"Interés"|"Seguro"|"Membresía"|"Comisión"|"Ruleteo"|"Disposición"|"Pago"; purchaseMode?:"Directa"|"Cuotas"; installments?:number; currentInstallment?:number; concept:string; amount:number; fee:number; intermediary?:string; cashReceived?:number; installmentAmount?:number; statementDate?:string; accountId?:string; status:string; notes?:string }
export interface Borrower { id:string; name:string; document?:string; phone?:string; notes?:string }
export interface Loan { id:string; borrowerId:string; borrower:string; principal:number; balance:number; rate:number; frequency:Frequency; term:number; installment:number; totalScheduled:number; recovered:number; interestRecovered?:number; nextPayment:string; status:"Al día"|"Próximo"|"En mora"|"Pagado"; startDate:string; accountId?:string; notes?:string }
export interface LoanPayment { id:number; loanId:string; date:string; amount:number; principal:number; interest:number; lateFee:number; status:"Confirmado"|"Anulado" }
export interface Debt { id:string; vehicleId?:string; lender:string; product:string; principal:number; balance:number; annualRate:number; tea:number; tcea:number; installment:number; frequency:Frequency; term:number; desgravamen:number; fees:number; nextPayment:string; startDate:string; finalDate:string; accountId?:string; status:"Activa"|"Pagada" }
export interface DebtPayment { id:number; debtId:string; date:string; amount:number; principal:number; interest:number; insurance:number; fees:number; status:"Confirmado"|"Anulado" }
export interface Goal { id:string; name:string; target:number; current:number; deadline:string; category:string; frequency:Frequency; notes?:string }
export interface GoalMovement { id:number|string; goalId:string; date:string; type:"Aporte"|"Retiro"; amount:number; accountId?:string; notes?:string; status:RecordStatus }
export interface Budget { id:number|string; name:string; limit:number; category:string; period:"Mensual"|"Semanal"|"Anual"; active:boolean }

export interface ForecastPoint { date:string; opening:number; inflows:number; outflows:number; closing:number; events:FinancialEvent[] }

export interface FinancialSnapshot { income:number; incomeByCurrency?:Record<Currency,number>; expensesByCurrency?:Record<Currency,number>; cashByCurrency?:Record<Currency,number>; debtByCurrency?:Record<Currency,number>; receivablesByCurrency?:Record<Currency,number>; netWorthByCurrency?:Record<Currency,number>; expenses:number; netCashFlow:number; savingsRate:number; debt:number; receivables:number; cash:number; netWorth:number; cardUtilization:number; workProfit:number; }
