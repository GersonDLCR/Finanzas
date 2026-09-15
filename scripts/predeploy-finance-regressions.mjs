import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const domain = readFileSync('lib/finance/domain.ts','utf8');
const store = readFileSync('lib/use-finance-store.ts','utf8');
const planning = readFileSync('components/planning.tsx','utf8');

assert.match(domain, /currency,status:d<today/);
assert.match(domain, /for\(const r of args\.recurringExpenses\.filter\(x=>x\.active\)\) out\.push\(\.\.\.recurringDates\(r,end,currencyOf\(r\.accountId\)\)/);
assert.match(store, /accountId:gm\.accountId,affectsCash:false/);
assert.match(planning, /money\(i\.currentValue,i\.currency\)/);
assert.match(planning, /money\(i\.currentValue-i\.contributed,i\.currency\)/);
assert.match(store, /account\.currency!==card\.currency/);
assert.match(store, /const account=accountBalances\.find/);
const schema = readFileSync('supabase/schema.sql','utf8');
assert.match(schema, /tire_vehicle_owner/);
assert.match(schema, /investment_movement_investment_owner/);

console.log('FINANZAS 360 finance regressions: OK');
