# FINANZAS 360 — checklist de migración a Supabase

Esta lista es para la fase final. No se debe activar Supabase antes de completar las pruebas demo.

- [ ] Tipos TypeScript y columnas SQL tienen equivalencia 1:1.
- [ ] Fechas de demo, calendario y reportes no dependen de una fecha fija del código.
- [ ] Multi-moneda: PEN/USD no se suman sin política FX y cada operación conserva su moneda.
- [x] Tablas hijas sin `user_id` usan RLS mediante su padre.
- [x] FK entre registros del mismo usuario se valida también a nivel de trigger/RPC.
- [x] Todas las entidades de negocio tienen `user_id`.
- [x] Todas las relaciones tienen FK y política RLS.
- [x] Operaciones monetarias críticas usan transacción/RPC para el alcance actual.
- [ ] Transferencias son atómicas.
- [ ] Pago/reversión de préstamo son atómicos.
- [ ] Pago/reversión de deuda son atómicos.
- [ ] Operaciones de tarjeta y reversión son atómicas.
- [ ] No existen duplicados de ledger al editar.
- [ ] No existen duplicados de caja por combustible/mantenimiento/jornada.
- [ ] Importación de datos demo produce saldos reproducibles.
- [x] Auditoría se conserva y `audit_log` queda append-only.
- [ ] Auth + perfil + RLS se prueban con dos usuarios distintos.
- [ ] Un usuario no puede leer/modificar datos de otro.
- [ ] Backup/exportación se puede restaurar.


## Contrato congelado después de v54
- [ ] Calendario y alertas consumen el motor `financialEvents`.
- [ ] Forecast consume `cashForecastTimeline`.
- [ ] No se mezclan PEN/USD sin una política FX explícita.
- [ ] Inversiones no generan doble caja mientras no exista una transacción/transferencia explícita.
- [ ] El ledger es la fuente de verdad para caja y P&L.
- [x] Las acciones monetarias críticas quedan detrás de transacciones/RPC para el alcance actual.

## Decisiones que quedan congeladas antes de conectar
- [ ] Cada importe persistido debe llevar moneda en el modelo financiero; no convertir silenciosamente.
- [x] Las cuentas solo pueden transferir entre cuentas de la misma moneda en la primera versión; FX será una operación explícita posterior.
- [ ] Los movimientos históricos no se reescriben al cambiar tasas o datos actuales.
- [x] Las operaciones monetarias se escriben mediante comandos/RPC idempotentes para el alcance actual.
- [x] El cliente no puede escribir directamente el ledger ni las tablas monetarias protegidas; la escritura pasa por RPC.

## Hardening aplicado en v63
- [x] Constraints monetarios para tarjetas, préstamos, deudas y ledger.
- [x] Cuenta obligatoria para operaciones de caja críticas.
- [x] Validación de moneda cuenta/tarjeta/inversión/ledger.
- [x] Ownership `user_id` inmutable.
- [x] Índices de consultas frecuentes.
- [x] Trigger de aislamiento para neumáticos e inversiones.
- [x] Contrato estático `npm run check:db`.

## Pendiente antes de Supabase
- [ ] Validar `schema.sql + 001_production_hardening.sql` contra PostgreSQL/Supabase real.
- [x] Crear RPC transaccionales e idempotentes para operaciones monetarias del alcance actual.
- [x] Bloquear escrituras directas sobre ledger, auditoría y tablas de comandos monetarios.
- [ ] Pruebas RLS con dos usuarios.
- [ ] Pruebas de concurrencia y reversión.
