import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sql = fs.readFileSync(path.join(root, 'supabase', '005_originations_rpc.sql'), 'utf8');
const schema = fs.readFileSync(path.join(root, 'supabase', 'schema.sql'), 'utf8');

const required = [
  'register_loan(',
  'register_debt(',
  'claim_rpc_idempotency(',
  "source_type,source_id,status,notes",
  "'loan_disbursement'",
  "'debt_disbursement'",
  "p_record_disbursement",
  "grant execute on function public.register_loan",
  "grant execute on function public.register_debt",
];
for (const token of required) {
  if (!sql.includes(token) && !schema.includes(token)) throw new Error(`missing DB origination contract token: ${token}`);
}
if (!schema.includes("'debt_disbursement'")) throw new Error('schema missing debt_disbursement source type');
console.log('FINANZAS 360 origination RPC contract: OK (loan/debt creation + cash effects)');
