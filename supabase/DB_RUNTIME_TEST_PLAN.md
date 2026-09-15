# FINANZAS 360 — Plan mínimo de pruebas PostgreSQL/Supabase

La base se considera **estructuralmente preparada** cuando los contratos estáticos pasan y este plan queda listo para ejecutarse al provisionar Supabase. No se bloquea el desarrollo frontend por no tener todavía un proyecto Supabase real.

## 1. Migración limpia
1. Crear proyecto Supabase vacío.
2. Ejecutar `schema.sql`, `001`, `002`, `003`, `004`, `005`, `006` en ese orden.
3. Verificar que no existan errores de tipos, FK, triggers, RLS, funciones o privilegios.
4. Ejecutar `seed_finanzas_demo(auth.uid())` con un usuario de prueba.

## 2. Aislamiento RLS
Con dos usuarios A/B:
- A no puede SELECT/INSERT/UPDATE/DELETE sobre filas de B.
- Una FK de A no puede apuntar a una cuenta/vehículo/préstamo/etc. de B.
- `user_id` no puede cambiarse mediante UPDATE.
- Las tablas hijas sin `user_id` no permiten acceder a hijos de otro usuario.

## 3. Límite de escritura del cliente
Como usuario autenticado, intentar INSERT/UPDATE/DELETE directo en:
- `financial_movements`
- `audit_log`
- `transfers`
- `card_operations`
- `loan_payments`
- `debt_payments`
- `goal_movements`
- `investment_movements`
- `loans`
- `debts`

Resultado esperado: **permission denied**. Las lecturas continúan disponibles mediante RLS.

## 4. Atomicidad y rollback
Para cada RPC monetaria:
- provocar una validación fallida después de un lock;
- confirmar que no queda registro parcial;
- confirmar que tampoco queda clave de idempotencia huérfana;
- confirmar que el saldo y el ledger permanecen iguales al estado anterior.

## 5. Idempotencia
- Ejecutar la misma RPC dos veces con el mismo UUID y payload: debe producir un único efecto.
- Reutilizar el UUID con payload diferente: debe fallar con conflicto.
- Intentar reutilizar una clave perteneciente a otro usuario: debe fallar.

## 6. Moneda y liquidez
- Transferencia PEN→PEN válida.
- Transferencia PEN→USD rechazada.
- Pago de tarjeta con cuenta de moneda distinta rechazado.
- Aporte de inversión sin saldo suficiente rechazado.
- Pago de préstamo/deuda sin liquidez suficiente rechazado.

## 7. Reversiones
Para tarjeta, préstamo, deuda, meta e inversión:
- registrar;
- revertir una vez;
- revertir nuevamente (debe ser idempotente o no duplicar efecto);
- comprobar ledger, saldo, balance de la entidad y auditoría.

## 8. Concurrencia
Ejecutar dos pagos simultáneos sobre la misma cuenta/deuda/tarjeta:
- nunca permitir saldo negativo;
- nunca duplicar el efecto de un mismo UUID;
- el resultado final debe ser serializable y consistente.

## 9. Invariantes contables
Después de las pruebas:
- saldo de cuenta = opening balance + movimientos de caja confirmados;
- transferencias internas no alteran P&L;
- aportes/retiros de inversión no se convierten en ingreso/gasto de P&L;
- rendimientos afectan valor/P&L sin inventar caja;
- movimientos anulados no cuentan como caja confirmada.

## 10. Auditoría
Cada comando monetario debe dejar un evento de auditoría apropiado. `audit_log` no debe poder actualizarse ni eliminarse desde el cliente.
