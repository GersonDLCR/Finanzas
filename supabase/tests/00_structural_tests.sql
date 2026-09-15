-- FINANZAS 360 — structural PostgreSQL smoke tests
-- Run AFTER schema.sql + 001..006 in Supabase SQL Editor.
-- These tests do not require demo data or a second user.

do $$
declare
  required text[] := array[
    'profiles','accounts','categories','vehicles','vehicle_documents','insurances',
    'fines','incidents','work_sessions','platforms','work_session_platforms','bonuses',
    'fuel_stops','fuel_items','fuel_payments','maintenance','borrowers','loans',
    'loan_payments','debts','debt_payments','cards','card_operations','goals',
    'goal_movements','budgets','transfers','vehicle_improvements','tire_records',
    'recurring_expenses','investments','investment_movements','financial_movements','audit_log'
  ];
  t text;
  missing integer;
  rls_enabled boolean;
begin
  foreach t in array required loop
    if to_regclass('public.'||t) is null then
      raise exception 'STRUCTURAL TEST FAILED: missing table public.%', t;
    end if;
  end loop;

  select count(*) into missing
  from unnest(required) x(name)
  where not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=x.name and c.relrowsecurity
  );
  if missing <> 0 then
    raise exception 'STRUCTURAL TEST FAILED: % required tables do not have RLS enabled', missing;
  end if;

  select relrowsecurity into rls_enabled
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname='profiles';
  if not rls_enabled then raise exception 'STRUCTURAL TEST FAILED: profiles RLS disabled'; end if;

  if to_regprocedure('public.transfer_funds(uuid,date,uuid,uuid,numeric,numeric,text)') is null then
    raise exception 'STRUCTURAL TEST FAILED: transfer_funds missing';
  end if;
  if to_regprocedure('public.register_card_operation(uuid,uuid,date,text,text,integer,integer,text,numeric,numeric,text,numeric,numeric,date,uuid,text)') is null then
    raise exception 'STRUCTURAL TEST FAILED: register_card_operation missing';
  end if;
  if to_regprocedure('public.register_loan(uuid,uuid,numeric,numeric,public.frequency,integer,date,uuid,date,text)') is null then
    raise exception 'STRUCTURAL TEST FAILED: register_loan missing';
  end if;
  if to_regprocedure('public.register_debt(uuid,text,text,numeric,numeric,numeric,numeric,numeric,public.frequency,integer,numeric,numeric,date,uuid,date,date,text,boolean)') is null then
    raise exception 'STRUCTURAL TEST FAILED: register_debt missing';
  end if;
  if to_regprocedure('public.claim_rpc_idempotency(uuid,text,jsonb)') is null then
    raise exception 'STRUCTURAL TEST FAILED: claim_rpc_idempotency missing';
  end if;

  -- Relationship hardening guards cross-tenant parent references not covered by simple RLS.
  foreach t in array array['work_session_platform_owner','bonus_platform_owner','category_parent_owner','budget_category_owner'] loop
    if not exists (select 1 from pg_trigger tg join pg_class c on c.oid=tg.tgrelid where tg.tgname=t) then
      raise exception 'STRUCTURAL TEST FAILED: relationship trigger % missing', t;
    end if;
  end loop;

  -- The application roles must not be able to bypass the transactional ledger.
  foreach t in array array['financial_movements','audit_log','transfers','card_operations','loan_payments','debt_payments','goal_movements','investment_movements','loans','debts'] loop
    if has_table_privilege('authenticated','public.'||t,'INSERT') then
      raise exception 'STRUCTURAL TEST FAILED: authenticated still has INSERT on public.%', t;
    end if;
    if has_table_privilege('authenticated','public.'||t,'UPDATE') then
      raise exception 'STRUCTURAL TEST FAILED: authenticated still has UPDATE on public.%', t;
    end if;
    if has_table_privilege('authenticated','public.'||t,'DELETE') then
      raise exception 'STRUCTURAL TEST FAILED: authenticated still has DELETE on public.%', t;
    end if;
  end loop;

  if has_table_privilege('authenticated','public.rpc_idempotency_keys','SELECT')
     or has_table_privilege('authenticated','public.rpc_idempotency_keys','INSERT')
     or has_table_privilege('authenticated','public.rpc_idempotency_keys','UPDATE')
     or has_table_privilege('authenticated','public.rpc_idempotency_keys','DELETE') then
    raise exception 'STRUCTURAL TEST FAILED: authenticated can access rpc_idempotency_keys';
  end if;

  raise notice 'FINANZAS 360 STRUCTURAL TESTS: PASS';
end $$;
