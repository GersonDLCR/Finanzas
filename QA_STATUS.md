# QA Status — FINANZAS 360 v78

## Checks automatizados
- Logic smoke: OK
- Source syntax: OK (50 TS/TSX)
- Import contract: OK (63 source files)
- Security source scan: OK
- DB security boundary: OK
- DB structural SQL test contract: OK
- Predeploy contract: OK
- Finance regressions: OK

## Cambios validados en v62
- Las operaciones de tarjeta requieren cuenta financiera activa y la cuenta debe usar la misma moneda de la tarjeta.
- El selector de cuenta de tarjeta se filtra por PEN/USD según la tarjeta elegida.
- El abastecimiento de combustible exige cuenta financiera para que el gasto tenga origen contable explícito.
- Supabase añade ownership cruzado para `tire_records.vehicle_id` e `investment_movements.investment_id`.
- La hardening migration evita errores por constraints duplicadas al reaplicarse.
- Se añadió una capa RPC transaccional para transferencias, operaciones/reversiones de tarjetas, cobros/reversiones de préstamos y pagos/reversiones de deudas, con autenticación, locks e idempotencia por UUID.

## Pendiente antes de release
- `npm ci`, `npm run lint` y `npm run build`: se dejan para la máquina local antes del despliegue, fuera del alcance de este bloque.
- QA visual desktop/mobile en navegador real.
- CRUD/persistencia interactiva desde navegador.
- Revisión final de UX en todos los módulos.
- QA visual desktop/mobile en navegador real y revisión manual final de todos los módulos.
- Preparación final del primer push a GitHub.
- Supabase/RLS/RPC, autenticación real y aislamiento por usuario: se realizarán después de subir la demo a GitHub.

**Regla:** no declarar listo para GitHub/Vercel hasta superar todos los gates anteriores.


### Latest functional review block
- Finanzas dejó de mezclar PEN y USD en sus analíticas; USD se presenta como actividad separada.
- Saldos y movimientos muestran la moneda de cada registro.
- Simulador de tarjetas dejó de asumir S/ en sus campos y sigue la moneda de la tarjeta.
- Corregido el resumen de moneda al eliminar un préstamo.

### Latest UI/UX block
- Dashboard reorganizado para priorizar liquidez, flujo, deuda, patrimonio y señales accionables.
- Añadido pulso financiero con tasa de ahorro, deuda/ingreso, utilización de tarjetas y cuentas por cobrar.
- Añadido panel de decisiones rápidas conectado a los módulos correspondientes.
- Responsive del dashboard reforzado para 1100px, 700px y 430px.

### Latest DB block
- Transactional RPC coverage extended to goals and investments.
- Origination RPC coverage added for loans and debts, including optional historical debt disbursement handling.
- Direct client writes to the financial ledger and protected money-command tables are now blocked by migration 006.
- Added `supabase/DB_RUNTIME_TEST_PLAN.md` with the minimum Supabase validation suite; runtime execution remains intentionally deferred until Supabase is provisioned.
- Strong idempotency conflict detection is covered by a dedicated migration and static contract check.
- Static DB/RPC/origination contract checks pass after the new layer.
- PostgreSQL runtime certification is still pending and is intentionally deferred until Supabase/PostgreSQL is provisioned.


### v71 — UI/UX Tarjetas
- UI/UX de Tarjetas reforzada: separación PEN/USD, spacing, cierre/pago y simulador por moneda.
- Contratos estáticos: OK.
- QA visual de navegador: pendiente.
- lint/build: pendientes de certificación por limitación de instalación de dependencias del entorno.


### v72 — UI/UX Préstamos y Deudas
- Indicadores principales separados por PEN/USD para evitar sumas de monedas incompatibles.
- Importes de préstamos/deudas, cobros y pagos muestran la moneda derivada de su cuenta.
- Spacing y controles de tablas/simuladores reforzados para desktop, tablet y móvil.
- Contratos y regresiones automatizadas: OK.
- QA visual de navegador, lint/build y persistencia interactiva: pendientes.

### v73 — UI/UX Vehículos
- Centro operativo del vehículo reforzado con indicadores de patrimonio, costos y riesgos.
- Se distingue costo operativo de capital adicional (mejoras y neumáticos).
- Riesgos pendientes incorporan documentación y seguros vencidos.
- Responsive y spacing reforzados para tablas, tarjetas, acciones y timeline.
- Contratos automatizados: pendientes de ejecutar en este bloque; deberán pasar antes de continuar a release.
- QA visual de navegador, lint/build y persistencia interactiva: pendientes.

### v74 — UI/UX Planificación, Metas e Inversiones
- Presupuesto: periodos semanal/mensual/anual ahora forman parte real de la UI y de la comparación de gasto.
- Presupuesto: estado activo/pausado editable y visible; filtros de alertas/control/pausadas.
- Metas: el saldo acumulado deja de editarse directamente en una meta existente; se conserva mediante movimientos.
- Metas: historial de aportes/retiros y reversión conectados al store demo.
- Inversiones: añadidos movimientos de Aporte, Retiro y Rendimiento, con validación de cuenta/moneda/liquidez en el store.
- Inversiones: historial y reversión de movimientos disponibles desde Patrimonio.
- Contratos automatizados: OK (`npm run check:all`).
- QA visual de navegador: pendiente.
- lint/build: pendientes de certificación por la limitación de instalación de dependencias del entorno.
- CRUD/persistencia interactiva en navegador: pendiente.
- Runtime real de Supabase/RLS/RPC: pendiente e intencionalmente NO ejecutar todavía.


## v75 — Reportes
- UI de reportes reforzada con capital/liquidez, inversiones y progreso de metas.
- Mantenimiento histórico respeta el rango seleccionado.
- Crédito presentado por moneda.
- Pendiente: lint/build, QA visual real y pruebas E2E/persistencia en navegador.


### v76 — Calendario, alertas y navegación contextual
- `npm run check:all`: OK.
- Reportes: eliminado uso de `Goal.currency`, que no existe en el modelo actual.
- Calendario: eventos con `sourceId` pueden abrir el registro correspondiente.
- Alertas: acciones de revisión abren el origen en lugar de un modal de texto genérico.
- Moneda: calendario y alertas muestran PEN/USD sin sumar importes entre monedas.
- QA visual de navegador: pendiente.
- lint/build: pendientes de certificación por falta de `node_modules` en el entorno.
- CRUD/persistencia interactiva en navegador: pendiente.
- Runtime real de Supabase/RLS/RPC: pendiente e intencionalmente NO ejecutar todavía.


## v77 — Preparación de demo para GitHub
- Inversiones: el capital/valor ya no se editan directamente desde la ficha existente; se gestionan mediante movimientos.
- Inversiones nuevas comienzan en cero y requieren un movimiento de Aporte para registrar capital.
- Presupuesto: control PEN explícito para evitar mezclar monedas durante la etapa demo.
- README y `GITHUB_READINESS.md` actualizados para documentar el alcance de la demo.
- Revisión estática de secretos/credenciales: sin claves privadas ni marcadores de service role encontrados.
- Source syntax, import contract y security source scan: OK.

### Alcance acordado
Esta fase termina con la demo lista para revisión y subida a GitHub. No se bloquea el avance esperando npm/Supabase. La siguiente fase será Supabase + autenticación real + persistencia multiusuario.
