# FINANZAS 360 — arquitectura v49

## Estado actual

- Frontend: Next.js App Router + React + TypeScript.
- Persistencia actual: `localStorage` con datos de prueba.
- Autenticación preparada: Supabase Auth (Google/Magic Link), sin conexión de base de datos todavía.
- Dominio financiero: `lib/finance/domain.ts`.
- Store/orquestación: `lib/use-finance-store.ts`.
- Repositorio intercambiable: `lib/finance/repository.ts`.
- Contrato PostgreSQL: `supabase/schema.sql`.

## Regla de dependencia

`UI → store → domain/repository → datos`

La UI no debe calcular reglas financieras críticas ni acceder directamente a Supabase.

## Fuentes de verdad

- Detalle de negocio: jornadas, combustible, mantenimiento, tarjetas, préstamos, deudas, metas, etc.
- `Movement`: vista transaccional financiera vinculada al origen.
- `LedgerEntry`: vista derivada para caja/P&L/capital.
- `FinancialAccount`: saldos de liquidez.
- `AuditEntry`: trazabilidad de acciones.

## Reglas de no duplicación

1. Cada origen financiero genera identificadores deterministas (`sourceType + sourceId`).
2. Editar reemplaza sus movimientos vinculados.
3. Eliminar un movimiento derivado lo anula; no rompe el historial del módulo origen.
4. Los pagos de tarjeta no vuelven a contabilizar la compra como gasto.
5. Capital de préstamo/deuda no se confunde con ingreso/gasto.
6. Aportes a metas virtuales no reducen liquidez; una cuenta de ahorro real se representa mediante transferencias.

## Dashboard vs Reportes

### Dashboard
Orientado a decisiones actuales: mes vigente, liquidez, flujo, deuda, tarjetas, cobros, alertas y acciones.

### Reportes
Orientado al histórico: 3/6/12 meses o todo el periodo, rentabilidad, eficiencia operativa, costos, deuda, exposición y tendencias.

## Supabase

No se conecta hasta que la UI y la lógica estén validadas con datos demo. El siguiente paso será sustituir el adapter local por un adapter Supabase, activar RLS y mover operaciones monetarias críticas a RPC/transacciones.

## v49 — cierre funcional

- Las operaciones monetarias usan cuentas explícitas cuando el origen las proporciona.
- Las transferencias validan cuenta origen/destino, moneda, importe y saldo.
- Los cargos de disposición/ruleteo separan liquidez recibida y comisión.
- Las compras en cuotas calculan `installmentAmount` de forma determinista.
- La integridad del conjunto se expone mediante `store.integrity`.
- Analítica reutilizable: `getPeriodReport`, `getVehicleProfitability`, `getCashForecast`.

## v50 — cobertura de dominio
- Se agregan contratos de repositorio para vehículos, mejoras, neumáticos, recurrentes, inversiones y sus movimientos.
- `FinanceMoneyCommands` reserva la frontera para operaciones transaccionales monetarias que en Supabase deberán ejecutarse con RPC/transaction.
- El pronóstico se calcula por fecha y no como una resta global de cuotas: cada evento modifica el saldo proyectado en su día.
- Una deuda vinculada a vehículo ya no duplica la resta patrimonial de la ficha del vehículo.
