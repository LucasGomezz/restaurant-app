import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/AuthForms";

export default function RegistroPage() {
  return (
    <AuthShell
      title="Crear cuenta"
      description="Armá tu mapa y compartilo con quien quieras."
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="link">
            Iniciá sesión
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
