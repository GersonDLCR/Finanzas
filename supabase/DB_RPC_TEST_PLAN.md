# FINANZAS 360 — Plan de pruebas PostgreSQL/Supabase

Este documento define las pruebas que deben ejecutarse cuando exista una instancia real de PostgreSQL/Supabase. Los checks `npm run check:all` validan el contrato estático, pero **no sustituyen** estas pruebas de runtime.

## 1. Migración limpia
- Crear proyecto/base vacía.
- Ejecutar `schema.sql`, `001_production_hardening.sql`, `002_money_rpc.sql`, `003_goal_investment_rpc.sql`, `004_rpc_idempotency.sql`.
- Confirmar que no quedan errores de SQL.
- Repetir las migraciones declaradas repetibles y comprobar que no rompen constraints/helpers diseñados para repetición.

## 2. Idempotencia
Para cada RPC de registro (`transfer_funds`, `register_card_operation`, `register_loan_payment`, `register_debt_payment`, `register_goal_movement`, `register_investment_movement`):
1. Ejecutar con UUID nuevo.
2. Repetir exactamente el mismo payload. Debe devolver el mismo UUID y **no** crear una segunda operación.
3. Repetir el mismo UUID cambiando importe, cuenta, fecha, entidad o tipo. Debe fallar con `idempotency conflict`.
4. Reutilizar una clave creada por otro usuario. Debe fallar.
5. Forzar un error posterior a la reclamación dentro de la transacción y comprobar que un reintento con el mismo UUID puede ejecutarse correctamente.

## 3. Multi-tenant / RLS
- Crear usuario A y usuario B.
- A no puede leer/modificar cuentas, tarjetas, préstamos, deudas, metas, inversiones ni movimientos de B.
- A no puede invocar una RPC apuntando a un UUID propiedad de B.
- B tampoco puede reutilizar una clave de idempotencia creada por A.

## 4. Moneda
- Transferencia PEN → PEN: permitido.
- Transferencia PEN → USD: rechazado.
- Tarjeta PEN con cuenta USD: rechazado.
- Inversión USD con cuenta PEN: rechazado.
- Comprobar que el ledger conserva la moneda del origen.

## 5. Liquidez y atomicidad
- Pago mayor al saldo: rechazado.
- Transferencia válida: saldo origen disminuye y destino aumenta dentro de una sola transacción.
- Error en cualquier paso: ningún registro parcial debe quedar confirmado.
- Ejecutar dos pagos concurrentes contra la misma cuenta y comprobar que `FOR UPDATE` evita gastar dos veces el mismo saldo.

## 6. Reversas
- Reversar una operación confirmada: estado `Anulado`, ledger original anulado y saldo/entidad restaurados según la regla.
- Repetir la reversa: no debe duplicar compensaciones ni volver a alterar saldos.
- Intentar revertir un registro de otro usuario: rechazado.

## 7. Auditoría
- Cada alta/reversa transaccional debe generar `audit_log`.
- Intentar UPDATE/DELETE directo sobre auditoría: rechazado.
- Confirmar que el `user_id` de auditoría coincide con `auth.uid()`.

## 8. Invariantes contables
Después de cada escenario verificar:
- No existen movimientos monetarios confirmados con importe <= 0.
- No existen operaciones de tarjeta con cuenta de moneda incompatible.
- Los saldos de cuenta coinciden con apertura + movimientos de caja confirmados.
- No existen movimientos de dos usuarios mezclados.
- Una reversa no vuelve a afectar caja mediante el movimiento original.

## Resultado esperado
La base de datos solo se considera **runtime-validada** cuando estas pruebas pasan sobre PostgreSQL/Supabase real. Hasta entonces, el contrato SQL se considera diseñado y validado estáticamente, no certificado en producción.
