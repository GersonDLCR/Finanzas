-- FINANZAS 360 - PostgreSQL production hardening
-- Apply after schema.sql. No connection is made by the project.

-- 1) Common validation helpers ------------------------------------------------
create or replace function public.assert_same_user(target_user uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  if target_user is null or auth.uid() is null or target_user <> auth.uid() then
    raise exception 'cross-tenant ownership blocked';
  end if;
end $$;

create or replace function public.prevent_user_change() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' and new.user_id is distinct from old.user_id then
    raise exception 'user_id is immutable';
  end if;
  return new;
end $$;

-- 2) Money/account consistency -------------------------------------------------
-- Every cash-bearing source uses an account and the account currency is the
-- source currency. Investments remain the deliberate exception because their
-- current value is not itself a cash balance.
create or replace function public.assert_account_currency() returns trigger
language plpgsql security definer set search_path=public as $$
declare account_currency char(3);
begin
  if new.account_id is null then return new; end if;
  select currency into account_currency from public.accounts where id = new.account_id;
  if account_currency is null then
    raise exception 'account does not exist';
  end if;
  if to_jsonb(new) ? 'currency' and (to_jsonb(new)->>'currency') is not null
     and (to_jsonb(new)->>'currency') <> account_currency then
    raise exception 'currency/account mismatch';
  end if;
  return new;
end $$;

create or replace function public.assert_card_account_currency() returns trigger
language plpgsql security definer set search_path=public as $$
declare card_currency char(3); account_currency char(3);
begin
  if new.account_id is null then
    raise exception 'card operation requires an account';
  end if;
  select currency into card_currency from public.cards where id = new.card_id;
  select currency into account_currency from public.accounts where id = new.account_id;
  if card_currency is null or account_currency is null or card_currency <> account_currency then
    raise exception 'card/account currency mismatch';
  end if;
  return new;
end $$;

create or replace function public.assert_investment_account_currency() returns trigger
language plpgsql security definer set search_path=public as $$
declare inv_currency char(3); account_currency char(3);
begin
  if new.account_id is null then return new; end if;
  select currency into inv_currency from public.investments where id = new.investment_id;
  select currency into account_currency from public.accounts where id = new.account_id;
  if inv_currency is null or account_currency is null or inv_currency <> account_currency then
    raise exception 'investment/account currency mismatch';
  end if;
  return new;
end $$;

-- Replaceable triggers: safe when this migration is re-applied.
drop trigger if exists card_operation_currency_check on public.card_operations;
create trigger card_operation_currency_check before insert or update on public.card_operations
for each row execute function public.assert_card_account_currency();

drop trigger if exists investment_movement_currency_check on public.investment_movements;
create trigger investment_movement_currency_check before insert or update on public.investment_movements
for each row execute function public.assert_investment_account_currency();

drop trigger if exists movement_currency_check on public.financial_movements;
create trigger movement_currency_check before insert or update on public.financial_movements
for each row execute function public.assert_account_currency();

-- 3) Strong monetary constraints ------------------------------------------------
-- Constraints are installed through a repeatable helper so this hardening file can
-- safely be re-applied during local/CI/provisioning without duplicate-object errors.
create or replace function public.ensure_check_constraint(p_table text, p_name text, p_definition text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not exists (
    select 1 from pg_constraint c
    join pg_class r on r.oid=c.conrelid
    join pg_namespace n on n.oid=r.relnamespace
    where n.nspname='public' and r.relname=p_table and c.conname=p_name
  ) then
    execute format('alter table public.%I add constraint %I check (%s)', p_table, p_name, p_definition);
  end if;
end $$;

select public.ensure_check_constraint('card_operations','card_operations_amount_positive','amount > 0');
select public.ensure_check_constraint('card_operations','card_operations_fee_nonnegative','fee >= 0');
select public.ensure_check_constraint('card_operations','card_operations_installments_valid','installments is null or installments > 0');
select public.ensure_check_constraint('card_operations','card_operations_current_installment_valid','current_installment is null or current_installment > 0');
select public.ensure_check_constraint('loan_payments','loan_payments_amount_positive','amount > 0');
select public.ensure_check_constraint('loan_payments','loan_payments_components_nonnegative','principal >= 0 and interest >= 0 and late_fee >= 0');
select public.ensure_check_constraint('loan_payments','loan_payments_components_not_over_amount','principal + interest + late_fee <= amount + 0.01');
select public.ensure_check_constraint('debt_payments','debt_payments_amount_positive','amount > 0');
select public.ensure_check_constraint('debt_payments','debt_payments_components_nonnegative','principal >= 0 and interest >= 0 and insurance >= 0 and fees >= 0');
select public.ensure_check_constraint('debt_payments','debt_payments_components_not_over_amount','principal + interest + insurance + fees <= amount + 0.01');
select public.ensure_check_constraint('loans','loans_balance_nonnegative','balance >= 0');
select public.ensure_check_constraint('loans','loans_rate_nonnegative','rate >= 0');
select public.ensure_check_constraint('loans','loans_installment_nonnegative','installment >= 0');
select public.ensure_check_constraint('loans','loans_total_scheduled_nonnegative','total_scheduled >= 0');
select public.ensure_check_constraint('loans','loans_recovered_nonnegative','recovered >= 0');
select public.ensure_check_constraint('loans','loans_interest_recovered_nonnegative','interest_recovered >= 0');
select public.ensure_check_constraint('debts','debts_principal_positive','principal > 0');
select public.ensure_check_constraint('debts','debts_balance_nonnegative','balance >= 0');
select public.ensure_check_constraint('debts','debts_rates_nonnegative','annual_rate >= 0 and coalesce(tea,0) >= 0 and coalesce(tcea,0) >= 0');
select public.ensure_check_constraint('debts','debts_installment_nonnegative','installment >= 0');
select public.ensure_check_constraint('debts','debts_fees_nonnegative','fees >= 0');
select public.ensure_check_constraint('cards','cards_last4_digits',"last4 ~ '^[0-9]{4}$'");
select public.ensure_check_constraint('cards','cards_line_nonnegative','line >= 0');
select public.ensure_check_constraint('cards','cards_base_used_nonnegative','base_used >= 0');
select public.ensure_check_constraint('cards','cards_days_valid','closing_day between 1 and 31 and payment_day between 1 and 31');
select public.ensure_check_constraint('financial_movements','financial_movements_amount_positive','amount > 0');
select public.ensure_check_constraint('transfers','transfers_fee_nonnegative','fee >= 0');
select public.ensure_check_constraint('accounts','accounts_name_not_blank','length(trim(name)) > 0');

-- 4) Required account for operations that actually spend/receive cash ----------
alter table public.loan_payments alter column user_id set not null;
alter table public.debt_payments alter column user_id set not null;
alter table public.card_operations alter column account_id set not null;
alter table public.fuel_stops alter column account_id set not null;

-- Loan/debt disbursement account is needed for an auditable cash origin.
alter table public.loans alter column account_id set not null;
alter table public.debts alter column account_id set not null;

-- 5) Cross-table business invariants -------------------------------------------
create or replace function public.assert_transfer_currency() returns trigger
language plpgsql security definer set search_path=public as $$
declare c1 char(3); c2 char(3);
begin
  select currency into c1 from public.accounts where id = new.from_account_id;
  select currency into c2 from public.accounts where id = new.to_account_id;
  if c1 is null or c2 is null or c1 <> c2 then
    raise exception 'transfer requires accounts with the same currency';
  end if;
  return new;
end $$;

drop trigger if exists transfer_currency_check on public.transfers;
create trigger transfer_currency_check before insert or update on public.transfers
for each row execute function public.assert_transfer_currency();

create or replace function public.assert_positive_balance_transition() returns trigger
language plpgsql as $$
begin
  if new.balance < 0 then raise exception 'balance cannot be negative'; end if;
  return new;
end $$;

drop trigger if exists loan_balance_check on public.loans;
create trigger loan_balance_check before insert or update on public.loans
for each row execute function public.assert_positive_balance_transition();
drop trigger if exists debt_balance_check on public.debts;
create trigger debt_balance_check before insert or update on public.debts
for each row execute function public.assert_positive_balance_transition();

-- 6) Ownership cannot be changed after creation -------------------------------
do $$ declare t text; begin
  foreach t in array array[
    'accounts','categories','vehicles','vehicle_documents','insurances','fines','incidents',
    'work_sessions','platforms','bonuses','fuel_stops','maintenance','borrowers','loans',
    'loan_payments','debts','debt_payments','cards','card_operations','goals','goal_movements',
    'budgets','transfers','financial_movements','audit_log','vehicle_improvements','tire_records',
    'recurring_expenses','investments','investment_movements'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t||'_user_immutable', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.prevent_user_change()', t||'_user_immutable', t);
  end loop;
end $$;

-- 7) Audit log is append-only --------------------------------------------------
create or replace function public.audit_append_only() returns trigger
language plpgsql as $$
begin
  raise exception 'audit_log is append-only';
end $$;
drop trigger if exists audit_no_update on public.audit_log;
create trigger audit_no_update before update or delete on public.audit_log
for each row execute function public.audit_append_only();

-- 8) Useful indexes for real workloads ----------------------------------------
create index if not exists idx_accounts_user_status on public.accounts(user_id,status);
create index if not exists idx_categories_user_kind on public.categories(user_id,kind,active);
create index if not exists idx_vehicles_user_active on public.vehicles(user_id,plate);
create index if not exists idx_work_sessions_user_date on public.work_sessions(user_id,date desc);
create index if not exists idx_fuel_stops_user_date on public.fuel_stops(user_id,date desc);
create index if not exists idx_maintenance_user_vehicle_date on public.maintenance(user_id,vehicle_id,date desc);
create index if not exists idx_loans_user_status_due on public.loans(user_id,status,next_payment);
create index if not exists idx_loan_payments_user_date on public.loan_payments(user_id,date desc);
create index if not exists idx_debts_user_status_due on public.debts(user_id,status,next_payment);
create index if not exists idx_debt_payments_user_date on public.debt_payments(user_id,date desc);
create index if not exists idx_cards_user_status on public.cards(user_id,status);
create index if not exists idx_card_operations_user_date on public.card_operations(user_id,date desc);
create index if not exists idx_goals_user_deadline on public.goals(user_id,deadline);
create index if not exists idx_budgets_user_active on public.budgets(user_id,active);
create index if not exists idx_transfers_user_date on public.transfers(user_id,date desc);
create index if not exists idx_audit_user_created on public.audit_log(user_id,created_at desc);

-- 9) Prevent direct access to security helpers.
revoke all on function public.assert_same_user(uuid) from public;
revoke all on function public.prevent_user_change() from public;
revoke all on function public.assert_account_currency() from public;
revoke all on function public.assert_card_account_currency() from public;
revoke all on function public.assert_investment_account_currency() from public;
revoke all on function public.assert_transfer_currency() from public;
revoke all on function public.assert_positive_balance_transition() from public;
revoke all on function public.audit_append_only() from public;
revoke all on function public.ensure_check_constraint(text,text,text) from public;

-- 10) Production note ----------------------------------------------------------
-- Money-changing operations MUST be exposed through server-side RPC/functions
-- with row locks and transaction boundaries before connecting the frontend:
--   transfer_funds
--   register_card_operation / reverse_card_operation
--   register_loan_payment / reverse_loan_payment
--   register_debt_payment / reverse_debt_payment
--   register_goal_movement / reverse_goal_movement
--   register_investment_movement / reverse_investment_movement
