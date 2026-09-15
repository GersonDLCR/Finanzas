-- FINANZAS 360 - relationship hardening v79
-- Apply after 006_write_boundary.sql.
-- Closes cross-tenant relationship gaps that RLS alone does not prevent.

create or replace function public.assert_platform_same_work_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare work_user uuid; platform_user uuid;
begin
  select user_id into work_user from public.work_sessions where id=new.work_session_id;
  select user_id into platform_user from public.platforms where id=new.platform_id;
  if work_user is null or platform_user is null or work_user <> platform_user then
    raise exception 'cross-tenant platform/work-session reference blocked';
  end if;
  return new;
end $$;

create or replace function public.assert_platform_same_bonus_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare bonus_user uuid; platform_user uuid;
begin
  if new.platform_id is null then return new; end if;
  bonus_user:=new.user_id;
  select user_id into platform_user from public.platforms where id=new.platform_id;
  if platform_user is null or platform_user <> bonus_user then
    raise exception 'cross-tenant platform/bonus reference blocked';
  end if;
  return new;
end $$;

create or replace function public.assert_category_parent_same_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare parent_user uuid;
begin
  if new.parent_id is null then return new; end if;
  select user_id into parent_user from public.categories where id=new.parent_id;
  if parent_user is null or parent_user <> new.user_id then
    raise exception 'cross-tenant category parent blocked';
  end if;
  return new;
end $$;

create or replace function public.assert_budget_category_same_user() returns trigger
language plpgsql security definer set search_path=public as $$
declare category_user uuid;
begin
  if new.category_id is null then return new; end if;
  select user_id into category_user from public.categories where id=new.category_id;
  if category_user is null or category_user <> new.user_id then
    raise exception 'cross-tenant budget/category reference blocked';
  end if;
  return new;
end $$;

drop trigger if exists work_session_platform_owner on public.work_session_platforms;
create trigger work_session_platform_owner
before insert or update on public.work_session_platforms
for each row execute function public.assert_platform_same_work_user();

drop trigger if exists bonus_platform_owner on public.bonuses;
create trigger bonus_platform_owner
before insert or update on public.bonuses
for each row execute function public.assert_platform_same_bonus_user();

drop trigger if exists category_parent_owner on public.categories;
create trigger category_parent_owner
before insert or update on public.categories
for each row execute function public.assert_category_parent_same_user();

drop trigger if exists budget_category_owner on public.budgets;
create trigger budget_category_owner
before insert or update on public.budgets
for each row execute function public.assert_budget_category_same_user();

revoke all on function public.assert_platform_same_work_user() from public;
revoke all on function public.assert_platform_same_bonus_user() from public;
revoke all on function public.assert_category_parent_same_user() from public;
revoke all on function public.assert_budget_category_same_user() from public;
