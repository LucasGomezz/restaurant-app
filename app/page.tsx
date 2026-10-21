import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/SiteFooter";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_HOME } from "@/lib/auth/validation";

export const metadata: Metadata = {
  title: "Nuestro Camino — los lugares que querés conocer, con tu gente",
  description:
    "Un mapa compartido con tu pareja, tus amigos o tu familia: los lugares que quieren conocer, los que ya visitaron, con fotos, platos y recuerdos.",
};

const FEATURES = [
  {
    icon: "🗺️",
    title: "Un mapa con todo",
    text: "Restaurantes, viajes, eventos o lo que quieran. Pendientes en naranja, visitados en verde.",
  },
  {
    icon: "📁",
    title: "Carpetas para cada grupo",
    text: "“Con Juan”, “Familia”, “Mendoza 2026”: cada carpeta se comparte con quien elijas.",
  },
  {
    icon: "📸",
    title: "Recuerdos de cada visita",
    text: "Fotos, qué comieron, qué les pareció. Y si vuelven, cada visita queda guardada.",
  },
  {
    icon: "🔒",
    title: "Privado por defecto",
    text: "Lo tuyo lo ves solo vos. Los demás ven únicamente lo que sumes a una carpeta compartida.",
  },
];

const STEPS = [
  { title: "Creá tu cuenta", text: "Gratis, con tu email." },
  { title: "Sumá lugares", text: "Buscalos por dirección o tocá el mapa." },
  { title: "Invitá a tu gente", text: "Con un link o desde tu lista de amigos." },
];

export default async function LandingPage(props: PageProps<"/">) {
  // Signed-in users go straight to their map.
  if (await getCurrentUser()) redirect(APP_HOME);
  const { cuenta } = await props.searchParams;

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4">
        <span className="flex items-center gap-2 font-semibold whitespace-nowrap text-stone-900">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-600 text-base text-white shadow-sm">
            🫶🏻
          </span>
          <span className="hidden min-[420px]:inline">Nuestro Camino</span>
        </span>
        <nav className="flex items-center gap-1 text-sm font-medium whitespace-nowrap sm:gap-2">
          <Link
            href="/login"
            className="rounded-lg px-2.5 py-1.5 text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 sm:px-3"
          >
            Iniciar sesión
          </Link>
          <Link href="/registro" className="btn-primary px-3 py-1.5">
            Crear cuenta
          </Link>
        </nav>
      </header>

      <main className="flex flex-col">
        {cuenta === "eliminada" && (
          <p
            role="status"
            className="mx-auto mb-2 w-full max-w-3xl rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-800"
          >
            Tu cuenta y tus datos fueron eliminados. ¡Gracias por haber usado{" "}
            Nuestro Camino!
          </p>
        )}
        {/* ---------- Hero ---------- */}
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 via-background to-background"
          />
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-brand-200)_1px,transparent_1px)] [background-size:22px_22px] opacity-40 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]"
          />
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 pt-16 pb-20 text-center sm:pt-24">
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-brand-700 shadow-sm ring-1 ring-brand-600/15">
              Gratis durante la beta
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance text-stone-900 sm:text-5xl">
              Los lugares que querés conocer,{" "}
              <span className="text-brand-600">con tu gente</span>.
            </h1>
            <p className="max-w-xl text-lg text-pretty text-stone-600">
              Un mapa compartido con tu pareja, tus amigos o tu familia: lo que
              tienen pendiente, lo que ya visitaron y los recuerdos de cada
              lugar.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href="/registro" className="btn-primary px-6 py-3 text-base">
                Empezar gratis
              </Link>
              <Link href="/login" className="btn-secondary px-6 py-3 text-base">
                Ya tengo cuenta
              </Link>
            </div>

            {/* A tiny map-like illustration with a few pins. */}
            <div
              aria-hidden
              className="card relative mt-6 h-48 w-full max-w-xl overflow-hidden bg-[#f2efe9] sm:h-56"
            >
              <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_46%,#fde68a_46%,#fde68a_49%,transparent_49%),linear-gradient(20deg,transparent_60%,#fde68a_60%,#fde68a_62%,transparent_62%)]" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-[#bfdbfe]/70" />
              {[
                { left: "18%", top: "30%", color: "bg-emerald-600", icon: "🍽" },
                { left: "46%", top: "18%", color: "bg-amber-500", icon: "🍷" },
                { left: "70%", top: "40%", color: "bg-emerald-600", icon: "✈️" },
                { left: "34%", top: "55%", color: "bg-amber-500", icon: "🎟" },
              ].map((pin) => (
                <span
                  key={pin.left}
                  className={`absolute grid size-9 -rotate-45 place-items-center rounded-[50%_50%_50%_0] border-[3px] border-white shadow-md ${pin.color}`}
                  style={{ left: pin.left, top: pin.top }}
                >
                  <span className="rotate-45 text-sm">{pin.icon}</span>
                </span>
              ))}
              <span className="absolute top-[22%] right-[8%] rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-md">
                📁 Mendoza 2026
              </span>
            </div>
          </div>
        </section>

        {/* ---------- Features ---------- */}
        <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-12 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card flex gap-4 p-5">
              <span
                className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-2xl ring-1 ring-brand-600/10"
                aria-hidden
              >
                {feature.icon}
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="font-semibold text-stone-900">{feature.title}</h2>
                <p className="text-sm text-stone-600">{feature.text}</p>
              </div>
            </div>
          ))}
        </section>

        {/* ---------- How it works ---------- */}
        <section className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 py-12">
          <h2 className="text-2xl font-semibold tracking-tight text-stone-900">
            Cómo funciona
          </h2>
          <ol className="grid w-full gap-4 sm:grid-cols-3">
            {STEPS.map((step, index) => (
              <li key={step.title} className="flex flex-col items-center gap-2 text-center">
                <span className="grid size-10 place-items-center rounded-full bg-brand-600 font-semibold text-white">
                  {index + 1}
                </span>
                <p className="font-semibold text-stone-900">{step.title}</p>
                <p className="text-sm text-stone-600">{step.text}</p>
              </li>
            ))}
          </ol>
          <Link href="/registro" className="btn-primary px-6 py-3 text-base">
            Crear mi cuenta
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
