-- FINANZAS 360 - Transactional money RPC layer
-- Apply after 001_production_hardening.sql.
-- These functions are intentionally SECURITY DEFINER: the browser must never
-- be allowed to orchestrate multi-table money changes row-by-row.

create or replace function public.current_account_balance(p_account_id uuid)
returns numeric language sql stable security definer set search_path=public as $$
  select round(
    a.opening_balance + coalesce(sum(
      case when fm.status='Confirmado' and fm.affects_cash and fm.type='Ingreso' then fm.amount
           when fm.status='Confirmado' and fm.affects_cash and fm.type='Gasto' then -fm.amount
           else 0 end
    ),0), 2)
  from public.accounts a
  left join public.financial_movements fm
    on fm.account_id=a.id and fm.user_id=a.user_id
  where a.id=p_account_id and a.user_id=auth.uid()
  group by a.id, a.opening_balance;
$$;

create or replace function public.rpc_audit(p_action public.audit_action, p_entity text, p_entity_id uuid, p_summary text, p_metadata jsonb default '{}'::jsonb)
returns void language sql security definer set search_path=public as $$
  insert into public.audit_log(user_id,action,entity,entity_id,summary,metadata)
  values(auth.uid(),p_action,p_entity,p_entity_id,p_summary,coalesce(p_metadata,'{}'::jsonb));
$$;

-- Transfer: locks both accounts, validates tenant/currency/liquidity, then
-- writes the transfer and its double-sided cash ledger atomically.
create or replace function public.transfer_funds(
  p_id uuid, p_date date, p_from_account_id uuid, p_to_account_id uuid,
  p_amount numeric, p_fee numeric default 0, p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare a_from public.accounts; a_to public.accounts; balance numeric;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_amount <= 0 or p_fee < 0 then raise exception 'invalid transfer amount/fee'; end if;
  if p_from_account_id=p_to_account_id then raise exception 'source and destination accounts must differ'; end if;
  select * into a_from from public.accounts where id=p_from_account_id and user_id=auth.uid() for update;
  select * into a_to from public.accounts where id=p_to_account_id and user_id=auth.uid() for update;
  if not found then raise exception 'account not found or not owned by current user'; end if;
  if a_from.currency<>a_to.currency then raise exception 'cross-currency transfers are not supported'; end if;
  balance:=public.current_account_balance(a_from.id);
  if balance < p_amount+p_fee then raise exception 'insufficient account balance'; end if;
  if not public.claim_rpc_idempotency(p_id,'transfer_funds',jsonb_build_object('date',p_date,'from',p_from_account_id,'to',p_to_account_id,'amount',round(p_amount,2),'fee',round(p_fee,2),'notes',p_notes)) then return p_id; end if;
  insert into public.transfers(id,user_id,date,from_account_id,to_account_id,amount,fee,status,notes)
  values(p_id,auth.uid(),p_date,a_from.id,a_to.id,round(p_amount,2),round(p_fee,2),'Confirmado',p_notes);
  insert into public.financial_movements(user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,capital_effect,source_type,source_id,status,notes)
  values
    (auth.uid(),p_date,'Gasto','Transferencia enviada',a_from.id,'Transferencia',round(p_amount,2),a_from.currency,true,false,0,'transfer',p_id,'Confirmado',p_notes),
    (auth.uid(),p_date,'Ingreso','Transferencia recibida',a_to.id,'Transferencia',round(p_amount,2),a_to.currency,true,false,0,'transfer',p_id,'Confirmado',p_notes);
  if p_fee>0 then
    insert into public.financial_movements(user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,capital_effect,source_type,source_id,status,notes)
    values(auth.uid(),p_date,'Gasto','Comisión de transferencia',a_from.id,'Transferencia',round(p_fee,2),a_from.currency,true,true,0,'transfer',p_id,'Confirmado',p_notes);
  end if;
  perform public.rpc_audit('TRANSFER','Transferencia',p_id,'Transferencia registrada de forma transaccional');
  return p_id;
end $$;

-- Card operation: purchases affect card utilization but not cash; payments are
-- cash outflows. The operation row is the source of truth for card utilization.
create or replace function public.register_card_operation(
  p_id uuid, p_card_id uuid, p_date date, p_type text, p_purchase_mode text,
  p_installments integer, p_current_installment integer, p_concept text,
  p_amount numeric, p_fee numeric, p_intermediary text default null,
  p_cash_received numeric default null, p_installment_amount numeric default null,
  p_statement_date date default null, p_account_id uuid default null,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare c public.cards; a public.accounts;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_amount<=0 or p_fee<0 then raise exception 'invalid card operation amount/fee'; end if;
  select * into c from public.cards where id=p_card_id and user_id=auth.uid() for update;
  if not found then raise exception 'card not found or not owned by current user'; end if;
  if p_account_id is null then
    raise exception 'card operation requires an account';
  end if;
  select * into a from public.accounts where id=p_account_id and user_id=auth.uid() for update;
  if not found or a.currency<>c.currency then raise exception 'card/account currency mismatch'; end if;
  if not public.claim_rpc_idempotency(p_id,'register_card_operation',jsonb_build_object('card',p_card_id,'date',p_date,'type',p_type,'mode',p_purchase_mode,'installments',p_installments,'current_installment',p_current_installment,'concept',p_concept,'amount',round(p_amount,2),'fee',round(p_fee,2),'intermediary',p_intermediary,'cash_received',p_cash_received,'installment_amount',p_installment_amount,'statement_date',p_statement_date,'account',p_account_id,'notes',p_notes)) then return p_id; end if;
  insert into public.card_operations(id,user_id,card_id,date,type,purchase_mode,installments,current_installment,concept,amount,fee,intermediary,cash_received,installment_amount,statement_date,account_id,status,notes)
  values(p_id,auth.uid(),p_card_id,p_date,p_type,p_purchase_mode,p_installments,p_current_installment,p_concept,round(p_amount,2),round(p_fee,2),p_intermediary,p_cash_received,p_installment_amount,p_statement_date,p_account_id,'Confirmado',p_notes);
  if p_type='Pago' then
    if public.current_account_balance(p_account_id) < p_amount+p_fee then raise exception 'insufficient account balance for card payment'; end if;
    insert into public.financial_movements(user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,capital_effect,source_type,source_id,status,notes)
    values(auth.uid(),p_date,'Gasto','Pago de tarjeta · '||p_concept,p_account_id,'Transferencia',round(p_amount+p_fee,2),c.currency,true,false,0,'card_payment',p_id,'Confirmado',p_notes);
  else
    insert into public.financial_movements(user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,capital_effect,source_type,source_id,status,notes)
    values(auth.uid(),p_date,'Gasto','Operación de tarjeta · '||p_concept,p_account_id,'Tarjeta',round(p_amount+p_fee,2),c.currency,false,true,0,'card_purchase',p_id,'Confirmado',p_notes);
  end if;
  perform public.rpc_audit('CREATE','Operación de tarjeta',p_id,'Operación registrada de forma transaccional');
  return p_id;
end $$;

create or replace function public.reverse_card_operation(p_id uuid, p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare op public.card_operations; m public.financial_movements; c public.cards;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into op from public.card_operations where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'card operation not found'; end if;
  if op.status='Anulado' then return p_id; end if;
  select * into c from public.cards where id=op.card_id and user_id=auth.uid() for update;
  update public.card_operations set status='Anulado', notes=coalesce(notes||' | ','')||coalesce(p_reason,'Revertida') where id=p_id;
  for m in select * from public.financial_movements where source_type=case when op.type='Pago' then 'card_payment'::public.source_type else 'card_purchase'::public.source_type end and source_id=p_id and user_id=auth.uid() and status='Confirmado' loop
    update public.financial_movements set status='Anulado' where id=m.id;
    insert into public.financial_movements(user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,capital_effect,source_type,source_id,status,notes)
    values(auth.uid(),current_date,case when m.type='Ingreso' then 'Gasto' else 'Ingreso' end,'Reversión · '||m.concept,m.account_id,'Reversión',m.amount,m.currency,m.affects_cash,m.affects_pnl,-m.capital_effect,'manual',null,'Confirmado',p_reason);
  end loop;
  perform public.rpc_audit('REVERSE','Operación de tarjeta',p_id,'Operación de tarjeta revertida');
  return p_id;
end $$;

-- Loan payment follows the application rule: late fee -> scheduled simple
-- interest still outstanding -> principal. The complete change is atomic.
create or replace function public.register_loan_payment(
  p_id uuid, p_loan_id uuid, p_date date, p_requested numeric, p_late_fee numeric default 0
) returns uuid language plpgsql security definer set search_path=public as $$
declare l public.loans; amount numeric; scheduled_interest numeric; late numeric; interest numeric; principal numeric;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_requested<=0 or p_late_fee<0 then raise exception 'invalid loan payment'; end if;
  select * into l from public.loans where id=p_loan_id and user_id=auth.uid() for update;
  if not found then raise exception 'loan not found or not owned by current user'; end if;
  if not public.claim_rpc_idempotency(p_id,'register_loan_payment',jsonb_build_object('loan',p_loan_id,'date',p_date,'requested',round(p_requested,2),'late_fee',round(p_late_fee,2))) then return p_id; end if;
  scheduled_interest:=greatest(0,l.total_scheduled-l.principal-coalesce(l.interest_recovered,0));
  amount:=least(greatest(0,p_requested),greatest(0,l.balance)+scheduled_interest+greatest(0,p_late_fee));
  late:=least(amount,greatest(0,p_late_fee));
  interest:=least(amount-late,scheduled_interest);
  principal:=least(amount-late-interest,greatest(0,l.balance));
  if public.current_account_balance(l.account_id)<amount then raise exception 'insufficient account balance'; end if;
  insert into public.loan_payments(id,user_id,loan_id,date,amount,principal,interest,late_fee,status)
  values(p_id,auth.uid(),l.id,p_date,round(amount,2),round(principal,2),round(interest,2),round(late,2),'Confirmado');
  update public.loans set balance=greatest(0,balance-principal),recovered=recovered+principal,interest_recovered=interest_recovered+interest,status=case when balance-principal<=0 then 'Pagado' else 'Al día' end,next_payment=p_date+case frequency when 'Semanal' then 7 when 'Quincenal' then 14 when 'Mensual' then 30 when 'Trimestral' then 90 when 'Semestral' then 180 when 'Anual' then 365 else 30 end where id=l.id;
  insert into public.financial_movements(user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,capital_effect,source_type,source_id,status)
  values
    (auth.uid(),p_date,'Ingreso','Cobro de capital · '||l.borrower_id,l.account_id,'Transferencia',round(principal,2),(select currency from public.accounts where id=l.account_id),true,false,round(principal,2),'loan_payment',p_id,'Confirmado'),
    (auth.uid(),p_date,'Ingreso','Interés cobrado · '||l.borrower_id,l.account_id,'Transferencia',round(interest+late,2),(select currency from public.accounts where id=l.account_id),true,true,0,'loan_payment',p_id,'Confirmado');
  perform public.rpc_audit('CREATE','Cobro de préstamo',p_id,'Cobro de préstamo registrado de forma transaccional');
  return p_id;
end $$;

create or replace function public.reverse_loan_payment(p_id uuid, p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare p public.loan_payments; m public.financial_movements;
begin
  select * into p from public.loan_payments where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'loan payment not found'; end if;
  if p.status='Anulado' then return p_id; end if;
  update public.loan_payments set status='Anulado' where id=p_id;
  update public.loans set balance=balance+p.principal,recovered=greatest(0,recovered-p.principal),interest_recovered=greatest(0,interest_recovered-p.interest),status='Al día' where id=p.loan_id and user_id=auth.uid();
  update public.financial_movements set status='Anulado' where source_type='loan_payment' and source_id=p_id and user_id=auth.uid() and status='Confirmado';
  perform public.rpc_audit('REVERSE','Cobro de préstamo',p_id,'Cobro de préstamo revertido');
  return p_id;
end $$;

create or replace function public.register_debt_payment(
  p_id uuid, p_debt_id uuid, p_date date, p_requested numeric
) returns uuid language plpgsql security definer set search_path=public as $$
declare d public.debts; rate numeric; interest numeric; insurance numeric; fees numeric; amount numeric; left_amount numeric; principal numeric; cur char(3);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_requested<=0 then raise exception 'invalid debt payment'; end if;
  select * into d from public.debts where id=p_debt_id and user_id=auth.uid() for update;
  if not found then raise exception 'debt not found or not owned by current user'; end if;
  if not public.claim_rpc_idempotency(p_id,'register_debt_payment',jsonb_build_object('debt',p_debt_id,'date',p_date,'requested',round(p_requested,2))) then return p_id; end if;
  rate:=case d.frequency when 'Semanal' then d.annual_rate/52 when 'Quincenal' then d.annual_rate/26 when 'Mensual' then d.annual_rate/12 when 'Trimestral' then d.annual_rate/4 when 'Semestral' then d.annual_rate/2 when 'Anual' then d.annual_rate else d.annual_rate/12 end;
  interest:=greatest(0,d.balance*rate); insurance:=greatest(0,d.desgravamen/100*d.balance/12); fees:=greatest(0,d.fees);
  amount:=least(greatest(0,p_requested),greatest(0,d.balance)+interest+insurance+fees);
  left_amount:=amount; interest:=least(left_amount,interest); left_amount:=left_amount-interest; insurance:=least(left_amount,insurance); left_amount:=left_amount-insurance; fees:=least(left_amount,fees); left_amount:=left_amount-fees; principal:=least(left_amount,greatest(0,d.balance));
  if public.current_account_balance(d.account_id)<amount then raise exception 'insufficient account balance'; end if;
  select currency into cur from public.accounts where id=d.account_id;
  insert into public.debt_payments(id,user_id,debt_id,date,amount,principal,interest,insurance,fees,status) values(p_id,auth.uid(),d.id,p_date,round(amount,2),round(principal,2),round(interest,2),round(insurance,2),round(fees,2),'Confirmado');
  update public.debts set balance=greatest(0,balance-principal),status=case when balance-principal<=0 then 'Pagada' else 'Activa' end,next_payment=p_date+case frequency when 'Semanal' then 7 when 'Quincenal' then 14 when 'Mensual' then 30 when 'Trimestral' then 90 when 'Semestral' then 180 when 'Anual' then 365 else 30 end where id=d.id;
  insert into public.financial_movements(user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,capital_effect,source_type,source_id,status)
  values
   (auth.uid(),p_date,'Gasto','Amortización de capital · '||d.lender,d.account_id,'Transferencia',round(principal,2),cur,true,false,-round(principal,2),'debt_payment',p_id,'Confirmado'),
   (auth.uid(),p_date,'Gasto','Costo financiero de deuda · '||d.lender,d.account_id,'Transferencia',round(interest+insurance+fees,2),cur,true,true,0,'debt_payment',p_id,'Confirmado');
  perform public.rpc_audit('CREATE','Pago de deuda',p_id,'Pago de deuda registrado de forma transaccional');
  return p_id;
end $$;

create or replace function public.reverse_debt_payment(p_id uuid, p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare p public.debt_payments;
begin
  select * into p from public.debt_payments where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'debt payment not found'; end if;
  if p.status='Anulado' then return p_id; end if;
  update public.debt_payments set status='Anulado' where id=p_id;
  update public.debts set balance=balance+p.principal,status='Activa' where id=p.debt_id and user_id=auth.uid();
  update public.financial_movements set status='Anulado' where source_type='debt_payment' and source_id=p_id and user_id=auth.uid() and status='Confirmado';
  perform public.rpc_audit('REVERSE','Pago de deuda',p_id,'Pago de deuda revertido');
  return p_id;
end $$;

-- RPCs are the intended write surface; helper functions remain private.
revoke all on function public.current_account_balance(uuid) from public;
revoke all on function public.rpc_audit(public.audit_action,text,uuid,text,jsonb) from public;
revoke all on function public.transfer_funds(uuid,date,uuid,uuid,numeric,numeric,text) from public;
revoke all on function public.register_card_operation(uuid,uuid,date,text,text,integer,integer,text,numeric,numeric,text,numeric,numeric,date,uuid,text) from public;
revoke all on function public.reverse_card_operation(uuid,text) from public;
revoke all on function public.register_loan_payment(uuid,uuid,date,numeric,numeric) from public;
revoke all on function public.reverse_loan_payment(uuid,text) from public;
revoke all on function public.register_debt_payment(uuid,uuid,date,numeric) from public;
revoke all on function public.reverse_debt_payment(uuid,text) from public;

grant execute on function public.transfer_funds(uuid,date,uuid,uuid,numeric,numeric,text) to authenticated;
grant execute on function public.register_card_operation(uuid,uuid,date,text,text,integer,integer,text,numeric,numeric,text,numeric,numeric,date,uuid,text) to authenticated;
grant execute on function public.reverse_card_operation(uuid,text) to authenticated;
grant execute on function public.register_loan_payment(uuid,uuid,date,numeric,numeric) to authenticated;
grant execute on function public.reverse_loan_payment(uuid,text) to authenticated;
grant execute on function public.register_debt_payment(uuid,uuid,date,numeric) to authenticated;
grant execute on function public.reverse_debt_payment(uuid,text) to authenticated;
