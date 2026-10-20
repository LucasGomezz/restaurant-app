import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { ProfileForm } from "@/components/AuthForms";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser, getProfile } from "@/lib/auth/session";
import { suggestUsername } from "@/lib/auth/validation";

/** First step after signing up: pick a name and a @username. */
export default async function BienvenidaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await getProfile(user.id)) redirect("/");

  return (
    <AuthShell
      title="¡Bienvenido!"
      description="Antes de empezar, contanos cómo te llamás."
      footer={
        <form action={logout}>
          <button
            type="submit"
            className="cursor-pointer font-medium text-stone-500 transition hover:text-stone-900"
          >
            Salir ({user.email})
          </button>
        </form>
      }
    >
      <ProfileForm suggestedUsername={suggestUsername(user.email)} />
    </AuthShell>
  );
}
