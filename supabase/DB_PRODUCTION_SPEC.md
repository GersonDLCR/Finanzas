# FINANZAS 360 — especificación de base de datos para producción

## Objetivo
Cerrar el contrato PostgreSQL antes de conectar Supabase al frontend.

## Orden de aplicación
1. `schema.sql` — estructura base, tipos, FK, RLS y ownership.
2. `001_production_hardening.sql` — constraints, consistencia monetaria, ownership inmutable, auditoría e índices.
3. `seed.sql` — únicamente para un usuario autenticado de pruebas.
4. RPC transaccionales — antes de permitir operaciones monetarias desde el frontend.

## Reglas de oro
- Todo registro de negocio pertenece a un `user_id`.
- Las tablas hijas sin `user_id` heredan aislamiento mediante su padre.
- Una FK por sí sola no garantiza que el padre sea del mismo usuario; los triggers de ownership lo comprueban.
- `user_id` es inmutable después de crear el registro.
- `financial_movements` es el ledger central.
- Una operación monetaria no debe escribir dos veces el mismo efecto de caja.
- Una transferencia entre cuentas de la misma moneda no es ingreso ni gasto.
- Una compra con tarjeta no reduce caja; el pago de la tarjeta sí reduce caja.
- Las operaciones de dinero que afecten varios registros deben ejecutarse dentro de una transacción/RPC con control de concurrencia.
- `audit_log` es append-only.
- PEN y USD nunca se mezclan silenciosamente.

## Cuentas obligatorias
En producción, estas operaciones requieren cuenta de origen/destino:
- combustible
- tarjeta
- préstamos otorgados
- deudas

Las inversiones pueden mantener `account_id` opcional porque su valor actual no representa por sí solo un movimiento de caja; el movimiento de inversión será el que determine el efecto financiero explícito.

## Próximo bloque
La base estructural está endurecida, pero todavía falta crear y probar los RPC transaccionales. Esa será la siguiente tarea antes de conectar cualquier módulo del frontend a Supabase.


## Capa transaccional de dinero

La base de datos no debe depender de múltiples escrituras coordinadas por el cliente para cambiar saldos. `002_money_rpc.sql` centraliza las operaciones críticas en funciones `SECURITY DEFINER` expuestas únicamente a `authenticated`. Cada operación valida el tenant con `auth.uid()`, usa locks de fila, rechaza monedas incompatibles y deja trazabilidad en `financial_movements` y `audit_log`.

La idempotencia de escrituras críticas se basa en que el cliente futuro envíe un UUID de operación; si ese UUID ya existe para el usuario, la RPC devuelve el mismo identificador sin duplicar la operación.

## Transactional RPC coverage
The browser is not the write authority for multi-table monetary changes. The transactional layer now covers transfers, card operations/reversals, loan payments/reversals, debt payments/reversals, goal movements/reversals, and investment movements/reversals. Every RPC validates `auth.uid()`, locks the affected business rows where concurrency matters, and keeps source/ledger updates in the same transaction.

Goals remain virtual allocations and therefore do not alter account cash. Investment contributions/withdrawals alter cash and capital; investment returns alter investment value and P&L without pretending that cash was received until a real withdrawal is recorded.

## Origination RPC coverage
Loan creation is transactional: borrower ownership and account ownership are checked, account liquidity is locked, the loan schedule is initialized, the principal disbursement is written to the central ledger, and the action is audited atomically.

Debt creation is transactional as well. It always establishes the owning account and can optionally record the initial debt disbursement as a cash inflow through `p_record_disbursement=true`. Historical debt entries can therefore be created without fabricating a current cash inflow.
