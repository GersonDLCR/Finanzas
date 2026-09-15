import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const files = [
  path.join(root,'supabase','002_money_rpc.sql'),
  path.join(root,'supabase','003_goal_investment_rpc.sql'),
  path.join(root,'supabase','004_rpc_idempotency.sql'),
];
const required = [
  'transfer_funds','register_card_operation','reverse_card_operation',
  'register_loan_payment','reverse_loan_payment','register_debt_payment','reverse_debt_payment',
  'register_goal_movement','reverse_goal_movement','register_investment_movement','reverse_investment_movement',
  'claim_rpc_idempotency',
];
const text = files.map(f=>fs.readFileSync(f,'utf8')).join('\n');
for (const fn of required) {
  const pattern = fn === 'claim_rpc_idempotency'
    ? /create function public\.claim_rpc_idempotency\b/i
    : new RegExp(`create or replace function public\\.${fn}\\b`,'i');
  if (!pattern.test(text)) throw new Error(`Missing RPC: ${fn}`);
}
const forbidden = [/grant execute on function public\.current_account_balance/i,/grant execute on function public\.rpc_audit/i];
for (const re of forbidden) if (re.test(text)) throw new Error(`Private helper exposed: ${re}`);
for (const token of ['auth.uid()','for update','security definer','set search_path=public','card operation requires an account','claim_rpc_idempotency','idempotency conflict']) {
  if (!text.toLowerCase().includes(token.toLowerCase())) throw new Error(`RPC hardening token missing: ${token}`);
}
console.log('FINANZAS 360 RPC contract: OK (money + goals + investments)');

const idempotentRegistrations = ['transfer_funds','register_card_operation','register_loan_payment','register_debt_payment','register_goal_movement','register_investment_movement'];
for (const fn of idempotentRegistrations) {
  const body = text.slice(text.indexOf(`create or replace function public.${fn}`));
  if (!body.includes('claim_rpc_idempotency')) throw new Error(`Idempotency guard missing: ${fn}`);
}
