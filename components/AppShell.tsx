"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { logout } from "@/lib/actions/auth";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

export type SidebarFolder = {
  id: string;
  name: string;
  icon: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
};

const SECTIONS = [
  { href: "/", label: "Mapa", icon: "🗺️" },
  { href: "/pendientes", label: "Pendientes", icon: "📍" },
  { href: "/visitados", label: "Visitados", icon: "📸" },
  { href: "/tipos", label: "Tipos", icon: "🏷️" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

/**
 * The signed-in frame: top bar, a sidebar with the sections and the user's
 * folders, and the page. On desktop the sidebar can fold to an icon rail;
 * on phones it is a drawer opened from the ☰ button.
 */
export function AppShell({
  username,
  folders,
  initiallyCollapsed,
  children,
}: {
  username: string;
  folders: SidebarFolder[];
  initiallyCollapsed: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "open"}; path=/; max-age=31536000; samesite=lax`;
  }

  // The drawer is a modal: Escape closes it.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="z-[1000] border-b border-stone-200/80 bg-white/90 backdrop-blur">
        <div className="flex w-full items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menú"
            className="grid size-9 cursor-pointer place-items-center rounded-lg text-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 md:hidden"
          >
            ☰
          </button>
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 font-semibold text-stone-900"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-base text-white shadow-sm">
              🫶🏻
            </span>
            <span className="hidden sm:inline">Nuestro Camino</span>
          </Link>

          <div className="flex-1" />

          <Link href="/lugares/nuevo" className="btn-primary shrink-0 px-3 py-1.5">
            <span aria-hidden>+</span>
            <span>Agregar</span>
          </Link>
          <form action={logout} className="flex items-center">
            <span
              className="hidden max-w-32 truncate pl-1 text-sm text-stone-500 md:inline"
              title={`@${username}`}
            >
              @{username}
            </span>
            <button
              type="submit"
              title="Cerrar sesión"
              className="cursor-pointer rounded-lg px-2 py-1.5 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop: fixed sidebar that folds to an icon rail. */}
        <aside
          className={`hidden shrink-0 flex-col border-r border-stone-200/80 bg-white/70 transition-[width] duration-200 md:flex ${
            collapsed ? "w-16" : "w-64"
          }`}
        >
          <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
            <SidebarNav folders={folders} collapsed={collapsed} />
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir menú" : "Plegar menú"}
            title={collapsed ? "Expandir menú" : "Plegar menú"}
            className="flex cursor-pointer items-center gap-2 border-t border-stone-200/80 px-5 py-3 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <span aria-hidden className="text-base">
              {collapsed ? "»" : "«"}
            </span>
            {!collapsed && <span>Plegar menú</span>}
          </button>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Phones: the same menu as a drawer. */}
      {drawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menú"
          className="fixed inset-0 z-[1500] md:hidden"
        >
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 cursor-default bg-stone-950/40"
          />
          <div className="slide-in-left absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <span className="font-semibold text-stone-900">Nuestro Camino</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Cerrar menú"
                className="grid size-9 cursor-pointer place-items-center rounded-full text-lg text-stone-500 transition hover:bg-stone-100"
              >
                ✕
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav
                folders={folders}
                collapsed={false}
                onNavigate={() => setDrawerOpen(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Sections and folders; `collapsed` shows icons only (with tooltips). */
function SidebarNav({
  folders,
  collapsed,
  onNavigate,
}: {
  folders: SidebarFolder[];
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const item = (active: boolean) =>
    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
      collapsed ? "justify-center" : ""
    } ${
      active
        ? "bg-brand-50 text-brand-700"
        : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
    }`;

  return (
    <nav aria-label="Secciones" className="flex flex-col gap-5 p-3">
      <ul className="flex flex-col gap-0.5">
        {SECTIONS.map((section) => {
          const active = isActive(pathname, section.href);
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? section.label : undefined}
                className={item(active)}
              >
                <span aria-hidden className="w-5 shrink-0 text-center text-base">
                  {section.icon}
                </span>
                {!collapsed && <span className="truncate">{section.label}</span>}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-1">
        {collapsed ? (
          <div className="mx-2 border-t border-stone-200" />
        ) : (
          <div className="flex items-center justify-between px-3">
            <Link
              href="/carpetas"
              onClick={onNavigate}
              className={`text-xs font-semibold tracking-wide uppercase transition ${
                pathname === "/carpetas"
                  ? "text-brand-700"
                  : "text-stone-400 hover:text-stone-700"
              }`}
            >
              Carpetas
            </Link>
            <Link
              href="/carpetas/nueva"
              onClick={onNavigate}
              aria-label="Nueva carpeta"
              title="Nueva carpeta"
              className="grid size-6 place-items-center rounded-md text-base text-stone-400 transition hover:bg-stone-100 hover:text-brand-700"
            >
              +
            </Link>
          </div>
        )}

        <ul className="flex flex-col gap-0.5">
          {folders.map((folder) => {
            const active = pathname.startsWith(`/carpetas/${folder.id}`);
            return (
              <li key={folder.id}>
                <Link
                  href={`/carpetas/${folder.id}`}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? folder.name : undefined}
                  className={item(active)}
                >
                  <span aria-hidden className="w-5 shrink-0 text-center text-base">
                    {folder.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                      {folder.role === "VIEWER" && (
                        <span
                          className="text-xs text-stone-400"
                          title="Solo ver"
                          aria-label="Solo ver"
                        >
                          👀
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
          {collapsed ? (
            <li>
              <Link
                href="/carpetas/nueva"
                onClick={onNavigate}
                title="Nueva carpeta"
                aria-label="Nueva carpeta"
                className={item(pathname === "/carpetas/nueva")}
              >
                <span aria-hidden className="w-5 text-center text-base">
                  ＋
                </span>
              </Link>
            </li>
          ) : (
            folders.length === 0 && (
              <li>
                <Link
                  href="/carpetas/nueva"
                  onClick={onNavigate}
                  className="block rounded-lg px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-brand-700"
                >
                  Creá tu primera carpeta para compartir lugares.
                </Link>
              </li>
            )
          )}
        </ul>
      </div>
    </nav>
  );
}
