import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { SignupForm } from "@/components/AuthForms";
import { safeNextPath } from "@/lib/auth/validation";

export default async function RegistroPage(props: PageProps<"/registro">) {
  const { next: rawNext } = await props.searchParams;
  const next = safeNextPath(typeof rawNext === "string" ? rawNext : null);
  const keepNext = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;

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
    </AuthShell>
  );
}
