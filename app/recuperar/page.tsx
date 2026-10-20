import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ForgotPasswordForm } from "@/components/AuthForms";

export default function RecuperarPage() {
  return (
    <AuthShell
      title="Recuperar contraseña"
      description="Te mandamos un link para elegir una nueva."
      footer={
        <Link href="/login" className="link">
          ← Volver a iniciar sesión
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
