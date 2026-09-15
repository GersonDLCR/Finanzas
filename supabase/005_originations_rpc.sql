-- FINANZAS 360 - Transactional origination RPCs
-- Creates loans/debts together with their initial cash effect when applicable.

create or replace function public.register_loan(
  p_id uuid, p_borrower_id uuid, p_principal numeric, p_rate numeric,
  p_frequency public.frequency, p_term integer, p_start_date date,
  p_account_id uuid, p_next_payment date default null, p_notes text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  b public.borrowers;
  a public.accounts;
  interest numeric;
  total numeric;
  installment numeric;
  next_due date;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_principal <= 0 or p_rate < 0 or p_term <= 0 then raise exception 'invalid loan'; end if;
  if p_account_id is null then raise exception 'loan account is required'; end if;

  select * into b from public.borrowers where id=p_borrower_id and user_id=auth.uid() for update;
  if not found then raise exception 'borrower not found or not owned by current user'; end if;
  select * into a from public.accounts where id=p_account_id and user_id=auth.uid() for update;
  if not found then raise exception 'account not found or not owned by current user'; end if;

  if not public.claim_rpc_idempotency(
    p_id,'register_loan',
    jsonb_build_object('borrower',p_borrower_id,'principal',round(p_principal,2),'rate',p_rate,
      'frequency',p_frequency,'term',p_term,'start_date',p_start_date,'account',p_account_id,
      'next_payment',p_next_payment,'notes',p_notes)
  ) then return p_id; end if;

  interest := round(p_principal * p_rate, 2);
  total := round(p_principal + interest, 2);
  installment := round(total / p_term, 2);
  next_due := coalesce(p_next_payment,
    p_start_date + case p_frequency
      when 'Semanal' then 7 when 'Quincenal' then 14 when 'Mensual' then 30
      when 'Trimestral' then 90 when 'Semestral' then 180 when 'Anual' then 365
      else 30 end);

  if a.balance < p_principal then raise exception 'insufficient account balance'; end if;

  insert into public.loans(
    id,user_id,borrower_id,principal,balance,rate,frequency,term,installment,total_scheduled,
    recovered,interest_recovered,next_payment,status,start_date,account_id,notes
  ) values (
    p_id,auth.uid(),p_borrower_id,round(p_principal,2),round(p_principal,2),p_rate,p_frequency,p_term,
    installment,total,0,0,next_due,'Al día',p_start_date,p_account_id,p_notes
  );

  insert into public.financial_movements(
    user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,
    capital_effect,source_type,source_id,status,notes
  ) values (
    auth.uid(),p_start_date,'Gasto','Capital entregado · '||b.name,p_account_id,'Transferencia',
    round(p_principal,2),a.currency,true,false,-round(p_principal,2),'loan_disbursement',p_id,'Confirmado',p_notes
  );

  perform public.rpc_audit('CREATE','Préstamo',p_id,'Préstamo creado y desembolso vinculado de forma transaccional');
  return p_id;
end $$;

create or replace function public.register_debt(
  p_id uuid, p_lender text, p_product text, p_principal numeric, p_annual_rate numeric,
  p_tea numeric, p_tcea numeric, p_installment numeric, p_frequency public.frequency,
  p_term integer, p_desgravamen numeric, p_fees numeric, p_start_date date,
  p_account_id uuid, p_next_payment date default null, p_final_date date default null,
  p_status text default 'Activa', p_record_disbursement boolean default false
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  a public.accounts;
  next_due date;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if coalesce(btrim(p_lender),'')='' or coalesce(btrim(p_product),'')='' then raise exception 'lender and product are required'; end if;
  if p_principal <= 0 or p_annual_rate < 0 or p_term <= 0 or p_installment < 0 or p_desgravamen < 0 or p_fees < 0 then raise exception 'invalid debt'; end if;
  if p_account_id is null then raise exception 'debt account is required'; end if;

  select * into a from public.accounts where id=p_account_id and user_id=auth.uid() for update;
  if not found then raise exception 'account not found or not owned by current user'; end if;

  if not public.claim_rpc_idempotency(
    p_id,'register_debt',
    jsonb_build_object('lender',p_lender,'product',p_product,'principal',round(p_principal,2),
      'annual_rate',p_annual_rate,'tea',p_tea,'tcea',p_tcea,'installment',round(p_installment,2),
      'frequency',p_frequency,'term',p_term,'desgravamen',p_desgravamen,'fees',round(p_fees,2),
      'start_date',p_start_date,'account',p_account_id,'next_payment',p_next_payment,
      'final_date',p_final_date,'status',p_status,'record_disbursement',p_record_disbursement)
  ) then return p_id; end if;

  next_due := coalesce(p_next_payment,
    p_start_date + case p_frequency
      when 'Semanal' then 7 when 'Quincenal' then 14 when 'Mensual' then 30
      when 'Trimestral' then 90 when 'Semestral' then 180 when 'Anual' then 365
      else 30 end);

    insert into public.debts(
    id,user_id,lender,product,principal,balance,annual_rate,tea,tcea,installment,frequency,term,
    desgravamen,fees,next_payment,start_date,final_date,account_id,status
  ) values (
    p_id,auth.uid(),p_lender,p_product,round(p_principal,2),round(p_principal,2),p_annual_rate,
    p_tea,p_tcea,round(p_installment,2),p_frequency,p_term,p_desgravamen,round(p_fees,2),
    next_due,p_start_date,p_final_date,p_account_id,p_status
  );

  if p_record_disbursement then
    insert into public.financial_movements(
      user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,
      capital_effect,source_type,source_id,status
    ) values (
      auth.uid(),p_start_date,'Ingreso','Desembolso de deuda · '||p_lender,p_account_id,'Transferencia',
      round(p_principal,2),a.currency,true,false,round(p_principal,2),'debt_disbursement',p_id,'Confirmado'
    );
  end if;

  perform public.rpc_audit('CREATE','Deuda',p_id,'Deuda creada de forma transaccional');
  return p_id;
end $$;

revoke all on function public.register_loan(uuid,uuid,numeric,numeric,public.frequency,integer,date,uuid,date,text) from public, anon;
revoke all on function public.register_debt(uuid,text,text,numeric,numeric,numeric,numeric,numeric,public.frequency,integer,numeric,numeric,date,uuid,date,date,text,boolean) from public, anon;
grant execute on function public.register_loan(uuid,uuid,numeric,numeric,public.frequency,integer,date,uuid,date,text) to authenticated;
grant execute on function public.register_debt(uuid,text,text,numeric,numeric,numeric,numeric,numeric,public.frequency,integer,numeric,numeric,date,uuid,date,date,text,boolean) to authenticated;
