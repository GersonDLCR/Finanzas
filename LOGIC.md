# FINANZAS 360 — lógica cerrada antes de Supabase

## Flujo de datos

`módulo de negocio → registro de dominio → movimiento financiero vinculado → libro financiero → métricas → dashboard/reportes`

Los componentes no calculan reglas críticas. Las reglas viven en `lib/finance/domain.ts` y el estado/orquestación en `lib/use-finance-store.ts`.

## Reglas contables del producto

### Ingresos y gastos
- Un ingreso afecta caja y P&L salvo que se marque explícitamente como movimiento de capital.
- Un gasto afecta caja y P&L salvo que sea una devolución/amortización de capital.
- Un movimiento anulado no participa en indicadores.

### Trabajo
- Ingreso bruto: P&L + caja.
- Comisión: P&L - y caja -.
- Bonos: P&L + y caja +.
- Combustible/otros costos: P&L - y caja -.
- El costo registrado directamente en una jornada debe distinguirse del abastecimiento/mantenimiento detallado para evitar duplicarlo.

### Combustible y mantenimiento
Cada registro crea/actualiza un movimiento vinculado por `sourceType/sourceId`. Editar reemplaza el movimiento vinculado; eliminar lo retira.

### Tarjetas
- Compra: gasto/P&L, no caja.
- Interés, seguro, membresía y comisión: gasto/P&L, no caja hasta que se paguen.
- Pago de tarjeta: caja -, pasivo -, no vuelve a crear gasto.
- Ruleteo/disposición: entrada de liquidez; la comisión es costo. Nunca se presume rentabilidad.

### Préstamos otorgados
Interés simple sobre capital inicial:
`interés = principal × tasa`
`total = principal + interés`
`cuota = total / número de periodos`

Ejemplo S/ 2,000 × 10% × 4 semanas → S/ 2,200 total → S/ 550 semanal.

Los pagos se imputan a mora → interés pendiente → capital pendiente. El interés pendiente proviene del total programado, no de recalcular 10% sobre el saldo.

### Deudas bancarias
Se conserva una lógica diferente: tasa anual → tasa periódica, amortización, desgravamen y simulación de prepago. Esto permite representar productos bancarios reales sin contaminar la regla simple de los préstamos que el usuario otorga.

### Metas
Una meta es una asignación/objetivo de planificación. Sus aportes y retiros tienen historial, pero no se cuentan como gasto/ingreso económico ni se descuentan de la liquidez si son solo una asignación virtual. Cuando exista una cuenta de ahorro real, el movimiento debe modelarse como transferencia entre cuentas.

### Patrimonio
`patrimonio = efectivo + cuentas + activos + préstamos por cobrar - tarjetas - deudas - deuda vehicular`
Las metas no se suman otra vez porque el dinero ahorrado ya pertenece a una cuenta/activo.

## Dashboard
Pregunta: **¿Qué necesito saber y decidir ahora?**
- liquidez actual
- flujo del mes
- ingresos/gastos del mes
- deuda y tarjetas
- dinero por cobrar
- patrimonio
- alertas y acciones

## Reportes
Pregunta: **¿Qué ha ocurrido y qué tendencia debo entender?**
- 3/6/12 meses o histórico completo
- rentabilidad de trabajo
- costo/km y costo/hora
- combustible y mantenimiento
- exposición crediticia
- tendencias y decisiones estratégicas

## Supabase al final
La aplicación actual usa `localStorage` + datos demo. La interfaz de repositorio ya está definida para sustituir la fuente local por Supabase. Antes de conectar:
- terminar UI/UX
- probar todas las reglas con datos demo
- validar importación/exportación
- validar reversas y eliminaciones en cascada
- después implementar Supabase, RLS y RPC transaccionales.

## v49 — reglas adicionales cerradas

### Cuentas
- Cada operación que implique caja debe identificar una cuenta cuando el origen la conoce.
- Una transferencia mueve liquidez entre dos cuentas de la misma moneda y no genera ingreso.
- La comisión de una transferencia sí afecta P&L como costo.
- No se permite transferir más que el saldo disponible.

### Seguro
- Un seguro marcado como pagado genera gasto y salida de caja.
- Un seguro no pagado permanece como obligación/registro y no reduce caja.
- El costo del documento vehicular no se vuelve a registrar automáticamente para evitar duplicar SOAT/seguro.

### Multas
- Una multa pendiente no afecta caja.
- Una multa pagada genera gasto por el importe neto después del descuento.

### Accidentes y robos
- `paidByUser` representa costo efectivamente asumido por el usuario.
- `paidByThirdParty` representa dinero efectivamente recibido.
- `recognized` es un monto reconocido/estimado por aseguradora o tercero, no caja hasta que exista pago real.
- Esto evita contabilizar dos veces una indemnización.

### Tarjetas — disposición/ruleteo
- El efectivo recibido aumenta liquidez.
- La comisión es costo financiero separado.
- La deuda de tarjeta se calcula sobre el cargo correspondiente, no sobre el efectivo neto recibido.

### Jornadas y combustible
- `fuelAccounting = Jornada`: el costo de combustible se registra en la jornada.
- `fuelAccounting = Abastecimientos`: el costo debe venir de los abastecimientos vinculados.
- `Mixto` permite mantener ambos componentes cuando representan conceptos distintos; el usuario debe evitar registrar el mismo gasto dos veces.

### Integridad
El store expone `integrity` para detectar referencias rotas, totales que no cuadran, cuotas inconsistentes y utilización de tarjetas fuera de línea antes de migrar datos a Supabase.

## v50 — cierre de cobertura
- Las metas son asignaciones virtuales: no reducen caja. El movimiento real entre cuentas se registra como transferencia.
- Las deudas bancarias pueden vincularse a un vehículo mediante `vehicleId`; el patrimonio no vuelve a restar esa deuda desde la ficha del vehículo.
- El calendario/pronóstico usa eventos fechados para deudas, cobros, tarjetas, recurrentes, seguros, multas y mantenimientos.
- Mejoras, neumáticos, gastos recurrentes e inversiones tienen contratos de dominio separados y quedan preparados para persistencia posterior.
