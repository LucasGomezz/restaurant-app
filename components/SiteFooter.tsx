import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/** Footer of the public pages: legal links and contact. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200/80">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-stone-500 sm:flex-row">
        <span>
          © {new Date().getFullYear()} {LEGAL.productName}
        </span>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/terminos" className="transition hover:text-stone-900">
            Términos
          </Link>
          <Link href="/privacidad" className="transition hover:text-stone-900">
            Privacidad
          </Link>
          {LEGAL.contactEmail && (
            <a
              href={`mailto:${LEGAL.contactEmail}`}
              className="transition hover:text-stone-900"
            >
              Contacto
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}
