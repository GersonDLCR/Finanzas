# FINANZAS 360 — contrato de datos

## Principios
1. Cada registro de negocio pertenece a un `user_id`.
2. El dinero se registra una sola vez en `financial_movements`; los módulos de dominio guardan el detalle que explica su origen.
3. Capital no es P&L. Recuperar capital de un préstamo no es ingreso; amortizar capital de una deuda no es gasto.
4. Una compra con tarjeta aumenta pasivo y P&L, pero no caja. El pago de la tarjeta mueve caja y pasivo, pero no vuelve a registrar el consumo.
5. Las transferencias entre cuentas no son ingreso/gasto; la comisión de transferencia sí es costo.
6. Las operaciones críticas deben ejecutarse como transacciones/RPC en producción.
7. RLS debe aislar todos los datos por `auth.uid()`.

## Dashboard vs Reportes
- **Dashboard:** periodo actual, liquidez, obligaciones cercanas, utilización de crédito, cobros pendientes, señales y acciones.
- **Reportes:** histórico configurable, tendencias, rentabilidad, costo/km, costo/hora, evolución de deuda, patrimonio y comparativos.

## Préstamos otorgados
Para un préstamo de S/ 2,000 al 10% por 4 semanas:
- Interés total = S/ 200.
- Total programado = S/ 2,200.
- Cuota = S/ 550 por semana.
- El 10% se aplica una sola vez al capital inicial; no se recalcula sobre el saldo restante.

## Deudas bancarias
Se mantienen separadas porque pueden usar TEA/TCEA, tasa periódica, desgravamen, comisiones y amortización. El simulador de prepago puede mostrar reducción de plazo o cuota.
