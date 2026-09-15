# QA / Testing — FINANZAS 360 v57

## Estado
Frontend en modo demo/local. Supabase todavía NO está conectado.

### Checks automatizados disponibles
| Comando | Propósito | Estado en esta entrega |
|---|---|---|
| `npm run check:logic` | Reglas financieras y pronósticos | OK |
| `npm run check:source` | Sintaxis TS/TSX | OK — 50 archivos |
| `npm run check:predeploy` | Archivos/contrato/Git-Vercel | OK |
| `npm run lint` | ESLint | Pendiente: instalación npm incompleta en entorno de trabajo |
| `npm run build` | Build real de Next | Pendiente: instalación npm incompleta en entorno de trabajo |

## Matriz funcional mínima
- Dashboard: KPIs, periodo, saldos por moneda, pronóstico.
- Trabajo: múltiples jornadas, medianoche, rentabilidad, combustible.
- Finanzas: ingresos/gastos, cuentas, transferencias, filtros y persistencia.
- Tarjetas: compras directas/cuotas, pagos, simulador, saldo.
- Préstamos: interés simple sobre capital inicial, cuotas, pagos y reversión.
- Deudas: amortización, pagos, reversión y vínculo con vehículo.
- Vehículos: documentos, seguros, multas, incidentes, combustible, mantenimiento, mejoras y neumáticos.
- Planificación: presupuestos, metas y recurrentes.
- Patrimonio: activos, inversiones y deuda vinculada.
- Calendario/alertas: una sola fuente de eventos.
- Reportes/configuración: periodos, exportación/importación/reset y tema.

## Casos financieros críticos
1. Préstamo S/2,000 al 10% por 4 semanas → total S/2,200 y S/550 por cuota.
2. Pago parcial de deuda → principal/interest/insurance/fees cuadran.
3. Reversión → saldo y movimientos vuelven al estado anterior sin borrar trazabilidad.
4. Transferencia → rechazar saldo insuficiente y monedas distintas.
5. Vehículo con deuda vinculada → no duplicar deuda en patrimonio.
6. Compra en cuotas → calendario secuencial por ciclo.
7. Recurrencia mensual de fin de mes → no derivar fechas por bloques fijos de 30 días.
8. Pronóstico → incluir todas las obligaciones que caigan dentro del horizonte.
9. PEN/USD → mantener totales separados.

## DB/RPC contract tests
- `npm run check:db-rpc` verifies all transactional money RPCs exist, remain `SECURITY DEFINER`, use `auth.uid()`, use row locks, and do not expose private helper functions.
- PostgreSQL execution tests remain a separate certification gate because this environment does not provide a running Supabase/PostgreSQL instance. Before production connection, execute the RPC suite against a disposable Supabase/Postgres database with two users and verify rollback, idempotency, cross-tenant rejection, currency mismatch, insufficient funds, and concurrent payment scenarios.
