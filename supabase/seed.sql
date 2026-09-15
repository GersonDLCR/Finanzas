-- Optional demo seed for later. Execute only after a Supabase auth user exists.
-- Usage: select public.seed_finanzas_demo('<AUTH_USER_UUID>');
create or replace function public.seed_finanzas_demo(p_user_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare
  a_cash uuid; a_bank uuid; a_save uuid; v1 uuid; b1 uuid; loan1 uuid; goal1 uuid; card1 uuid;
begin
  if auth.uid() is null or auth.uid()<>p_user_id then raise exception 'Solo puedes inicializar tus propios datos'; end if;
  if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'El usuario de Auth no existe'; end if;
  insert into profiles(id,full_name,preferred_currency) values(p_user_id,'Usuario Demo','PEN') on conflict(id) do nothing;
  insert into accounts(user_id,name,type,currency,opening_balance) values(p_user_id,'Efectivo','Efectivo','PEN',1200) returning id into a_cash;
  insert into accounts(user_id,name,type,currency,opening_balance) values(p_user_id,'Cuenta principal','Cuenta bancaria','PEN',6800) returning id into a_bank;
  insert into accounts(user_id,name,type,currency,opening_balance) values(p_user_id,'Ahorro emergencia','Cuenta ahorro','PEN',5000) returning id into a_save;
  insert into vehicles(user_id,brand,model,version,year,plate,km,fuels,transmission,value,debt,inspection,health,soat_date,insurance_date) values(p_user_id,'Toyota','Corolla Cross','1.8 Hybrid',2024,'BHZ-421',38640,array['Gasolina','Electricidad'],'CVT',89000,42000,'Vigente',86,'2026-09-28','2026-12-15') returning id into v1;
  insert into borrowers(user_id,name,phone) values(p_user_id,'Juan Pérez','999111222') returning id into b1;
  insert into loans(user_id,borrower_id,principal,balance,rate,frequency,term,installment,total_scheduled,recovered,interest_recovered,next_payment,status,start_date) values(p_user_id,b1,2000,2000,.10,'Semanal',4,550,2200,0,0,'2026-09-15','Al día','2026-09-11') returning id into loan1;
  insert into goals(user_id,name,target,current_amount,deadline,category,frequency) values(p_user_id,'Fondo de emergencia',15000,8500,'2026-12-31','Seguridad','Mensual') returning id into goal1;
  insert into cards(user_id,bank,product,last4,line,base_used,closing_day,payment_day,tea,tcea,membership,membership_exonerable,desgravamen_percent,status) values(p_user_id,'BBVA','Visa Signature','4821',12000,2067.50,5,12,39.99,48.1,250,true,.35,'Activa') returning id into card1;
  insert into financial_movements(user_id,date,type,concept,amount,account_id,method,affects_cash,affects_pnl,source_type,status) values
    (p_user_id,'2026-09-05','Ingreso','Jornada Yango',310,a_bank,'Transferencia',true,true,'work','Confirmado'),
    (p_user_id,'2026-09-05','Gasto','Comisión aplicativo',62,a_bank,'Transferencia',true,true,'work','Confirmado'),
    (p_user_id,'2026-09-05','Gasto','Combustible laboral',75,a_cash,'Efectivo',true,true,'fuel','Confirmado'),
    (p_user_id,'2026-09-06','Gasto','Supermercado',280,a_bank,'Débito',true,true,'manual','Confirmado');
end $$;

-- Security: only the authenticated user may seed their own account.
revoke all on function public.seed_finanzas_demo(uuid) from public;
revoke all on function public.seed_finanzas_demo(uuid) from anon;
grant execute on function public.seed_finanzas_demo(uuid) to authenticated;
