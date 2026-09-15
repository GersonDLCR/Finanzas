-- FINANZAS 360 - Goals + investments transactional RPC layer
-- Apply after 002_money_rpc.sql.
-- Goals are virtual allocations: they DO NOT alter account cash.
-- Investments represent real capital: Aporte/Retiro alter cash; Rendimiento alters P&L/value.

create or replace function public.register_goal_movement(
  p_id uuid, p_goal_id uuid, p_date date, p_type text, p_amount numeric,
  p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare g public.goals; current_amount numeric; new_amount numeric;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_type not in ('Aporte','Retiro') or p_amount <= 0 then raise exception 'invalid goal movement'; end if;
  select * into g from public.goals where id=p_goal_id and user_id=auth.uid() for update;
  if not found then raise exception 'goal not found or not owned by current user'; end if;
  if not public.claim_rpc_idempotency(p_id,'register_goal_movement',jsonb_build_object('goal',p_goal_id,'date',p_date,'type',p_type,'amount',round(p_amount,2),'notes',p_notes)) then return p_id; end if;
  current_amount:=g.current_amount;
  if p_type='Retiro' and current_amount < p_amount then raise exception 'goal balance is insufficient'; end if;
  new_amount:=case when p_type='Aporte' then least(g.target,current_amount+p_amount) else greatest(0,current_amount-p_amount) end;
  if p_type='Aporte' and current_amount+p_amount>g.target then raise exception 'goal target would be exceeded'; end if;
  insert into public.goal_movements(id,user_id,goal_id,date,type,amount,status,notes)
  values(p_id,auth.uid(),g.id,p_date,p_type,round(p_amount,2),'Confirmado',p_notes);
  update public.goals set current_amount=round(new_amount,2) where id=g.id;
  -- Intentionally no financial_movement: this is a virtual allocation.
  perform public.rpc_audit('CREATE','Movimiento de meta',p_id,'Movimiento de meta registrado sin alterar liquidez');
  return p_id;
end $$;

create or replace function public.reverse_goal_movement(p_id uuid, p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare gm public.goal_movements; g public.goals;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into gm from public.goal_movements where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'goal movement not found'; end if;
  if gm.status='Anulado' then return p_id; end if;
  select * into g from public.goals where id=gm.goal_id and user_id=auth.uid() for update;
  if not found then raise exception 'goal not found or not owned by current user'; end if;
  update public.goal_movements set status='Anulado',notes=coalesce(notes||' | ','')||coalesce(p_reason,'Revertida') where id=p_id;
  update public.goals set current_amount=case when gm.type='Aporte' then greatest(0,current_amount-gm.amount) else least(target,current_amount+gm.amount) end where id=g.id;
  perform public.rpc_audit('REVERSE','Movimiento de meta',p_id,'Movimiento de meta revertido');
  return p_id;
end $$;

create or replace function public.register_investment_movement(
  p_id uuid, p_investment_id uuid, p_date date, p_type text, p_amount numeric,
  p_account_id uuid default null, p_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare i public.investments; a public.accounts; cash numeric; cur char(3);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_type not in ('Aporte','Retiro','Rendimiento') or p_amount <= 0 then raise exception 'invalid investment movement'; end if;
  select * into i from public.investments where id=p_investment_id and user_id=auth.uid() for update;
  if not found then raise exception 'investment not found or not owned by current user'; end if;
  if not public.claim_rpc_idempotency(p_id,'register_investment_movement',jsonb_build_object('investment',p_investment_id,'date',p_date,'type',p_type,'amount',round(p_amount,2),'account',p_account_id,'notes',p_notes)) then return p_id; end if;
  cur:=i.currency;
  if p_type in ('Aporte','Retiro') then
    if p_account_id is null then raise exception 'investment cash movement requires an account'; end if;
    select * into a from public.accounts where id=p_account_id and user_id=auth.uid() for update;
    if not found or a.currency<>cur then raise exception 'investment/account currency mismatch'; end if;
  end if;
  if p_type='Retiro' and i.current_value < p_amount then raise exception 'investment value is insufficient'; end if;
  if p_type='Aporte' then
    cash:=public.current_account_balance(p_account_id);
    if cash < p_amount then raise exception 'insufficient account balance for investment contribution'; end if;
    update public.investments set contributed=round(contributed+p_amount,2),current_value=round(current_value+p_amount,2) where id=i.id;
  elsif p_type='Retiro' then
    update public.investments set contributed=greatest(0,round(contributed-p_amount,2)),current_value=greatest(0,round(current_value-p_amount,2)) where id=i.id;
  else
    update public.investments set current_value=greatest(0,round(current_value+p_amount,2)) where id=i.id;
  end if;
  insert into public.investment_movements(id,user_id,investment_id,date,type,amount,account_id,status,notes)
  values(p_id,auth.uid(),i.id,p_date,p_type,round(p_amount,2),p_account_id,'Confirmado',p_notes);
  if p_type='Aporte' then
    insert into public.financial_movements(user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,capital_effect,source_type,source_id,status,notes)
    values(auth.uid(),p_date,'Gasto','Aporte a inversión · '||i.name,p_account_id,'Transferencia',round(p_amount,2),cur,true,false,-round(p_amount,2),'investment',p_id,'Confirmado',p_notes);
  elsif p_type='Retiro' then
    insert into public.financial_movements(user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,capital_effect,source_type,source_id,status,notes)
    values(auth.uid(),p_date,'Ingreso','Retiro de inversión · '||i.name,p_account_id,'Transferencia',round(p_amount,2),cur,true,false,round(p_amount,2),'investment',p_id,'Confirmado',p_notes);
  else
    insert into public.financial_movements(user_id,date,type,concept,account_id,method,amount,currency,affects_cash,affects_pnl,capital_effect,source_type,source_id,status,notes)
    values(auth.uid(),p_date,'Ingreso','Rendimiento de inversión · '||i.name,null,'Inversión',round(p_amount,2),cur,false,true,round(p_amount,2),'investment',p_id,'Confirmado',p_notes);
  end if;
  perform public.rpc_audit('CREATE','Movimiento de inversión',p_id,'Movimiento de inversión registrado de forma transaccional');
  return p_id;
end $$;

create or replace function public.reverse_investment_movement(p_id uuid, p_reason text default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare m public.investment_movements; i public.investments;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into m from public.investment_movements where id=p_id and user_id=auth.uid() for update;
  if not found then raise exception 'investment movement not found'; end if;
  if m.status='Anulado' then return p_id; end if;
  select * into i from public.investments where id=m.investment_id and user_id=auth.uid() for update;
  if not found then raise exception 'investment not found or not owned by current user'; end if;
  if m.type='Aporte' and i.current_value < m.amount then raise exception 'cannot reverse contribution below zero'; end if;
  if m.type='Rendimiento' and i.current_value < m.amount then raise exception 'cannot reverse investment return below zero'; end if;
  update public.investment_movements set status='Anulado',notes=coalesce(notes||' | ','')||coalesce(p_reason,'Revertida') where id=p_id;
  update public.investments set
    contributed=case when m.type='Aporte' then greatest(0,contributed-m.amount) when m.type='Retiro' then contributed+m.amount else contributed end,
    current_value=case when m.type='Aporte' then greatest(0,current_value-m.amount) when m.type='Retiro' then current_value+m.amount else greatest(0,current_value-m.amount) end
  where id=i.id;
  update public.financial_movements set status='Anulado' where source_type='investment' and source_id=p_id and user_id=auth.uid() and status='Confirmado';
  perform public.rpc_audit('REVERSE','Movimiento de inversión',p_id,'Movimiento de inversión revertido');
  return p_id;
end $$;

revoke all on function public.register_goal_movement(uuid,uuid,date,text,numeric,text) from public;
revoke all on function public.reverse_goal_movement(uuid,text) from public;
revoke all on function public.register_investment_movement(uuid,uuid,date,text,numeric,uuid,text) from public;
revoke all on function public.reverse_investment_movement(uuid,text) from public;
grant execute on function public.register_goal_movement(uuid,uuid,date,text,numeric,text) to authenticated;
grant execute on function public.reverse_goal_movement(uuid,text) to authenticated;
grant execute on function public.register_investment_movement(uuid,uuid,date,text,numeric,uuid,text) to authenticated;
grant execute on function public.reverse_investment_movement(uuid,text) to authenticated;
