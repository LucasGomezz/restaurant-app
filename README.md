# Restaurantes

App privada para trackear los restaurantes que queremos visitar y los que ya visitamos. Next.js (App Router) + Supabase (Postgres, Storage, Auth) + Prisma + Leaflet/OpenStreetMap.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Supabase**: base de datos Postgres, Storage (bucket privado para fotos), Auth (email/password, sin registro público)
- **Prisma** (Prisma Next / `@prisma/orm-postgres`) como capa de datos sobre el Postgres de Supabase
- **react-leaflet** + OpenStreetMap para el mapa (sin API key)
- **Nominatim** (OpenStreetMap) para geocoding, vía un proxy propio en `/api/geocode`

## 1. Crear el proyecto en Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. **Auth → Providers**: dejá solo Email habilitado. No hay pantalla de registro en la app — los usuarios se crean a mano.
3. **Authentication → Users → Add user**: creá los 2 usuarios (vos y tu pareja) con email/password.
4. **Storage → Create bucket**: creá un bucket llamado `restaurant-photos`, marcado como **privado** (no público). No hace falta configurar policies: la app sube y lee las imágenes únicamente desde el servidor con la `service_role` key, que bypassea RLS/policies de Storage.
5. **Project Settings → Database**: copiá el connection string del **Session pooler** (puerto `5432`). No uses el *Transaction pooler* (puerto `6543`) — Prisma necesita una conexión con estado de sesión.
6. **Project Settings → API**: copiá `Project URL`, `anon public key` y `service_role key`.

## 2. Variables de entorno

Copiá `.env.example` a `.env` y completá con los valores reales del paso anterior:

```bash
cp .env.example .env
```

```
DATABASE_URL=                    # Session pooler connection string (puerto 5432)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # solo servidor, nunca se expone al cliente
```

## 3. Instalar dependencias y correr las migraciones

```bash
npm install
npx prisma contract emit        # genera el cliente tipado a partir de src/prisma/contract.prisma
npx prisma db init --db $DATABASE_URL   # primera vez: baselinea la base vacía
npx prisma migration plan --name init   # planifica la migración inicial
npx prisma db migrate --db $DATABASE_URL # la aplica
```

El modelo de datos vive en [`src/prisma/contract.prisma`](src/prisma/contract.prisma):

- **Restaurant**: nombre, dirección, lat/lng, estado (`PENDING` | `VISITED`), notas.
- **Visit**: 1-a-1 con Restaurant. Fecha, descripción, foto de portada.
- **Dish**: N por Visit. Nombre, descripción, foto.

Si volvés a cambiar el schema: editá `contract.prisma`, corré `npx prisma contract emit` y después `npx prisma migration plan --name <nombre>` + `npx prisma db migrate --db $DATABASE_URL`.

## 4. Correr en local

```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) — te va a redirigir a `/login`. Iniciá sesión con uno de los usuarios creados en el paso 1.

## 5. Deploy en Vercel

1. Importá el repo en Vercel.
2. Cargá las mismas variables de entorno del paso 2 en la configuración del proyecto.
3. Corré las migraciones contra la base de producción antes (o como parte) del deploy: `npx prisma db migrate --db $DATABASE_URL` con el `DATABASE_URL` de producción.
4. Deploy.

## Estructura

```
app/
  login/page.tsx                     -> login
  (app)/
    layout.tsx                       -> nav + logout (rutas protegidas)
    page.tsx                         -> mapa principal
    pendientes/page.tsx
    visitados/page.tsx
    restaurantes/
      nuevo/page.tsx
      [id]/page.tsx                  -> detalle + marcar visitado + platos
      [id]/editar/page.tsx
  api/geocode/route.ts                -> proxy a Nominatim
components/                           -> Map, RestaurantForm, VisitForm, DishForm, ...
lib/
  supabase/{client,server,admin,proxy}.ts
  actions/{auth,restaurants,guard}.ts -> Server Actions (mutaciones)
  queries/restaurants.ts              -> lecturas
  storage.ts                          -> subida / URLs firmadas del bucket privado
  db.ts                               -> cliente Prisma
src/prisma/
  contract.prisma                     -> schema (fuente de verdad)
  db.ts, contract.json, contract.d.ts -> generados por `prisma contract emit`
proxy.ts                              -> protege todas las rutas excepto /login
```

Las imágenes se suben desde Server Actions usando la `service_role` key (bucket privado) y se sirven mediante URLs firmadas generadas al renderizar cada página.
