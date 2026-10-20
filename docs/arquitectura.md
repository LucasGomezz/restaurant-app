# Arquitectura — versión comercial

Documento de referencia para pasar de la app personal a un producto multiusuario.
Es la fuente de verdad de las decisiones: si algo cambia, se actualiza acá primero.

## Visión

Una app para que **grupos** (parejas, amigos, familias) registren los lugares que
quieren conocer y los que ya conocieron, en un mapa compartido, con fotos.
Mercados: **Argentina e internacional**.

## Decisiones tomadas

| # | Decisión | Motivo |
|---|---|---|
| 1 | El acceso se da por **carpetas compartidas**, no por "espacio" único. | Cada persona tiene varios grupos (pareja, amigos, un viaje puntual). |
| 2 | Un lugar puede estar en **varias carpetas** (muchos a muchos). | Una cena en Mendoza con Juan va en "Con Juan" y en "Mendoza". |
| 3 | La **amistad no da acceso a nada**; solo facilita invitar. El acceso viene únicamente de ser miembro de una carpeta. | Privacidad simple y difícil de romper. |
| 4 | Un viaje puede ser **una carpeta con fechas** (con sus lugares adentro) **o un lugar de tipo Viaje** (un pin con todas sus fotos). | Hay grupos que organizan por viaje y otros por "carpetas de vida". |
| 5 | Un lugar puede tener **varias visitas**. Pendiente / visitado se deriva de si tiene visitas. | Se vuelve a los lugares; en un grupo cada uno va en momentos distintos. |
| 6 | La visita y su descripción son **compartidas**: cualquier editor puede modificarlas. Opiniones individuales (comentarios) quedan para más adelante. | Simple; alcanza para empezar. |
| 7 | IDs **UUID** en las tablas nuevas que se acceden por link (carpetas, invitaciones). Las existentes siguen con números: cada acceso se valida contra permisos, así que un id adivinado da 404. | Migrar ids con datos y relaciones es el cambio más riesgoso y hoy aporta poco. |
| 8 | El plan (gratis / pago) es **por usuario**; la cuota se mide por las fotos que sube cada uno. | Las fotos son el costo real. |
| 9 | Cada servicio externo (mapa, geocoding, storage, pagos) va detrás de **una capa propia**. | Pasar de gratis a pago = cambiar configuración, no reescribir. |

## Reglas de acceso

Todas viven en **un único módulo de permisos** (`lib/access.ts`) con tests. Ninguna
query ni action lee datos de usuario sin pasar por él.

**Ver un lugar** (y sus visitas, fotos, platos): lo creaste vos, **o** está en una
carpeta de la que sos miembro (cualquier rol).

**Editar un lugar / sus visitas / fotos / platos**: lo creaste vos, **o** sos
`EDITOR` u `OWNER` de alguna carpeta que lo contiene.

**Borrar un lugar**: solo quien lo creó.

**Agregar un lugar a una carpeta**: solo quien lo creó, y siendo `EDITOR`+ de esa
carpeta. *Motivo:* si Pedro comparte un lugar en "Mendoza", yo no puedo pasarlo a
"Con Juan" y mostrarle a Juan las fotos de Pedro sin su permiso.

**Sacar un lugar de una carpeta**: quien lo creó, o el `OWNER` de la carpeta.

| Acción sobre la carpeta | OWNER | EDITOR | VIEWER |
|---|:-:|:-:|:-:|
| Ver contenido | ✓ | ✓ | ✓ |
| Agregar sus propios lugares | ✓ | ✓ | — |
| Editar lugares / visitas / fotos | ✓ | ✓ | — |
| Renombrar, portada, fechas | ✓ | — | — |
| Invitar, cambiar roles, expulsar | ✓ | — | — |
| Borrar la carpeta (los lugares no se borran) | ✓ | — | — |
| Salir de la carpeta | — ¹ | ✓ | ✓ |

¹ El owner primero transfiere la carpeta o la borra.

Al salir o ser expulsado de una carpeta, dejás de ver su contenido, y **tus
lugares salen de la carpeta con vos**: nadie sigue compartiendo en un grupo del
que ya no forma parte.

Tipos personalizados en lugares compartidos: se muestran (y sirven de filtro) a
quien ve el lugar, pero en los formularios cada uno elige solo entre los suyos;
un editor que guarda un lugar ajeno conserva el tipo que ya tenía.

## Modelo de datos

Borrador; los nombres finales se ajustan al escribir `contract.prisma`.

```
Profile        id (= auth.users.id), username (único), displayName, avatarPath,
               plan (FREE | PRO), createdAt

Friendship     userLow, userHigh (par ordenado → único), status (PENDING | ACCEPTED | BLOCKED),
               requestedBy, createdAt

Folder         id, name, description?, icon?, coverPhotoId?,
               startDate?, endDate?       ← con fechas = carpeta de viaje
               ownerId, createdAt

FolderMember   folderId + userId (PK), role (OWNER | EDITOR | VIEWER), joinedAt
FolderInvite   token (PK), folderId, role, createdBy, expiresAt, maxUses?, uses

Place          id, createdBy, name, kind (RESTAURANT | TRIP | EVENT | ATTRACTION | OTHER),
               categoryId? (tipo propio; `kind` sigue siendo el comportamiento base),
               lat, lng, address?, notes?, eventDate?,
               lastVisitAt?               ← desnormalizado: null = pendiente
               createdAt, updatedAt

Category       id, ownerId, name, icon, baseKind     ← tipos propios (ej: Bodega 🍷)
               único por (ownerId, name), no global  ← hoy `name` es único en toda la base

FolderPlace    folderId + placeId (PK), addedBy, addedAt

Visit          id, placeId, visitDate, endDate? (viajes), description,
               createdBy, createdAt, updatedAt

Photo          id, visitId, uploadedBy, path, thumbPath, width, height,
               sizeBytes (cuota), position, isCover, createdAt

Dish           id, visitId, name, description?, photoId?
```

Índices clave: `FolderMember(userId)`, `FolderPlace(placeId)`, `Place(createdBy)`,
`Visit(placeId)`, `Photo(visitId)`, `Photo(uploadedBy)`. Más adelante,
`Place(lat, lng)` o PostGIS para consultas por zona del mapa.

**Fotos en Storage**: `u/{uploaderId}/{photoId}.jpg` y `..._thumb.jpg`. La ruta
nunca decide el acceso: siempre se chequea en la base y se sirve con URL firmada.

## Servicios externos

| Servicio | Gratis (ahora) | Al crecer |
|---|---|---|
| Mapa | MapLibre GL + OpenFreeMap (vectorial, sin API key) | MapTiler / Stadia (cambia la URL del estilo) |
| Geocoding | Geoapify o LocationIQ free + caché propio en la base | Plan pago del mismo proveedor |
| Fotos | Supabase Storage + miniaturas generadas al subir | Cloudflare R2 (sin costo de egress) |
| Base / Auth | Supabase free | Supabase Pro |
| Hosting | Vercel (Hobby no permite uso comercial) | Vercel Pro al lanzar |
| Pagos | — | Mercado Pago (AR) + Lemon Squeezy / Paddle (internacional) |

Verificar los términos de cada plan gratuito al implementar cada capa: cambian seguido.

## Rendimiento

- **Conexiones a la base:** el pooler de Supabase en modo sesión admite pocas
  conexiones para todo el proyecto (15 en el plan free). Cada proceso usa un
  pool chico (`DATABASE_POOL_MAX`, 3 por defecto, en `src/prisma/db.ts`). En
  Vercel cada instancia serverless abre el suyo: con mucho tráfico, el límite
  se alcanza antes que cualquier otro. Opciones al crecer: Supabase pago (más
  conexiones) o el pooler de transacciones si Prisma Next lo soporta.

- El mapa carga solo `id, lat, lng, kind, name, visitado`; las fotos de un pin se piden al tocarlo.
- Miniaturas de ~400px generadas al subir y servidas directo (sin el optimizador de Vercel).
- Agrupación de pines (clustering) nativa de MapLibre.
- Con muchos lugares: pedir solo los que caen en la zona visible del mapa.

## Monetización (resumen)

1. **Freemium por usuario**: límite de fotos y de carpetas propias; Pro sin límites + exportar.
2. **Productos físicos**: álbum impreso de un viaje o carpeta, póster del mapa.
3. **Gift cards** de Pro.
4. Afiliados (reservas) cuando haya volumen. Sin publicidad.

## Plan de trabajo

### Fase 1 — Base multiusuario
- [x] Cerrar el diseño (este documento)
- [x] Proyecto de Supabase de desarrollo separado + `npm install` + `.env` local
- [x] Login real: registro, recuperar contraseña, perfil con username (`/bienvenida`)
- [ ] Login con Google
- [ ] SMTP propio (Resend) para los emails de Auth
- [x] Dueño en lugares y tipos (`ownerId`); tipos únicos por usuario
- [x] Script `scripts/claim-data.ts`: asigna los datos sin dueño a un usuario
- [x] Módulo de permisos `lib/access.ts` + `npm run test:isolation` (dos usuarios,
      lecturas y Server Actions con ids ajenos)
- [ ] Hacer `ownerId` obligatorio (NOT NULL) una vez asignados los datos en producción
- [ ] Capa de fotos con miniaturas y cuota
- [x] Sacar el mural de fotos privadas del login

### Fase 2 — Carpetas y amigos
- [x] Crear / editar carpetas, carpetas de viaje con fechas (`/carpetas`)
- [x] Invitación por link (`/invitacion/<id>`, vence a los 7 días), roles editar / solo ver
- [x] Agregar lugares desde la carpeta o desde el lugar; crear un lugar directo en una carpeta
- [x] `npm run test:e2e`: aislamiento entre cuentas y reglas de carpetas (34 casos)
- [x] Amigos (`/amigos`): solicitud por @usuario exacto (sin búsqueda parcial),
      aceptar / rechazar / cancelar / quitar; aviso en el menú
- [x] El dueño de una carpeta suma amigos directo, eligiendo el rol
- [ ] Bloquear usuarios (hoy quien rechazás puede volver a pedirte amistad)
- [ ] Transferir la carpeta a otro miembro (hoy el dueño no puede salir, solo borrarla)

### Fase 3 — Mapa nuevo
- [ ] MapLibre + OpenFreeMap con clustering
- [ ] Filtro por carpeta, fotos bajo demanda
- [ ] Capa de geocoding con caché

### Fase 4 — Lanzamiento
- [ ] Landing, onboarding, términos y privacidad, dominio, Vercel Pro

### Fase 5 — Monetización
- [ ] Límites del plan free, checkout, portal de suscripción
- [ ] Álbum impreso

### Fase 6 — Beta con grupos reales

## Ya implementado en la versión actual

- Varias visitas por lugar (decisión 5), con página propia por visita.
- Tipos personalizados (`Category`). Al pasar a multiusuario hay que darles dueño:
  un tipo lo ve quien lo creó, y los lugares que lo usan lo muestran a quien pueda
  ver el lugar.
- El mapa agrupa en un pin los lugares con la misma ubicación.

## Pendiente para más adelante

- Comentarios / opiniones individuales por visita.
- Convertir un lugar de tipo Viaje en una carpeta de viaje.
- Transferir la propiedad de una carpeta.
