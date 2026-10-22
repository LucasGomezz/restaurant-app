# Lanzamiento: de la rama `feature/multiusuario` a producción

Guía paso a paso para publicar la versión multiusuario. El orden importa: la
base de producción se migra **antes** de publicar el código nuevo, y tus datos
actuales se asignan a tu cuenta **después**.

## 0. Antes de empezar

- [ ] Todo commiteado en `feature/multiusuario` y `npm run test:e2e` en verde
      contra la base de desarrollo.
- [ ] Datos legales decididos: quién figura como responsable (vos o una
      empresa) y un email de contacto. Los textos de `/terminos` y
      `/privacidad` son un borrador razonable, pero **conviene que un abogado
      los revise** antes de cobrar.

## 1. Emails de Supabase (proyecto de producción)

El servicio de email que trae Supabase solo manda unos pocos por hora y solo a
miembros del equipo: con usuarios reales los emails de confirmación no llegan.

- [ ] Crear cuenta en [Resend](https://resend.com) (gratis hasta 3.000/mes) y
      verificar tu dominio (paso 4) para enviar desde, por ejemplo,
      `hola@tudominio.com`.
- [ ] Supabase → **Authentication → Emails → SMTP Settings**: activar SMTP
      propio con los datos de Resend.
- [ ] (Opcional) Traducir al español las plantillas de email en
      **Authentication → Emails → Templates**.

## 2. Configuración de Auth (producción)

- [ ] **Authentication → URL Configuration**:
  - Site URL: `https://tudominio.com`
  - Redirect URLs: `https://tudominio.com/**` (y `http://localhost:3000/**`
    si vas a probar en local contra esta base).
- [ ] **Authentication → Sign In / Providers → Email**: dejar **Confirm email**
      activado.

## 3. Migrar la base de producción

Las migraciones nuevas solo agregan tablas y columnas: la versión vieja que
está publicada sigue funcionando mientras tanto.

```bash
# Con la URL de producción (session pooler, puerto 5432):
npx prisma db migrate --show --db "postgresql://…producción…"   # revisar qué corre
npx prisma db migrate --db "postgresql://…producción…"
npx prisma db verify  --db "postgresql://…producción…"
```

## 4. Dominio

- [ ] Comprarlo: `.com` en Cloudflare Registrar o Namecheap (~US$10/año), o
      `.com.ar` en [NIC Argentina](https://nic.ar).
- [ ] Vercel → tu proyecto → **Settings → Domains** → agregarlo y cargar en tu
      proveedor de DNS los registros que indique Vercel.
- [ ] En Resend, agregar los registros DNS que pide para verificar el dominio.

## 5. Variables de entorno en Vercel

**Settings → Environment Variables** (entorno *Production*):

| Variable | Valor |
|---|---|
| `DATABASE_URL` | URL de producción **con el puerto 6543** (pooler en modo transacción). Las migraciones del paso 3 usan la misma URL con el puerto 5432 |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de producción |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret / service_role key |
| `LEGAL_OWNER_NAME` | Nombre del responsable (aparece en Términos y Privacidad) |
| `CONTACT_EMAIL` | Email de contacto |
| `DATABASE_POOL_MAX` | `3` (subir solo con un plan de Supabase pago) |
| `NOMINATIM_CONTACT` | Tu email (lo pide la política de Nominatim) |
| `GEOAPIFY_API_KEY` | Opcional: si la cargás, la búsqueda de direcciones usa Geoapify |

- [ ] **Borrar `ALLOWED_EMAILS`**: ya no se usa.

## 6. Publicar

- [ ] Abrir un Pull Request de `feature/multiusuario` a `main`, revisarlo y
      mergearlo. Vercel publica `main` automáticamente.
- [ ] Al terminar el deploy, entrar a `https://tudominio.com`: tiene que
      aparecer la landing.

## 7. Recuperar tus datos

Tus lugares actuales quedaron sin dueño, y nadie los ve hasta asignarlos.

1. Iniciá sesión en producción con tu cuenta y completá `/bienvenida`.
2. Desde tu máquina, con la URL de producción. `--carpeta` además crea una
   carpeta tuya con todos esos lugares adentro, lista para compartir:

   ```bash
   # Primero sin --apply: muestra qué cambiaría, sin tocar nada.
   DATABASE_URL="postgresql://…producción…" node scripts/claim-data.ts <tu-usuario> --carpeta "Nosotros"
   DATABASE_URL="postgresql://…producción…" node scripts/claim-data.ts <tu-usuario> --carpeta "Nosotros" --apply
   ```

3. Para seguir compartiendo con tu pareja: que se registre, mandale amistad
   (o el link de la carpeta) y sumala a "Nosotros" con rol *Puede editar*.

## 8. Prueba final en producción

- [ ] Registrarse con un email nuevo: llega el email, se confirma, se crea el perfil.
- [ ] Recuperar contraseña: llega el email y funciona el link.
- [ ] Crear un lugar con fotos, una carpeta, invitar a otra cuenta por link.
- [ ] Desde otra cuenta, confirmar que no se ve nada que no se haya compartido.
- [ ] `/terminos` y `/privacidad` sin el aviso amarillo de datos faltantes.

## 9. Cuando empieces a cobrar

- [ ] Pasar Vercel a **Pro** (el plan Hobby no permite uso comercial).
- [ ] Revisar el plan de Supabase: conexiones (15 en free), Storage (1 GB) y
      transferencia.
- [ ] Revisar los términos de OpenFreeMap y del proveedor de geocoding para el
      volumen de tráfico que tengas.
