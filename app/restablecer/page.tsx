import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { ResetPasswordForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/auth/session";

/** Reached from the password-reset email, which signs the user in first. */
export default async function RestablecerPage() {
  if (!(await getCurrentUser())) redirect("/recuperar");

  return (
    <AuthShell
      title="Nueva contraseña"
      description="Elegí la contraseña que vas a usar de ahora en más."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
