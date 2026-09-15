# Supabase — fase final

Este proyecto **no conecta Supabase todavía**. Estos archivos definen el contrato para la última fase.

Orden recomendado:
1. Crear proyecto Supabase.
2. Ejecutar `schema.sql`.
3. Ejecutar `001_production_hardening.sql`.
4. Aplicar `002_money_rpc.sql`.
5. Aplicar `003_goal_investment_rpc.sql`.
6. Aplicar `004_rpc_idempotency.sql`.
7. Aplicar `005_originations_rpc.sql`.
8. Aplicar `006_write_boundary.sql`.
9. Configurar Google/Magic Link en Auth.
10. Migrar el adapter de `lib/finance/repository.ts` a Supabase.
11. Sustituir el proveedor local sin cambiar componentes ni reglas del dominio.
12. Ejecutar `seed.sql` solo para un usuario de prueba.
13. Ejecutar `tests/00_structural_tests.sql` y activar las pruebas RLS, concurrencia, rollback e idempotencia del `DB_RUNTIME_TEST_PLAN.md`.

`001_production_hardening.sql` endurece constraints monetarios, consistencia de moneda, ownership inmutable, auditoría append-only, cuentas obligatorias para operaciones de caja e índices de consulta. Debe aplicarse después de `schema.sql`.


## Orden de migraciones

1. `schema.sql` — contrato base.
2. `001_production_hardening.sql` — constraints, ownership, moneda, RLS complementaria e índices. La sección de constraints monetarias es repetible.
3. `002_money_rpc.sql` — superficie transaccional para operaciones que cambian dinero. El frontend futuro deberá llamar RPC/API server-side en lugar de encadenar INSERT/UPDATE desde el navegador.
4. `003_goal_investment_rpc.sql` — operaciones transaccionales de metas e inversiones.
5. `004_rpc_idempotency.sql` — idempotencia centralizada y conflictos de reutilización de claves.
6. `005_originations_rpc.sql` — originación transaccional de préstamos y deudas.
7. `006_write_boundary.sql` — bloquea escrituras directas del cliente sobre ledger y tablas monetarias; los cambios pasan por RPC.

### RPC protegidas

- `transfer_funds`
- `register_card_operation` / `reverse_card_operation`
- `register_loan_payment` / `reverse_loan_payment`
- `register_debt_payment` / `reverse_debt_payment`

Estas funciones validan `auth.uid()`, bloquean las filas financieras relevantes con `FOR UPDATE`, comprueban propiedad/moneda/liquidez y escriben el origen + libro financiero + auditoría dentro de la misma transacción.


## Idempotencia

`004_rpc_idempotency.sql` crea `rpc_idempotency_keys`. Cada RPC de registro de dinero reclama una clave UUID + scope + payload antes de modificar datos. Repetir exactamente la misma operación devuelve la misma clave; reutilizarla con otro payload produce un error de conflicto. `006_write_boundary.sql` evita que el cliente pueda saltarse esta protección escribiendo directamente las tablas monetarias. Esto evita dobles cargos/pagos por reintentos de red y evita aceptar silenciosamente una clave reutilizada para otra operación.


## Pruebas incluidas

`tests/00_structural_tests.sql` es un smoke test ejecutable en Supabase que verifica tablas, RLS, RPC críticas y el bloqueo de escrituras directas sobre el ledger/tablas monetarias. El `DB_RUNTIME_TEST_PLAN.md` contiene las pruebas de dos usuarios, concurrencia, rollback, idempotencia y reversiones.
