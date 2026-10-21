import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { ProfileForm } from "@/components/AuthForms";
import { logout } from "@/lib/actions/auth";
import { getCurrentUser, getProfile } from "@/lib/auth/session";
import { safeNextPath, suggestUsername } from "@/lib/auth/validation";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** First step after signing up: pick a name and a @username. */
export default async function BienvenidaPage(props: PageProps<"/bienvenida">) {
  const { next: rawNext } = await props.searchParams;
  const next = safeNextPath(typeof rawNext === "string" ? rawNext : null);

  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await getProfile(user.id)) redirect(next);

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
      <ProfileForm suggestedUsername={suggestUsername(user.email)} next={next} />
    </AuthShell>
  );
}
