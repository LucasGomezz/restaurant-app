import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmButton } from "@/components/ConfirmButton";
import { EmptyState } from "@/components/EmptyState";
import { InvitePanel } from "@/components/InvitePanel";
import MapLoader from "@/components/MapLoader";
import { hasRole } from "@/lib/access";
import {
  addPlaceToFolderForm,
  changeMemberRole,
  createInvite,
  deleteFolder,
  leaveFolder,
  removeMember,
  removePlaceFromFolder,
  revokeInvite,
} from "@/lib/actions/folders";
import { formatDate, formatDateRange } from "@/lib/format";
import { getPlaceTypes } from "@/lib/queries/categories";
import { getFolderDetail, getPlacesToAdd } from "@/lib/queries/folders";
import { getRestaurantMarkers } from "@/lib/queries/restaurants";
import { siteOrigin } from "@/lib/site";

export const dynamic = "force-dynamic";

const ROLE_LABEL = {
  OWNER: "Dueño",
  EDITOR: "Puede editar",
  VIEWER: "Solo ver",
};

export default async function CarpetaPage(props: PageProps<"/carpetas/[id]">) {
  const { id } = await props.params;
  const detail = await getFolderDetail(id);
  if (!detail) notFound();

  const { folder, role, invite, me } = detail;
  const isOwner = role === "OWNER";
  const canAdd = hasRole(role, "EDITOR");
  const types = await getPlaceTypes();
  const [places, placesToAdd] = await Promise.all([
    getRestaurantMarkers(types, undefined, folder.id),
    canAdd ? getPlacesToAdd(folder.id) : [],
  ]);
  const inviteLink = invite ? `${await siteOrigin()}/invitacion/${invite.id}` : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Link
        href="/carpetas"
        className="self-start text-sm font-medium text-stone-500 transition hover:text-stone-900"
      >
        ← Carpetas
      </Link>

      {/* ---------- Header ---------- */}
      <section className="card flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span
            className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-3xl ring-1 ring-brand-600/10"
            aria-hidden
          >
            {folder.icon}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
              {folder.name}
            </h1>
            {folder.startDate && (
              <p className="text-sm font-medium text-brand-700">
                ✈️ {formatDateRange(folder.startDate, folder.endDate)}
              </p>
            )}
            <p className="text-xs text-stone-500">
              {folder.members.length}{" "}
              {folder.members.length === 1 ? "miembro" : "miembros"} · Vos:{" "}
              {ROLE_LABEL[role].toLowerCase()}
            </p>
          </div>
        </div>
        {folder.description && (
          <p className="text-sm whitespace-pre-line text-stone-600">
            {folder.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {isOwner ? (
            <>
              <Link href={`/carpetas/${folder.id}/editar`} className="btn-secondary">
                Editar carpeta
              </Link>
              <form action={deleteFolder.bind(null, folder.id)}>
                <ConfirmButton
                  message={`¿Eliminar la carpeta "${folder.name}"? Los lugares no se borran: siguen siendo de quien los creó.`}
                >
                  Eliminar
                </ConfirmButton>
              </form>
            </>
          ) : (
            <form action={leaveFolder.bind(null, folder.id)}>
              <ConfirmButton
                message={`¿Salir de "${folder.name}"? Dejás de ver sus lugares, y los tuyos dejan de estar en la carpeta.`}
                pendingLabel="Saliendo..."
              >
                Salir de la carpeta
              </ConfirmButton>
            </form>
          )}
        </div>
      </section>

      {/* ---------- Places ---------- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-stone-900">
          Lugares{" "}
          <span className="font-normal text-stone-400">
            {places.length > 0 && `(${places.length})`}
          </span>
        </h2>

        {places.length === 0 ? (
          <EmptyState
            icon={folder.icon}
            message={
              canAdd
                ? "Todavía no hay lugares. Sumá uno de los tuyos o creá uno nuevo directo en esta carpeta."
                : "Todavía no hay lugares en esta carpeta."
            }
          />
        ) : (
          <>
            <div className="h-72 w-full overflow-hidden rounded-2xl border border-stone-200 shadow-sm">
              <MapLoader restaurants={places} />
            </div>
            <ul className="flex flex-col gap-2">
              {places.map((place) => (
                <li
                  key={place.id}
                  className="card flex items-center gap-3 p-3 pr-4"
                >
                  <span
                    className={`grid size-10 shrink-0 place-items-center rounded-xl text-lg ring-1 ${
                      place.status === "VISITED"
                        ? "bg-emerald-50 ring-emerald-600/15"
                        : "bg-amber-50 ring-amber-600/15"
                    }`}
                    title={place.typeLabel}
                    aria-hidden
                  >
                    {place.icon}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/lugares/${place.id}`}
                      className="truncate font-semibold text-stone-900 hover:text-brand-700"
                    >
                      {place.name}
                    </Link>
                    <p className="text-xs text-stone-500">
                      {place.status === "VISITED" ? "Visitado" : "Pendiente"}
                      {place.date && ` · ${formatDate(place.date)}`}
                    </p>
                  </div>
                  {(isOwner || place.isOwn) && (
                    <form
                      action={removePlaceFromFolder.bind(
                        null,
                        Number(place.id),
                        folder.id,
                      )}
                    >
                      <ConfirmButton
                        message={`¿Sacar "${place.name}" de la carpeta? El lugar no se borra.`}
                        pendingLabel="Sacando..."
                        className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-red-600 disabled:opacity-60"
                      >
                        Sacar
                      </ConfirmButton>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {canAdd && (
          <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/60 p-4">
            {placesToAdd.length > 0 && (
              <form
                action={addPlaceToFolderForm.bind(null, folder.id)}
                className="flex flex-wrap gap-2"
              >
                <select
                  name="placeId"
                  required
                  aria-label="Uno de tus lugares"
                  className="input min-w-0 flex-1"
                  defaultValue=""
                >
                  <option value="" disabled>
                    Sumar uno de tus lugares…
                  </option>
                  {placesToAdd.map((place) => (
                    <option key={place.id} value={place.id}>
                      {place.name}
                    </option>
                  ))}
                </select>
                <button type="submit" className="btn-secondary shrink-0">
                  Sumar
                </button>
              </form>
            )}
            <Link
              href={`/lugares/nuevo?carpeta=${folder.id}`}
              className="link self-start text-sm"
            >
              + Crear un lugar nuevo en esta carpeta
            </Link>
          </div>
        )}
      </section>

      {/* ---------- Members ---------- */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-stone-900">
          Miembros{" "}
          <span className="font-normal text-stone-400">
            ({folder.members.length})
          </span>
        </h2>
        <ul className="card flex flex-col divide-y divide-stone-100">
          {folder.members.map((member) => (
            <li
              key={member.userId}
              className="flex flex-wrap items-center gap-3 px-4 py-3"
            >
              <span
                className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white"
                aria-hidden
              >
                {member.user?.displayName.slice(0, 1).toUpperCase() ?? "?"}
              </span>
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-semibold text-stone-900">
                  {member.user?.displayName ?? "Usuario"}
                  {member.userId === me && (
                    <span className="font-normal text-stone-400"> (vos)</span>
                  )}
                </p>
                <p className="text-xs text-stone-500">
                  @{member.user?.username} · {ROLE_LABEL[member.role]}
                </p>
              </div>
              {isOwner && member.role !== "OWNER" && (
                <div className="flex items-center gap-1">
                  <form
                    action={changeMemberRole.bind(
                      null,
                      folder.id,
                      member.userId,
                      member.role === "EDITOR" ? "VIEWER" : "EDITOR",
                    )}
                  >
                    <button
                      type="submit"
                      className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
                    >
                      {member.role === "EDITOR"
                        ? "Pasar a solo ver"
                        : "Dejar editar"}
                    </button>
                  </form>
                  <form action={removeMember.bind(null, folder.id, member.userId)}>
                    <ConfirmButton
                      message={`¿Sacar a ${member.user?.displayName ?? "este miembro"} de la carpeta? Sus lugares también salen.`}
                      pendingLabel="Sacando..."
                      className="cursor-pointer rounded-lg px-2 py-1 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-red-600 disabled:opacity-60"
                    >
                      Sacar
                    </ConfirmButton>
                  </form>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {/* ---------- Invite (owner) ---------- */}
      {isOwner && (
        <section className="card flex flex-col gap-3 p-5">
          <h2 className="text-lg font-semibold text-stone-900">Invitar</h2>
          <InvitePanel
            link={inviteLink}
            role={invite && invite.role !== "OWNER" ? invite.role : null}
            expiresAt={invite?.expiresAt ?? null}
            onCreate={createInvite.bind(null, folder.id)}
            onRevoke={revokeInvite.bind(null, folder.id)}
          />
        </section>
      )}
    </div>
  );
}
