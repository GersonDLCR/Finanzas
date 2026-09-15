-- FINANZAS 360 - Transactional RPC idempotency keys
-- Apply after 003_goal_investment_rpc.sql.
-- A reused UUID with a different payload is a hard conflict, never a silent replay.

create table if not exists public.rpc_idempotency_keys (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists rpc_idempotency_keys_user_scope_idx
  on public.rpc_idempotency_keys(user_id,scope,created_at desc);

revoke all on table public.rpc_idempotency_keys from anon, authenticated;

drop function if exists public.claim_rpc_idempotency(uuid,text,jsonb);
create function public.claim_rpc_idempotency(
  p_id uuid, p_scope text, p_payload jsonb
) returns boolean
language plpgsql security definer set search_path=public as $$
declare existing public.rpc_idempotency_keys;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if p_id is null or p_scope is null or btrim(p_scope)='' then raise exception 'invalid idempotency key'; end if;

  insert into public.rpc_idempotency_keys(id,user_id,scope,payload)
  values(p_id,auth.uid(),p_scope,coalesce(p_payload,'{}'::jsonb))
  on conflict (id) do nothing;

  if found then return true; end if;

  select * into existing
  from public.rpc_idempotency_keys
  where id=p_id
  for update;

  if existing.user_id<>auth.uid() then
    raise exception 'idempotency key already belongs to another user';
  end if;
  if existing.scope<>p_scope or existing.payload is distinct from coalesce(p_payload,'{}'::jsonb) then
    raise exception 'idempotency conflict: same key with different payload';
  end if;
  return false;
end $$;

revoke all on function public.claim_rpc_idempotency(uuid,text,jsonb) from public, anon, authenticated;
