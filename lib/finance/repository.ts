import type * as T from "@/types";

export interface FinanceRepository<TItem extends {id:string|number}>{
  list():Promise<TItem[]>;
  get(id:TItem["id"]):Promise<TItem|undefined>;
  upsert(item:TItem):Promise<TItem>;
  remove(id:TItem["id"]):Promise<void>;
}

export interface FinanceCommandResult<T=void>{ok:boolean;data?:T;error?:string}
export interface FinanceMoneyCommands{
  transfer(t:T.Transfer):Promise<FinanceCommandResult<T.Transfer>>;
  registerLoanPayment(p:T.LoanPayment):Promise<FinanceCommandResult<T.LoanPayment>>;
  reverseLoanPayment(id:T.LoanPayment["id"]):Promise<FinanceCommandResult>;
  registerDebtPayment(p:T.DebtPayment):Promise<FinanceCommandResult<T.DebtPayment>>;
  reverseDebtPayment(id:T.DebtPayment["id"]):Promise<FinanceCommandResult>;
}

/** Adapter local de demostración. Supabase podrá implementar exactamente el mismo contrato. */
export class MemoryRepository<TItem extends {id:string|number}> implements FinanceRepository<TItem>{
  private rows:TItem[];
  constructor(initial:TItem[]){this.rows=[...initial];}
  async list(){return [...this.rows];}
  async get(id:TItem["id"]){return this.rows.find(x=>x.id===id);}
  async upsert(item:TItem){const i=this.rows.findIndex(x=>x.id===item.id);if(i>=0)this.rows[i]=item;else this.rows.unshift(item);return item;}
  async remove(id:TItem["id"]){this.rows=this.rows.filter(x=>x.id!==id);}
}

export interface RepositoryRegistry{
  movements:FinanceRepository<T.Movement>;
  accounts:FinanceRepository<T.FinancialAccount>;
  vehicles:FinanceRepository<T.Vehicle>;
  improvements:FinanceRepository<T.VehicleImprovement>;
  tires:FinanceRepository<T.TireRecord>;
  recurringExpenses:FinanceRepository<T.RecurringExpense>;
  investments:FinanceRepository<T.Investment>;
  investmentMovements:FinanceRepository<T.InvestmentMovement>;
  borrowers:FinanceRepository<T.Borrower>;
  loans:FinanceRepository<T.Loan>;
  loanPayments:FinanceRepository<T.LoanPayment>;
  debts:FinanceRepository<T.Debt>;
  debtPayments:FinanceRepository<T.DebtPayment>;
  cards:FinanceRepository<T.Card>;
  cardOperations:FinanceRepository<T.CardOperation>;
  goals:FinanceRepository<T.Goal>;
  goalMovements:FinanceRepository<T.GoalMovement>;
  budgets:FinanceRepository<T.Budget>;
}
