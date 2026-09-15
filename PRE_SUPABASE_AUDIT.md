# Auditoría v57 — Puerta de entrada a GitHub/Vercel y Supabase

## Objetivo
La aplicación debe poder subirse a GitHub y desplegarse en Vercel usando exclusivamente datos demo, sin secretos ni conexión a Supabase. Solo después de completar esta puerta se inicia la integración real con Supabase.

## Cambios v57
- [x] Frontera explícita Frontend ↔ Supabase mediante `lib/finance/supabase-mappers.ts`.
- [x] Conversión de nombres de columnas (`snake_case`) y campos del dominio (`camelCase`).
- [x] Conversión explícita de IDs demo `string|number` hacia la frontera UUID/string.
- [x] Moneda obligatoria en la persistencia financiera y rechazo de operaciones sin `accountId`/`currency`.
- [x] Transferencias entre monedas distintas requieren una operación FX explícita.
- [x] `.gitignore` preparado para GitHub/Vercel.
- [x] Script de contrato predeploy.
- [x] Script de sintaxis para los 50 archivos TS/TSX actuales.
- [x] Smoke test financiero sigue OK.

## Validaciones automáticas realizadas
- `npm run check:logic` → OK.
- `npm run check:source` → OK (50 TS/TSX).
- `npm run check:predeploy` → OK.

## Validaciones aún NO certificadas
- [ ] `npm install` completo en un entorno con acceso al registro npm.
- [ ] `npm run lint`.
- [ ] `npm run build`.
- [ ] Navegación manual completa en desktop y mobile.
- [ ] CRUD de cada módulo desde la UI.
- [ ] Pruebas de estados vacíos, errores, cancelación, edición, eliminación y reversión.
- [ ] Prueba de recarga del navegador con datos demo persistidos.
- [ ] Prueba de exportar/importar/restaurar datos demo.
- [ ] Prueba de Vercel Preview/Production con variables vacías o sin Supabase operativo.
- [ ] Revisión final de accesibilidad básica y responsive.

## Bloqueadores antes de decir “LISTO PARA GITHUB/VERCEL”
1. `lint` debe terminar sin errores.
2. `next build` debe terminar correctamente.
3. La navegación de todos los módulos debe verificarse manualmente.
4. Todas las operaciones CRUD visibles deben completar su ciclo: crear → editar → consultar → eliminar/revertir.
5. Las operaciones monetarias no deben producir duplicación de caja/P&L/capital.
6. PEN y USD nunca deben sumarse como si fueran equivalentes.
7. Exportación/importación/reset demo deben funcionar.
8. No debe haber secretos ni datos reales en el repositorio.

## Bloqueadores antes de Supabase
Después de superar GitHub/Vercel demo, todavía deben completarse:
- Adapter Supabase real.
- Auth real: registro, login, recuperación y aislamiento por usuario.
- RPC/transacciones para transferencias y pagos monetarios críticos.
- RLS con dos usuarios reales.
- Migración de datos demo opcional.
- Pruebas de producción con Supabase.

## Regla de comunicación
Mientras exista cualquier casilla de “Validaciones aún NO certificadas” o cualquier bloqueador, la respuesta debe indicar qué falta. Cuando todas estén verificadas, se comunicará explícitamente: **“FINANZAS 360 está listo para subir a GitHub y Vercel con datos de prueba; todavía NO conectes Supabase.”**
