import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const sql = fs.readFileSync(path.join(root, 'supabase/006_write_boundary.sql'), 'utf8');
const rpc = fs.readFileSync(path.join(root, 'supabase/002_money_rpc.sql'), 'utf8');
const goal = fs.readFileSync(path.join(root, 'supabase/003_goal_investment_rpc.sql'), 'utf8');
const origin = fs.readFileSync(path.join(root, 'supabase/005_originations_rpc.sql'), 'utf8');

const requiredTables = [
  'financial_movements', 'audit_log', 'transfers', 'card_operations',
  'loan_payments', 'debt_payments', 'goal_movements', 'investment_movements',
  'loans', 'debts'
];
for (const table of requiredTables) {
  const pattern = new RegExp(`revoke\\s+insert,\\s*update,\\s*delete,\\s*truncate,\\s*references,\\s*trigger\\s+on\\s+public\\.${table}\\s+from\\s+authenticated,\\s*anon`, 'is');
  if (!pattern.test(sql)) throw new Error(`Missing write boundary for ${table}`);
}

if (!/revoke all on public\.rpc_idempotency_keys from authenticated, anon/i.test(sql)) {
  throw new Error('Idempotency table must remain private');
}

for (const [name, text] of [['money RPC', rpc], ['goal/investment RPC', goal], ['origination RPC', origin]]) {
  if (!/security definer/i.test(text)) throw new Error(`${name} must use SECURITY DEFINER`);
}

console.log('FINANZAS 360 DB security boundary: OK (direct client writes blocked for ledger and money-changing tables)');
