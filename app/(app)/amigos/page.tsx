import type { ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton } from "@/components/ConfirmButton";
import { FriendRequestForm } from "@/components/FriendRequestForm";
import { PageHeader } from "@/components/PageHeader";
import { acceptFriendRequest, removeFriendship } from "@/lib/actions/friends";
import { requireProfile } from "@/lib/auth/session";
import { getFriendsOverview, type FriendProfile } from "@/lib/queries/friends";

export const dynamic = "force-dynamic";

const smallButton =
  "cursor-pointer rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-60";

export default async function AmigosPage() {
  const [{ profile }, { friends, received, sent }] = await Promise.all([
    requireProfile(),
    getFriendsOverview(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader
        title="Amigos"
        description="Con tus amigos podés compartir carpetas sin mandar links. Ser amigos no les muestra nada tuyo."
      />

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="font-semibold text-stone-900">Agregar un amigo</h2>
        <FriendRequestForm />
        <p className="text-xs text-stone-500">
          Pedile su usuario. El tuyo es{" "}
          <span className="font-semibold text-stone-700">@{profile.username}</span>.
        </p>
      </section>

      {received.length > 0 && (
        <FriendList title="Te quieren agregar" people={received}>
          {(person) => (
            <>
              <form action={acceptFriendRequest.bind(null, person.id)}>
                <button
                  type="submit"
                  className={`${smallButton} bg-brand-600 text-white hover:bg-brand-700`}
                >
                  Aceptar
                </button>
              </form>
              <form action={removeFriendship.bind(null, person.id)}>
                <button
                  type="submit"
                  className={`${smallButton} text-stone-500 hover:bg-stone-100 hover:text-stone-900`}
                >
                  Rechazar
                </button>
              </form>
            </>
          )}
        </FriendList>
      )}

      {sent.length > 0 && (
        <FriendList title="Solicitudes enviadas" people={sent}>
          {(person) => (
            <form action={removeFriendship.bind(null, person.id)}>
              <button
                type="submit"
                className={`${smallButton} text-stone-500 hover:bg-stone-100 hover:text-stone-900`}
              >
                Cancelar
              </button>
            </form>
          )}
        </FriendList>
      )}

      <FriendList
        title="Tus amigos"
        people={friends}
        empty="Todavía no tenés amigos agregados."
      >
        {(person) => (
          <form action={removeFriendship.bind(null, person.id)}>
            <ConfirmButton
              message={`¿Dejar de ser amigo de ${person.displayName}? Las carpetas que comparten no cambian.`}
              pendingLabel="Quitando..."
              className={`${smallButton} text-stone-500 hover:bg-stone-100 hover:text-red-600`}
            >
              Quitar
            </ConfirmButton>
          </form>
        )}
      </FriendList>
    </div>
  );
}

function FriendList({
  title,
  people,
  empty,
  children,
}: {
  title: string;
  people: FriendProfile[];
  empty?: string;
  children: (person: FriendProfile) => ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-stone-900">
        {title}{" "}
        {people.length > 0 && (
          <span className="font-normal text-stone-400">({people.length})</span>
        )}
      </h2>
      {people.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="card flex flex-col divide-y divide-stone-100">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={person.displayName} />
              <div className="flex min-w-0 flex-1 flex-col">
                <p className="truncate text-sm font-semibold text-stone-900">
                  {person.displayName}
                </p>
                <p className="truncate text-xs text-stone-500">@{person.username}</p>
              </div>
              <div className="flex items-center gap-1">{children(person)}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
