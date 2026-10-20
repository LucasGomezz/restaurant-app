import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { acceptInvite } from "@/lib/actions/folders";
import { getCurrentUser, getProfile } from "@/lib/auth/session";
import { getInvite } from "@/lib/queries/folders";

export const dynamic = "force-dynamic";

/**
 * Join page for a folder link. Lives outside the (app) group so a visitor
 * who still has to sign in or create a profile comes back here afterwards.
 */
export default async function InvitacionPage(
  props: PageProps<"/invitacion/[id]">,
) {
  const { id } = await props.params;
  const here = `/invitacion/${id}`;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`);
  if (!(await getProfile(user.id))) {
    redirect(`/bienvenida?next=${encodeURIComponent(here)}`);
  }

  const data = await getInvite(id);

  if (!data) {
    return (
      <AuthShell
        title="Link vencido"
        description="Esta invitación ya no funciona. Pedile a quien te la mandó un link nuevo."
      >
        <Link href="/" className="btn-primary">
          Ir al inicio
        </Link>
      </AuthShell>
    );
  }

  const { folder, invite, memberCount, ownerName, alreadyMember } = data;
  if (alreadyMember) redirect(`/carpetas/${folder.id}`);

  return (
    <AuthShell
      title={`${folder.icon} ${folder.name}`}
      description={
        ownerName
          ? `${ownerName} te invita a sumarte a su carpeta.`
          : "Te invitaron a sumarte a esta carpeta."
      }
    >
      <ul className="flex flex-col gap-2 rounded-xl bg-stone-50 px-4 py-3 text-sm text-stone-600">
        <li>
          👥 {memberCount} {memberCount === 1 ? "miembro" : "miembros"}
        </li>
        <li>
          {invite.role === "EDITOR"
            ? "✏️ Vas a poder ver y editar los lugares, y sumar los tuyos."
            : "👀 Vas a poder ver los lugares y sus fotos."}
        </li>
        <li>🔒 Lo que no agregues a la carpeta sigue siendo solo tuyo.</li>
      </ul>
      <form action={acceptInvite.bind(null, invite.id)}>
        <button type="submit" className="btn-primary w-full">
          Sumarme
        </button>
      </form>
    </AuthShell>
  );
}
