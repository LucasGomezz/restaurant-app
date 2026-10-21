import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/AuthForms";
import { APP_HOME, safeNextPath } from "@/lib/auth/validation";

export default async function RegistroPage(props: PageProps<"/registro">) {
  const { next: rawNext } = await props.searchParams;
  const next = safeNextPath(typeof rawNext === "string" ? rawNext : null);
  const keepNext = next === APP_HOME ? "" : `?next=${encodeURIComponent(next)}`;

  return (
    <AuthShell
      title="Crear cuenta"
      description="Armá tu mapa y compartilo con quien quieras."
      footer={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link href={`/login${keepNext}`} className="link">
            Iniciá sesión
          </Link>
        </>
      }
    >
      <SignupForm next={next} />
      <p className="-mt-3 text-center text-xs text-stone-500">
        Al crear tu cuenta aceptás los{" "}
        <Link href="/terminos" className="link">
          Términos
        </Link>{" "}
        y la{" "}
        <Link href="/privacidad" className="link">
          Política de privacidad
        </Link>
        .
      </p>
    </AuthShell>
  );
}
