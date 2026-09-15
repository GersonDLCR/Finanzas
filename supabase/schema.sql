-- FINANZAS 360 - PostgreSQL/Supabase schema blueprint · v56
-- No Supabase connection is performed by this project. This file is the final DB contract to implement later.
create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.frequency as enum ('Semanal','Quincenal','Mensual','Trimestral','Semestral','Anual','Personalizada');
create type public.record_status as enum ('Borrador','Confirmado','Anulado');
create type public.account_type as enum ('Efectivo','Cuenta bancaria','Billetera digital','Cuenta ahorro','Otro');
create type public.movement_type as enum ('Ingreso','Gasto');
create type public.source_type as enum ('manual','work','fuel','maintenance','insurance','fine','incident','card_purchase','card_payment','loan_disbursement','debt_disbursement','loan_payment','debt_payment','goal_contribution','goal_withdrawal','investment','improvement','tire','transfer');
create type public.direction as enum ('IN','OUT');
create type public.audit_action as enum ('CREATE','UPDATE','DELETE','REVERSE','TRANSFER','RESET');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  preferred_currency char(3) not null default 'PEN' check(preferred_currency in ('PEN','USD')),
  timezone text not null default 'America/Lima',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, type public.account_type not null, currency char(3) not null default 'PEN' check(currency in ('PEN','USD')),
  opening_balance numeric(14,2) not null default 0 check (opening_balance >= 0), status text not null default 'Activa' check(status in ('Activa','Inactiva')), notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,name)
);
create table public.categories (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade,
  name text not null, kind text not null check(kind in ('Ingreso','Gasto','Ambos')), parent_id uuid references public.categories(id) on delete set null, active boolean not null default true,
  unique(user_id,name)
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  brand text not null, model text not null, version text, year int check(year between 1900 and 2200), plate text not null, km numeric(12,1) not null default 0,
  fuels text[] not null default '{}', transmission text, value numeric(14,2) not null default 0, debt numeric(14,2) not null default 0,
  inspection text, health smallint check(health between 0 and 100), soat_date date, insurance_date date, manual text, color text, engine text, vin text, owner text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,plate)
);
create table public.vehicle_documents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type text not null, number text, issuer text, start_date date, end_date date, status text, cost numeric(14,2) default 0, notes text, created_at timestamptz not null default now()
);
create table public.insurances (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type text not null, company text, policy text, start_date date, end_date date, cost numeric(14,2) not null default 0, frequency public.frequency, coverage text, account_id uuid references public.accounts(id) on delete set null, paid boolean not null default true, notes text
);
create table public.fines (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  date date not null, code text, description text, amount numeric(14,2) not null default 0, account_id uuid references public.accounts(id) on delete set null, discount_amount numeric(14,2) not null default 0, discount_percent numeric(7,3) not null default 0,
  discount_until date, status text not null, due_date date, points int, prescription_eligible boolean not null default false, notes text
);
create table public.incidents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  type text not null check(type in ('Accidente','Robo')), date date not null, place text, description text, responsible text, insurance text,
  total_cost numeric(14,2) not null default 0, recognized numeric(14,2) not null default 0, paid_by_user numeric(14,2) not null default 0, paid_by_third_party numeric(14,2) not null default 0,
  affected_people text, status text, reference text, account_id uuid references public.accounts(id) on delete set null, notes text
);

create table public.work_sessions (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  date date not null, start_time time not null, end_time time not null, hours numeric(8,2) not null default 0, apps text[] not null default '{}', km numeric(10,2) not null default 0, trips int not null default 0,
  gross numeric(14,2) not null default 0, commission numeric(14,2) not null default 0, bonuses numeric(14,2) not null default 0, fuel_cost numeric(14,2) not null default 0, other_cost numeric(14,2) not null default 0,
  account_id uuid references public.accounts(id) on delete set null, fuel_accounting text not null default 'Jornada' check(fuel_accounting in ('Jornada','Abastecimientos','Mixto')), notes text, created_at timestamptz not null default now()
);
create table public.platforms (
  id uuid primary key default gen_random_uuid(), user_id uuid references public.profiles(id) on delete cascade, name text not null, default_commission numeric(7,4) default 0, active boolean default true, unique(user_id,name)
);
create table public.work_session_platforms (
  work_session_id uuid not null references public.work_sessions(id) on delete cascade, platform_id uuid not null references public.platforms(id) on delete restrict, gross numeric(14,2) not null default 0, commission numeric(14,2) not null default 0, trips int not null default 0,
  primary key(work_session_id,platform_id)
);
create table public.bonuses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, work_session_id uuid references public.work_sessions(id) on delete cascade,
  platform_id uuid references public.platforms(id) on delete set null, name text not null, target numeric(12,2), achieved numeric(12,2), amount numeric(14,2) not null default 0, date date not null, status text not null
);

create table public.fuel_stops (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  work_session_id uuid references public.work_sessions(id) on delete set null, account_id uuid references public.accounts(id) on delete set null,
  date date not null, odometer numeric(12,1) not null, station text, total numeric(14,2) not null default 0, notes text
);
create table public.fuel_items (
  id uuid primary key default gen_random_uuid(), fuel_stop_id uuid not null references public.fuel_stops(id) on delete cascade, fuel text not null, amount numeric(14,2) not null default 0,
  price_per_unit numeric(12,4) not null default 0, quantity numeric(12,4) not null default 0, total numeric(14,2) not null default 0
);
create table public.fuel_payments (
  id uuid primary key default gen_random_uuid(), fuel_stop_id uuid not null references public.fuel_stops(id) on delete cascade, method text not null, amount numeric(14,2) not null default 0
);

create table public.maintenance (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  work_session_id uuid references public.work_sessions(id) on delete set null, account_id uuid references public.accounts(id) on delete set null,
  type text not null, service text not null, date date not null, km numeric(12,1) not null, parts_cost numeric(14,2) not null default 0, labor_cost numeric(14,2) not null default 0,
  performed_by text, interval_months int, interval_km numeric(12,1), next_date date, next_km numeric(12,1), source text, status text, notes text
);

create table public.borrowers (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, name text not null, document text, phone text, notes text, active boolean not null default true
);
create table public.loans (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, borrower_id uuid not null references public.borrowers(id) on delete restrict,
  principal numeric(14,2) not null check(principal>0), balance numeric(14,2) not null default 0, rate numeric(9,6) not null default 0,
  frequency public.frequency not null, term int not null check(term>0), installment numeric(14,2) not null default 0, total_scheduled numeric(14,2) not null default 0, recovered numeric(14,2) not null default 0, interest_recovered numeric(14,2) not null default 0,
  next_payment date, status text not null, start_date date not null, account_id uuid references public.accounts(id) on delete set null, notes text
);
create table public.loan_payments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, loan_id uuid not null references public.loans(id) on delete cascade,
  date date not null, amount numeric(14,2) not null, principal numeric(14,2) not null default 0, interest numeric(14,2) not null default 0, late_fee numeric(14,2) not null default 0,
  status public.record_status not null default 'Confirmado', unique(loan_id,date,id)
);

create table public.debts (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, lender text not null, product text not null,
  principal numeric(14,2) not null, balance numeric(14,2) not null, annual_rate numeric(9,6) not null default 0, tea numeric(9,4), tcea numeric(9,4), installment numeric(14,2) not null default 0,
  frequency public.frequency not null, term int not null, desgravamen numeric(9,5) not null default 0, fees numeric(14,2) not null default 0,
  next_payment date, start_date date not null, final_date date, account_id uuid references public.accounts(id) on delete set null, status text not null
);
create table public.debt_payments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, debt_id uuid not null references public.debts(id) on delete cascade,
  date date not null, amount numeric(14,2) not null, principal numeric(14,2) not null default 0, interest numeric(14,2) not null default 0, insurance numeric(14,2) not null default 0, fees numeric(14,2) not null default 0,
  status public.record_status not null default 'Confirmado'
);

create table public.cards (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, bank text not null, product text not null, last4 char(4) not null,
  currency char(3) not null default 'PEN' check(currency in ('PEN','USD')), line numeric(14,2) not null, base_used numeric(14,2) not null default 0, closing_day smallint not null, payment_day smallint not null,
  tea numeric(9,4), tcea numeric(9,4), membership numeric(14,2) default 0, membership_exonerable boolean default false, desgravamen_percent numeric(9,5) default 0, status text not null
);
create table public.card_operations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, card_id uuid not null references public.cards(id) on delete cascade,
  date date not null, type text not null, purchase_mode text, installments int, current_installment int, concept text not null, amount numeric(14,2) not null, fee numeric(14,2) not null default 0,
  intermediary text, cash_received numeric(14,2), installment_amount numeric(14,2), statement_date date, account_id uuid references public.accounts(id) on delete set null, status public.record_status not null default 'Confirmado', notes text
);

create table public.goals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, name text not null, target numeric(14,2) not null,
  current_amount numeric(14,2) not null default 0, deadline date, category text, frequency public.frequency, notes text
);
create table public.goal_movements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, goal_id uuid not null references public.goals(id) on delete cascade,
  date date not null, type text not null check(type in ('Aporte','Retiro')), amount numeric(14,2) not null check(amount>0), account_id uuid references public.accounts(id) on delete set null,
  status public.record_status not null default 'Confirmado', notes text
);
create table public.budgets (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, name text not null, limit_amount numeric(14,2) not null,
  category_id uuid references public.categories(id) on delete set null, period text not null check(period in ('Semanal','Mensual','Anual')), active boolean not null default true
);

create table public.transfers (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, date date not null,
  from_account_id uuid not null references public.accounts(id) on delete restrict, to_account_id uuid not null references public.accounts(id) on delete restrict,
  amount numeric(14,2) not null check(amount>0), fee numeric(14,2) not null default 0, status public.record_status not null default 'Confirmado', notes text,
  check(from_account_id<>to_account_id)
);


-- v50: vehicle improvements/tires, recurring obligations and investments.
alter table public.debts add column if not exists vehicle_id uuid references public.vehicles(id) on delete set null;

create table if not exists public.vehicle_improvements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade, date date not null,
  type text not null, description text not null, amount numeric(14,2) not null check(amount>=0),
  account_id uuid references public.accounts(id) on delete set null, useful_life_months int, notes text
);
create index if not exists idx_vehicle_improvements_user_vehicle on public.vehicle_improvements(user_id,vehicle_id,date desc);

create table if not exists public.tire_records (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade, brand text not null, model text not null,
  size text not null, date date not null, odometer int not null check(odometer>=0), price numeric(14,2) not null check(price>=0),
  position text not null, account_id uuid references public.accounts(id) on delete set null, estimated_life_km int, puncture_repair boolean not null default false, repair_cost numeric(14,2) not null default 0,
  status text not null, notes text
);
create index if not exists idx_tire_records_user_vehicle on public.tire_records(user_id,vehicle_id,date desc);

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, category_id uuid references public.categories(id) on delete set null, amount numeric(14,2) not null check(amount>=0),
  frequency public.frequency not null, start_date date not null, next_date date not null, end_date date,
  method text, account_id uuid references public.accounts(id) on delete set null, active boolean not null default true, notes text
);
create index if not exists idx_recurring_expenses_user_next on public.recurring_expenses(user_id,next_date);

create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, type text not null, currency char(3) not null default 'PEN' check(currency in ('PEN','USD')), contributed numeric(14,2) not null default 0 check(contributed>=0),
  current_value numeric(14,2) not null default 0 check(current_value>=0), date date not null, account_id uuid references public.accounts(id) on delete set null, notes text
);
create table if not exists public.investment_movements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  investment_id uuid not null references public.investments(id) on delete cascade, date date not null,
  type text not null check(type in ('Aporte','Retiro','Rendimiento')), amount numeric(14,2) not null check(amount>0),
  account_id uuid references public.accounts(id) on delete set null, status public.record_status not null default 'Confirmado', notes text
);
create index if not exists idx_investment_movements_user_date on public.investment_movements(user_id,date desc);

-- Single financial ledger: every cash/P&L event points to its business source. Capital movements never become P&L.
create table public.financial_movements (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null, type public.movement_type not null, concept text not null, category_id uuid references public.categories(id) on delete set null,
  account_id uuid references public.accounts(id) on delete set null, method text, amount numeric(14,2) not null check(amount>=0),
  currency char(3) not null default 'PEN' check(currency in ('PEN','USD')),
  affects_cash boolean not null default true, affects_pnl boolean not null default true, capital_effect numeric(14,2) not null default 0,
  source_type public.source_type not null default 'manual', source_id uuid, linked_work_session_id uuid references public.work_sessions(id) on delete set null,
  status public.record_status not null default 'Confirmado', notes text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index idx_financial_movements_user_date on public.financial_movements(user_id,date desc);
create index idx_financial_movements_source on public.financial_movements(user_id,source_type,source_id);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, created_at timestamptz not null default now(),
  action public.audit_action not null, entity text not null, entity_id uuid, summary text not null, metadata jsonb not null default '{}'::jsonb
);

-- Helpful integrity constraints.
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger accounts_updated before update on public.accounts for each row execute function public.touch_updated_at();
create trigger movements_updated before update on public.financial_movements for each row execute function public.touch_updated_at();

-- Tenant integrity: RLS alone is not enough for child inserts.
-- These triggers prevent a user from referencing another user's parent record.
create or replace function public.assert_parent_same_user() returns trigger language plpgsql security definer set search_path=public as $$
declare parent_user uuid; parent_table text := TG_ARGV[0]; parent_id uuid := (to_jsonb(new)->>TG_ARGV[1])::uuid;
begin
  if parent_id is null then return new; end if;
  execute format('select user_id from public.%I where id=$1', parent_table) into parent_user using parent_id;
  if parent_user is null or parent_user <> new.user_id then
    raise exception 'cross-tenant reference blocked: %.%', parent_table, TG_ARGV[1];
  end if;
  return new;
end $$;

create trigger loan_payments_owner before insert or update on public.loan_payments for each row execute function public.assert_parent_same_user('loans','loan_id');
create trigger debt_payments_owner before insert or update on public.debt_payments for each row execute function public.assert_parent_same_user('debts','debt_id');
create trigger card_operations_owner before insert or update on public.card_operations for each row execute function public.assert_parent_same_user('cards','card_id');
create trigger goal_movements_owner before insert or update on public.goal_movements for each row execute function public.assert_parent_same_user('goals','goal_id');
create trigger bonuses_owner before insert or update on public.bonuses for each row execute function public.assert_parent_same_user('work_sessions','work_session_id');
create trigger fuel_stops_account_owner before insert or update on public.fuel_stops for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger maintenance_account_owner before insert or update on public.maintenance for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger insurance_account_owner before insert or update on public.insurances for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger incident_account_owner before insert or update on public.incidents for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger loan_account_owner before insert or update on public.loans for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger debt_account_owner before insert or update on public.debts for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger card_operation_account_owner before insert or update on public.card_operations for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger recurring_account_owner before insert or update on public.recurring_expenses for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger improvement_account_owner before insert or update on public.vehicle_improvements for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger investment_account_owner before insert or update on public.investments for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger investment_movement_account_owner before insert or update on public.investment_movements for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger investment_movement_investment_owner before insert or update on public.investment_movements for each row execute function public.assert_parent_same_user('investments','investment_id');
create trigger movement_account_owner before insert or update on public.financial_movements for each row execute function public.assert_parent_same_user('accounts','account_id');

-- RLS: user can only see/mutate their own records.
alter table public.profiles enable row level security;
create policy profiles_self on public.profiles for all using(id=auth.uid()) with check(id=auth.uid());

do $$ declare t text; begin
  foreach t in array array['accounts','categories','vehicles','vehicle_documents','insurances','fines','incidents','work_sessions','platforms','bonuses','fuel_stops','maintenance','borrowers','loans','loan_payments','debts','debt_payments','cards','card_operations','goals','goal_movements','budgets','transfers','financial_movements','audit_log','vehicle_improvements','tire_records','recurring_expenses','investments','investment_movements'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('create policy %I_own on public.%I for all using (user_id=auth.uid()) with check (user_id=auth.uid())',t,t);
  end loop;
end $$;

-- Child tables without user_id inherit tenant ownership from their parent.
alter table public.work_session_platforms enable row level security;
create policy work_session_platforms_own on public.work_session_platforms for all
  using (exists (select 1 from public.work_sessions w where w.id=work_session_id and w.user_id=auth.uid()))
  with check (exists (select 1 from public.work_sessions w where w.id=work_session_id and w.user_id=auth.uid()));
alter table public.fuel_items enable row level security;
create policy fuel_items_own on public.fuel_items for all
  using (exists (select 1 from public.fuel_stops f where f.id=fuel_stop_id and f.user_id=auth.uid()))
  with check (exists (select 1 from public.fuel_stops f where f.id=fuel_stop_id and f.user_id=auth.uid()));
alter table public.fuel_payments enable row level security;
create policy fuel_payments_own on public.fuel_payments for all
  using (exists (select 1 from public.fuel_stops f where f.id=fuel_stop_id and f.user_id=auth.uid()))
  with check (exists (select 1 from public.fuel_stops f where f.id=fuel_stop_id and f.user_id=auth.uid()));

-- Cross-tenant parent checks for the main child relationships.
create trigger vehicle_documents_owner before insert or update on public.vehicle_documents for each row execute function public.assert_parent_same_user('vehicles','vehicle_id');
create trigger insurance_vehicle_owner before insert or update on public.insurances for each row execute function public.assert_parent_same_user('vehicles','vehicle_id');
create trigger fine_vehicle_owner before insert or update on public.fines for each row execute function public.assert_parent_same_user('vehicles','vehicle_id');
create trigger fine_account_owner before insert or update on public.fines for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger tire_account_owner before insert or update on public.tire_records for each row execute function public.assert_parent_same_user('accounts','account_id');
create trigger tire_vehicle_owner before insert or update on public.tire_records for each row execute function public.assert_parent_same_user('vehicles','vehicle_id');
create trigger incident_vehicle_owner before insert or update on public.incidents for each row execute function public.assert_parent_same_user('vehicles','vehicle_id');
create trigger fuel_vehicle_owner before insert or update on public.fuel_stops for each row execute function public.assert_parent_same_user('vehicles','vehicle_id');
create trigger fuel_work_owner before insert or update on public.fuel_stops for each row execute function public.assert_parent_same_user('work_sessions','work_session_id');
create trigger maintenance_vehicle_owner before insert or update on public.maintenance for each row execute function public.assert_parent_same_user('vehicles','vehicle_id');
create trigger maintenance_work_owner before insert or update on public.maintenance for each row execute function public.assert_parent_same_user('work_sessions','work_session_id');
create trigger work_vehicle_owner before insert or update on public.work_sessions for each row execute function public.assert_parent_same_user('vehicles','vehicle_id');
create trigger loan_borrower_owner before insert or update on public.loans for each row execute function public.assert_parent_same_user('borrowers','borrower_id');
create trigger debt_vehicle_owner before insert or update on public.debts for each row execute function public.assert_parent_same_user('vehicles','vehicle_id');
create trigger transfer_from_account_owner before insert or update on public.transfers for each row execute function public.assert_parent_same_user('accounts','from_account_id');
create trigger transfer_to_account_owner before insert or update on public.transfers for each row execute function public.assert_parent_same_user('accounts','to_account_id');
create trigger movement_category_owner before insert or update on public.financial_movements for each row execute function public.assert_parent_same_user('categories','category_id');
create trigger recurring_category_owner before insert or update on public.recurring_expenses for each row execute function public.assert_parent_same_user('categories','category_id');

-- The application should use RPC/transactions for money-changing actions in production.
-- In particular: register_loan_payment, reverse_loan_payment, register_debt_payment,
-- reverse_debt_payment, register_card_operation, reverse_card_operation and transfer_funds.

-- Create a private profile automatically when Auth creates a user.
create or replace function public.handle_new_auth_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name',new.email)) on conflict(id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_auth_user();
