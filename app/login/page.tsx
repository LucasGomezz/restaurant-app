import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/AuthForms";
import { FormError } from "@/components/FormError";

export default async function LoginPage(props: PageProps<"/login">) {
  const { error } = await props.searchParams;

  return (
    <AuthShell
      title="Nuestro Camino"
      description="Los lugares que queremos conocer, juntos."
      footer={
        <>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="link">
            Registrate
          </Link>
        </>
      }
    >
      {error === "link" && (
        <FormError message="El link ya se usó o expiró. Iniciá sesión o pedí uno nuevo." />
      )}
      <LoginForm />
    </AuthShell>
  );
}
