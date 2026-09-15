# GitHub Readiness — FINANZAS 360

## Objetivo

Esta etapa prepara la **demo local** para ser subida a GitHub sin introducir todavía Supabase ni autenticación real.

## Checklist de repositorio

- [x] `.gitignore` excluye `.env*` privados.
- [x] `.gitignore` excluye `node_modules`, `.next`, `.vercel` y logs.
- [x] Existe `package-lock.json` para instalación reproducible.
- [x] Existe `.env.example` sin secretos reales.
- [x] Los datos demo están separados de los componentes.
- [x] No se encontraron archivos de claves privadas ni marcadores de service role en el código revisado.
- [x] README actualizado para describir correctamente el estado demo.
- [x] Arquitectura futura de Supabase queda documentada pero desconectada.
- [x] Inversiones usan movimientos para modificar capital/valor después de su creación.
- [x] Presupuesto evita mezclar PEN y USD en esta etapa.
- [x] Calendario y alertas pueden llevar al registro que originó el evento.

## Estado actual

La demo está funcionalmente preparada para la revisión manual final previa al primer push. Esta etapa no depende de Supabase ni de autenticación real.

## Antes del primer push

En la máquina local del usuario:

```bash
git init
git add .
git status
git diff --cached
```

Revisar especialmente que **no aparezcan** `.env`, credenciales, `node_modules`, `.next` ni archivos personales.

Después:

```bash
git commit -m "feat: complete finance 360 demo"
```

El repositorio remoto y la rama principal se pueden configurar después según la cuenta de GitHub del usuario.

## Última revisión recomendada antes del push

- [ ] Abrir la demo y recorrer todos los módulos en desktop.
- [ ] Repetir el recorrido principal en móvil.
- [ ] Crear/editar/eliminar registros de prueba en cada módulo donde corresponda.
- [ ] Recargar y confirmar que los datos demo/locales permanecen.
- [ ] Revisar que no haya información personal o secretos antes de `git add .`.

## Fuera del alcance de esta etapa

- Supabase.
- RLS runtime.
- RPC runtime.
- Login/registro real.
- Recuperación de contraseña.
- Aislamiento multiusuario real.
- Deploy definitivo en Vercel.

Esos puntos pertenecen a la siguiente fase, cuando la demo ya esté en GitHub.
