"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
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
  { href: "/mapa", label: "Mapa", icon: "🗺️" },
  { href: "/pendientes", label: "Pendientes", icon: "📍" },
  { href: "/visitados", label: "Visitados", icon: "📸" },
  { href: "/tipos", label: "Tipos", icon: "🏷️" },
  { href: "/amigos", label: "Amigos", icon: "👥" },
  { href: "/cuenta", label: "Mi cuenta", icon: "⚙️" },
];

function isActive(pathname: string, href: string, mapFolder: string | null) {
  // "Mapa" is the unfiltered map; a folder filter highlights the folder instead.
  if (href === "/mapa") return pathname === "/mapa" && !mapFolder;
  return pathname.startsWith(href);
}

/**
 * The signed-in frame: top bar, a sidebar with the sections and the user's
 * folders, and the page. On desktop the sidebar can fold to an icon rail;
 * on phones it is a drawer opened from the ☰ button.
 */
export function AppShell({
  username,
  folders,
  friendRequests,
  initiallyCollapsed,
  children,
}: {
  username: string;
  folders: SidebarFolder[];
  /** Friend requests waiting for an answer: a badge on "Amigos". */
  friendRequests: number;
  initiallyCollapsed: boolean;
  children: ReactNode;
}) {
  const badges = { "/amigos": friendRequests };
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
            aria-label={
              friendRequests > 0
                ? "Abrir menú (tenés solicitudes de amistad)"
                : "Abrir menú"
            }
            className="relative grid size-9 cursor-pointer place-items-center rounded-lg text-xl text-stone-600 transition hover:bg-stone-100 hover:text-stone-900 md:hidden"
          >
            ☰
            {friendRequests > 0 && (
              <span className="absolute top-1 right-1 size-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>
          <Link
            href="/mapa"
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
            <Link
              href="/cuenta"
              className="hidden max-w-36 truncate rounded-lg px-2 py-1.5 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 md:inline"
              title="Mi cuenta"
            >
              @{username}
            </Link>
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
            <SidebarNav folders={folders} badges={badges} collapsed={collapsed} />
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
                badges={badges}
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
  badges,
  collapsed,
  onNavigate,
}: {
  folders: SidebarFolder[];
  /** Counts shown next to a section, by its href. */
  badges: Record<string, number>;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // A folder picked in the menu filters the main map (/mapa?carpeta=<id>).
  const mapFolder = pathname === "/mapa" ? searchParams.get("carpeta") : null;

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
          const active = isActive(pathname, section.href, mapFolder);
          const badge = badges[section.href] ?? 0;
          return (
            <li key={section.href}>
              <Link
                href={section.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={collapsed ? section.label : undefined}
                className={item(active)}
              >
                <span aria-hidden className="relative w-5 shrink-0 text-center text-base">
                  {section.icon}
                  {collapsed && badge > 0 && (
                    <span className="absolute -top-0.5 -right-1 size-2.5 rounded-full bg-red-500 ring-2 ring-white" />
                  )}
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1 truncate">{section.label}</span>
                )}
                {!collapsed && badge > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
                    {badge}
                  </span>
                )}
                {badge > 0 && (
                  <span className="sr-only">
                    {` (${badge} ${badge === 1 ? "solicitud pendiente" : "solicitudes pendientes"})`}
                  </span>
                )}
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
            const active =
              mapFolder === folder.id || pathname.startsWith(`/carpetas/${folder.id}`);
            return (
              <li key={folder.id} className="group/folder relative">
                {/* Tapping a folder filters the map; ⚙️ opens the folder itself. */}
                <Link
                  href={`/mapa?carpeta=${folder.id}`}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? folder.name : undefined}
                  className={`${item(active)} ${collapsed ? "" : "pr-10"}`}
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
                {!collapsed && (
                  <Link
                    href={`/carpetas/${folder.id}`}
                    onClick={onNavigate}
                    aria-label={`Abrir la carpeta ${folder.name}`}
                    title="Abrir la carpeta (miembros, invitar)"
                    className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-md text-sm text-stone-400 transition hover:bg-stone-200 hover:text-stone-700 md:opacity-0 md:group-hover/folder:opacity-100 md:focus:opacity-100"
                  >
                    ⚙️
                  </Link>
                )}
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
