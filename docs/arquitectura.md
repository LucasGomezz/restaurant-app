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
| 7 | IDs **UUID** en todas las tablas. | No se pueden adivinar ni enumerar; necesarios para links de invitación. |
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

Al salir o ser expulsado de una carpeta, dejás de ver su contenido, salvo los
lugares que creaste vos.

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
- [ ] IDs UUID (decisión 7): pendiente de confirmar si se migran las tablas existentes
- [ ] Capa de fotos con miniaturas y cuota
- [x] Sacar el mural de fotos privadas del login

### Fase 2 — Carpetas y amigos
- [ ] Crear / editar carpetas, carpetas de viaje con fechas
- [ ] Invitación por link, roles
- [ ] Solicitudes de amistad, invitar amigos a carpetas

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
