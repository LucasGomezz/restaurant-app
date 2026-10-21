import Link from "next/link";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/SiteFooter";
import { formatDate } from "@/lib/format";
import { LEGAL, legalConfigMissing } from "@/lib/legal";

/** Frame for /terminos and /privacidad: readable column, header and footer. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold text-stone-900">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-base text-white shadow-sm">
            🫶🏻
          </span>
          {LEGAL.productName}
        </Link>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pt-6 pb-16">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900">{title}</h1>
        <p className="mt-2 text-sm text-stone-500">
          Última actualización: {formatDate(LEGAL.lastUpdated)}
        </p>
        {legalConfigMissing() && (
          <p className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠️ Falta configurar <code>LEGAL_OWNER_NAME</code> y/o{" "}
            <code>CONTACT_EMAIL</code>: este texto no debe publicarse así.
          </p>
        )}
        <div className="legal mt-8 flex flex-col gap-6 text-[15px] leading-relaxed text-stone-700">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold text-stone-900">{title}</h2>
      {children}
    </section>
  );
}

/** "Juan Pérez (hola@ejemplo.com)", or a visible placeholder when unset. */
export function Owner() {
  return (
    <strong>
      {LEGAL.ownerName || "[responsable sin configurar]"} (
      {LEGAL.contactEmail ? (
        <a href={`mailto:${LEGAL.contactEmail}`} className="link">
          {LEGAL.contactEmail}
        </a>
      ) : (
        "[email sin configurar]"
      )}
      )
    </strong>
  );
}
