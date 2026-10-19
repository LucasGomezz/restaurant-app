"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";

const LINKS = [
  { href: "/", label: "Mapa" },
  { href: "/pendientes", label: "Pendientes" },
  { href: "/visitados", label: "Visitados" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavBar() {
  const pathname = usePathname();

  return (
    <header className="z-[1000] border-b border-stone-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold text-stone-900"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-base text-white shadow-sm">
            🫶🏻
          </span>
          <span className="hidden sm:inline">Nuestro Camino</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1 overflow-x-auto text-sm font-medium">
          {LINKS.map((link) => {
            const active = isActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-lg px-3 py-1.5 whitespace-nowrap transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/lugares/nuevo"
          className="btn-primary shrink-0 px-3 py-1.5"
        >
          <span aria-hidden>+</span>
          <span>Agregar</span>
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="cursor-pointer rounded-lg px-2 py-1.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
          >
            Salir
          </button>
        </form>
      </div>
    </header>
  );
}
