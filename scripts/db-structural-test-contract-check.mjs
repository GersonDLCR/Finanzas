import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const file = path.join(root, 'supabase/tests/00_structural_tests.sql');
const sql = fs.readFileSync(file, 'utf8');
const tables = [
  'financial_movements','audit_log','transfers','card_operations','loan_payments',
  'debt_payments','goal_movements','investment_movements','loans','debts'
];
if (!/foreach\s+t\s+in\s+array\s+array\[/i.test(sql) || !/has_table_privilege\('authenticated','public\.'\|\|t,'INSERT'\)/i.test(sql)) {
  throw new Error('Structural SQL test must iterate protected tables and assert INSERT privileges');
}
for (const table of tables) {
  if (!sql.includes(`'${table}'`)) throw new Error(`Structural SQL test missing protected table ${table}`);
}
for (const fn of ['transfer_funds','register_card_operation','register_loan','register_debt','claim_rpc_idempotency']) {
  if (!sql.includes(`to_regprocedure('public.${fn}(`)) throw new Error(`Structural SQL test missing function assertion for ${fn}`);
}
if (!/c\.relrowsecurity/i.test(sql) || !/STRUCTURAL TESTS: PASS/i.test(sql)) throw new Error('Structural SQL test must verify RLS and expose a PASS notice');
console.log('FINANZAS 360 DB structural test contract: OK (schema/RLS/RPC/privilege assertions present)');
