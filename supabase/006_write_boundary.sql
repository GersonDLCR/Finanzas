-- FINANZAS 360 - Financial write boundary
-- Apply after 005_originations_rpc.sql.
-- Goal: authenticated clients may READ financial history, but may not bypass
-- transactional RPCs by writing ledger/operation tables directly.

-- The ledger and audit trail are append-only from the application perspective.
-- SECURITY DEFINER RPCs continue to work because they execute with the function
-- owner's privileges. The browser receives only SELECT on these tables.
revoke insert, update, delete, truncate, references, trigger
  on public.financial_movements from authenticated, anon;
revoke insert, update, delete, truncate, references, trigger
  on public.audit_log from authenticated, anon;

-- These tables represent money-changing commands whose side effects must stay
-- atomic with their ledger/audit records. Future edits/reversals should be
-- exposed as explicit RPCs rather than row-by-row client mutations.
revoke insert, update, delete, truncate, references, trigger
  on public.transfers from authenticated, anon;
revoke insert, update, delete, truncate, references, trigger
  on public.card_operations from authenticated, anon;
revoke insert, update, delete, truncate, references, trigger
  on public.loan_payments from authenticated, anon;
revoke insert, update, delete, truncate, references, trigger
  on public.debt_payments from authenticated, anon;
revoke insert, update, delete, truncate, references, trigger
  on public.goal_movements from authenticated, anon;
revoke insert, update, delete, truncate, references, trigger
  on public.investment_movements from authenticated, anon;
revoke insert, update, delete, truncate, references, trigger
  on public.loans from authenticated, anon;
revoke insert, update, delete, truncate, references, trigger
  on public.debts from authenticated, anon;

-- Idempotency keys are private implementation state. Keep them completely
-- inaccessible to clients; the SECURITY DEFINER helper owns the table writes.
revoke all on public.rpc_idempotency_keys from authenticated, anon;

-- Explicitly document the intended client surface: reads are allowed through
-- RLS policies; writes happen through authenticated RPCs only.
