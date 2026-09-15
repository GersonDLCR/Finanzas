import fs from 'node:fs';

const sql = fs.readFileSync('supabase/007_relationship_hardening.sql','utf8');
for (const fn of [
  'assert_platform_same_work_user',
  'assert_platform_same_bonus_user',
  'assert_category_parent_same_user',
  'assert_budget_category_same_user',
]) {
  if (!sql.includes(`function public.${fn}()`)) throw new Error(`Missing relationship guard ${fn}`);
  if (!sql.includes(`revoke all on function public.${fn}()`)) throw new Error(`Relationship guard ${fn} must be private`);
}
for (const trigger of ['work_session_platform_owner','bonus_platform_owner','category_parent_owner','budget_category_owner']) {
  if (!sql.includes(`create trigger ${trigger}`)) throw new Error(`Missing relationship trigger ${trigger}`);
}
console.log('FINANZAS 360 DB relationship hardening contract: OK');
