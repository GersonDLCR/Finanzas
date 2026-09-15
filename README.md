# FINANZAS 360 — v79

Sistema profesional de gestión financiera personal en **modo demo/local**. El objetivo de esta etapa es dejar una demo completa, coherente y presentable para subirla a GitHub. **Supabase y la autenticación real se integrarán después.**

## Estado actual

- Datos de prueba persistidos en `localStorage`.
- Dashboard, trabajo, finanzas, tarjetas, préstamos, deudas, vehículos, presupuesto, ahorros, patrimonio, calendario, alertas y reportes implementados.
- CRUD y acciones principales conectados al store demo.
- Movimientos derivados para operaciones financieras relevantes.
- Inversiones con movimientos de Aporte, Retiro y Rendimiento; el capital no se modifica editando la ficha.
- Presupuestos controlados en PEN en esta etapa para no mezclar monedas.
- Calendario y alertas enlazados con sus registros de origen.
- Arquitectura preparada para sustituir el repositorio demo por Supabase posteriormente.

## Regla de esta etapa

**No conectar Supabase ni implementar todavía la autenticación real.** Primero se sube esta demo a GitHub y se conserva como base estable del proyecto. Después se realizará la integración de Supabase, RLS, RPC, aislamiento por usuario y login/registro/recuperación de cuenta.

## Estructura principal

- `app/` — App Router y páginas.
- `components/` — módulos y componentes de UI.
- `data/` — datos de prueba desacoplados de la UI.
- `lib/finance/` — dominio, cálculos, analítica y repositorio.
- `lib/use-finance-store.ts` — estado y operaciones del demo.
- `types.ts` — contratos de datos.
- `supabase/` — blueprint futuro de PostgreSQL/RLS/RPC; todavía no conectado.
- `scripts/` — verificaciones estáticas y pruebas del dominio.

## Seguridad para GitHub

No subir secretos ni artefactos locales. El `.gitignore` excluye:

- `.env*` privados.
- `node_modules/`.
- `.next/` y `out/`.
- `.vercel/`.
- logs y archivos temporales del sistema.

El archivo `.env.example` contiene únicamente referencias de configuración sin secretos reales.

## Flujo actual

```text
UI → store → domain → datos demo/localStorage
```

Flujo posterior a Supabase:

```text
UI → store → domain → repository Supabase → PostgreSQL/RLS/RPC
```

## Comandos locales

Después de clonar el proyecto e instalar dependencias:

```bash
npm install
npm run dev
```

Las comprobaciones estáticas del proyecto también pueden ejecutarse individualmente mediante los scripts de `scripts/`. Las validaciones de `lint`, `build` y las pruebas de runtime de Supabase se realizarán en el entorno de desarrollo/despliegue correspondiente.

## Próxima fase

Una vez que la demo quede subida a GitHub y estable:

1. Conectar Supabase.
2. Ejecutar migraciones y pruebas PostgreSQL/RLS/RPC.
3. Sustituir el almacenamiento demo por persistencia real.
4. Implementar autenticación y recuperación de cuenta.
5. Aislar completamente los datos por usuario.
6. Ejecutar QA final de producción y preparar Vercel.
