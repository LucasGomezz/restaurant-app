# Beta privada: la versión online

La beta es un proyecto de Vercel que publica `main` de este repo
(`restaurant-app`) contra el proyecto de Supabase de **desarrollo**.
Ahí está la carpeta "Nosotros", con todo lo que había en la app vieja (repo
`nuestroCamino`), que ya no se usa.

## 1. Supabase de desarrollo

- [ ] **Authentication → Sign In / Providers → Email**: desactivá **Confirm
      email**. El email de Supabase sin SMTP propio solo llega a miembros de tu
      equipo, así que tu novia no recibiría el de confirmación. (Para el
      lanzamiento real se vuelve a activar, con Resend: ver `lanzamiento.md`.)
- [ ] **Authentication → URL Configuration**: Site URL = la URL de la beta
      (paso 2), y agregá `https://<tu-beta>.vercel.app/**` en Redirect URLs.

## 2. Proyecto de Vercel para la beta

1. vercel.com → **Add New → Project** → importá el mismo repositorio, con otro
   nombre (por ejemplo `nuestro-camino-beta`).
2. **Settings → Environment Variables** (Production), con los valores del
   proyecto de Supabase de **desarrollo** (los de tu `.env`):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | La URL de desarrollo **con el puerto 6543** (pooler en modo transacción) en vez de 5432 |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de desarrollo |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Su anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Su service_role / secret key |
   | `LEGAL_OWNER_NAME`, `CONTACT_EMAIL` | Tus datos |
   | `NOMINATIM_CONTACT` | Tu email |

   No cargues `ALLOWED_EMAILS`.
3. Si el primer deploy salió antes de cargar las variables, **Deployments →
   Redeploy** el último deploy de `main` para que las tome.
4. Abrí la URL: tiene que aparecer la landing.

## 3. Invitar a tu novia

1. En la beta, entrá con tu cuenta → carpeta **Nosotros** → **Invitar** →
   "Link: pueden editar" → **Copiar**.
2. Mandáselo. Ella abre el link, se registra, elige su usuario y queda dentro
   de la carpeta viendo todo.

## Tener en cuenta

- El proyecto de Supabase gratis se pausa tras 7 días sin uso; usándolo no pasa.
- La base de desarrollo admite pocas conexiones: la beta y tu `npm run dev`
  la comparten sin problema, pero no corras los tests mientras ella la usa
  (crean y borran usuarios de prueba).
