# FINANZAS 360 — autenticación preparada

La aplicación mantiene los datos financieros en `localStorage` mientras es demo, pero el acceso real está preparado para **Supabase Auth**.

## Proveedores previstos
- Google OAuth: experiencia rápida para usuarios principalmente móviles.
- Magic link: acceso por correo sin crear ni guardar una contraseña en FINANZAS 360.
- Email/password puede añadirse posteriormente si el producto lo necesita.

## Variables
Copia `.env.example` como `.env.local` y completa:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

En Supabase habilita Google y configura como callback:

`https://TU-DOMINIO/api/auth/callback`

En desarrollo:

`http://localhost:3000/api/auth/callback`

## Seguridad
- No se guardan contraseñas bancarias, CVV ni PIN.
- El flujo Google utiliza PKCE.
- La sesión productiva se guarda en cookies HttpOnly.
- La pantalla demo usa `sessionStorage` únicamente para permitir la demo local.
- Antes de producción, validar el JWT/refresh token en el servidor y conectar la autorización por usuario a la base de datos.

## Siguiente integración
Cuando se conecte Supabase Database, las entidades deberán tener `user_id` y todas las consultas/mutaciones deben filtrarse por el usuario autenticado. El frontend ya separa el estado de dominio de la presentación para facilitar ese reemplazo.
