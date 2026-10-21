import Link from "next/link";
import { DeleteAccountForm, DisplayNameForm } from "@/components/AccountForms";
import { PageHeader } from "@/components/PageHeader";
import { requireProfile } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const { user, profile } = await requireProfile();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <PageHeader title="Mi cuenta" />

      <section className="card flex flex-col gap-5 p-5">
        <div className="grid gap-1 text-sm">
          <p className="text-stone-500">Email</p>
          <p className="font-medium text-stone-900">{user.email}</p>
        </div>
        <div className="grid gap-1 text-sm">
          <p className="text-stone-500">Usuario</p>
          <p className="font-medium text-stone-900">@{profile.username}</p>
        </div>
        <DisplayNameForm displayName={profile.displayName} />
        <p className="text-sm text-stone-500">
          ¿Querés cambiar la contraseña?{" "}
          <Link href="/recuperar" className="link">
            Te mandamos un link
          </Link>
          .
        </p>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50/40 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-red-700">Eliminar cuenta</h2>
          <p className="text-sm text-stone-600">
            Se borran para siempre tu perfil, tus lugares con sus visitas y
            fotos, tus tipos, tus amistades y las carpetas de las que sos dueño.
            Lo que sumaste a carpetas de otros deja de verse. No se puede
            deshacer.
          </p>
        </div>
        <DeleteAccountForm username={profile.username} />
      </section>

      <p className="text-center text-sm text-stone-500">
        <Link href="/terminos" className="hover:text-stone-900">
          Términos
        </Link>{" "}
        ·{" "}
        <Link href="/privacidad" className="hover:text-stone-900">
          Privacidad
        </Link>
      </p>
    </div>
  );
}
