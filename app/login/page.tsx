import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { LoginForm } from "@/components/AuthForms";
import { FormError } from "@/components/FormError";
import { safeNextPath } from "@/lib/auth/validation";

export default async function LoginPage(props: PageProps<"/login">) {
  const { error, next: rawNext } = await props.searchParams;
  const next = safeNextPath(typeof rawNext === "string" ? rawNext : null);
  const keepNext = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title="Nuestro Camino"
      description="Los lugares que queremos conocer, juntos."
      footer={
        <>
          ¿No tenés cuenta?{" "}
          <Link href={`/registro${keepNext}`} className="link">
            Registrate
          </Link>
        </>
      }
    >
      {error === "link" && (
        <FormError message="El link ya se usó o expiró. Iniciá sesión o pedí uno nuevo." />
      )}
      <LoginForm next={next} />
    </AuthShell>
  );
}
