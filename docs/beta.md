# Beta privada: la versión nueva online, sin tocar la app vieja

La app vieja sigue en su dirección y con su base de siempre. La beta es un
**segundo proyecto de Vercel** que publica la rama `feature/multiusuario`
contra el proyecto de Supabase de **desarrollo**, con una copia de tus datos.

## 1. Copiar tus datos de la app vieja (solo lectura sobre la vieja)

1. Creá en la raíz del repo un archivo `.env.old` (git lo ignora, como a
   `.env`) con los datos del proyecto de Supabase **de la app vieja**:

   ```bash
   OLD_DATABASE_URL="postgresql://postgres.xxxx:contraseña@aws-0-….pooler.supabase.com:5432/postgres"
   OLD_SUPABASE_URL="https://xxxx.supabase.co"
   OLD_SUPABASE_SERVICE_ROLE_KEY="…"
   ```

   Son los mismos valores que tiene el proyecto viejo en Vercel (Settings →
   Environment Variables) o en Supabase (botón **Connect** y **Settings → API Keys**).
2. Probá sin copiar nada:

   ```bash
   node --env-file=.env --env-file=.env.old scripts/import-old-app.ts pantera --carpeta "Nosotros"
   ```

3. Si los números cuadran, copiá:

   ```bash
   node --env-file=.env --env-file=.env.old scripts/import-old-app.ts pantera --carpeta "Nosotros" --apply
   ```

Copia lugares, visitas, platos, fotos (también los archivos) y tipos a tu
usuario, dentro de la carpeta "Nosotros". En la app vieja solo lee: no
modifica ni borra nada.

## 2. Supabase de desarrollo

- [ ] **Authentication → Sign In / Providers → Email**: desactivá **Confirm
      email**. El email de Supabase sin SMTP propio solo llega a miembros de tu
      equipo, así que tu novia no recibiría el de confirmación. (Para el
      lanzamiento real se vuelve a activar, con Resend: ver `lanzamiento.md`.)
- [ ] **Authentication → URL Configuration**: Site URL = la URL de la beta
      (paso 3), y agregá `https://<tu-beta>.vercel.app/**` en Redirect URLs.

## 3. Proyecto de Vercel para la beta

1. vercel.com → **Add New → Project** → importá el mismo repositorio, con otro
   nombre (por ejemplo `nuestro-camino-beta`).
2. **Settings → Environment Variables** (Production), con los valores del
   proyecto de Supabase de **desarrollo** (los de tu `.env`):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | Session pooler de desarrollo (puerto 5432) |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de desarrollo |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Su anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Su service_role / secret key |
   | `LEGAL_OWNER_NAME`, `CONTACT_EMAIL` | Tus datos |
   | `NOMINATIM_CONTACT` | Tu email |

   No cargues `ALLOWED_EMAILS`.
3. **Settings → Git → Production Branch**: `feature/multiusuario`. Después
   **Deployments → Redeploy** el último deploy de esa rama.
4. Abrí la URL: tiene que aparecer la landing.

## 4. Invitar a tu novia

1. En la beta, entrá con tu cuenta → carpeta **Nosotros** → **Invitar** →
   "Link: pueden editar" → **Copiar**.
2. Mandáselo. Ella abre el link, se registra, elige su usuario y queda dentro
   de la carpeta viendo todo.

## Tener en cuenta

- La app vieja y la beta **no se sincronizan**: lo que cargues en una no
  aparece en la otra. Para la beta, conviene cargar todo nuevo solo ahí.
- El proyecto de Supabase gratis se pausa tras 7 días sin uso; usándolo no pasa.
- La base de desarrollo admite pocas conexiones: la beta y tu `npm run dev`
  la comparten sin problema, pero no corras los tests mientras ella la usa
  (crean y borran usuarios de prueba).
