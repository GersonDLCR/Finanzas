import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const schema = fs.readFileSync(path.join(root,'supabase','schema.sql'),'utf8');
const hardening = fs.readFileSync(path.join(root,'supabase','001_production_hardening.sql'),'utf8');
const rpc = fs.readFileSync(path.join(root,'supabase','002_money_rpc.sql'),'utf8');
const goalInvestmentRpc = fs.readFileSync(path.join(root,'supabase','003_goal_investment_rpc.sql'),'utf8');
const idempotency = fs.readFileSync(path.join(root,'supabase','004_rpc_idempotency.sql'),'utf8');
const checks = [
  ['profiles auth FK', /references auth\.users\(id\)/],
  ['financial ledger', /create table public\.financial_movements/],
  ['RLS loop', /alter table public\.%I enable row level security/],
  ['child RLS work', /work_session_platforms_own/],
  ['child RLS fuel items', /fuel_items_own/],
  ['tire ownership', /tire_vehicle_owner/],
  ['investment ownership', /investment_movement_investment_owner/],
  ['card currency hardening', /card_operation_currency_check/],
  ['transfer currency hardening', /transfer_currency_check/],
  ['immutable user ownership', /prevent_user_change/],
  ['audit append-only', /audit_append_only/],
  ['production RPC note', /register_card_operation \/ reverse_card_operation/],
  ['repeatable constraints', /ensure_check_constraint/],
  ['transfer RPC', /create or replace function public\.transfer_funds/],
  ['card write RPC', /create or replace function public\.register_card_operation/],
  ['card reversal RPC', /create or replace function public\.reverse_card_operation/],
  ['loan payment RPC', /create or replace function public\.register_loan_payment/],
  ['loan reversal RPC', /create or replace function public\.reverse_loan_payment/],
  ['debt payment RPC', /create or replace function public\.register_debt_payment/],
  ['debt reversal RPC', /create or replace function public\.reverse_debt_payment/],
  ['RPC row locking', /for update/],
  ['RPC authenticated grants', /grant execute on function public\.transfer_funds.*to authenticated/s],
];
for (const [name,re] of checks) {
  if (!re.test(schema+hardening+rpc+goalInvestmentRpc+idempotency)) throw new Error(`DB contract check failed: ${name}`);
}
const tableCount=(schema.match(/create table public\./g)||[]).length;
if(tableCount < 29) throw new Error(`Unexpected table count: ${tableCount}`);
console.log(`FINANZAS 360 DB contract: OK (${tableCount} base tables + production hardening + transactional RPC layer)`);
