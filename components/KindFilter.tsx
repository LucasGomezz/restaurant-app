import Link from "next/link";
import type { PlaceType } from "@/lib/places";

type KindFilterProps = {
  /** Page the chips link to, e.g. "/pendientes". */
  basePath: string;
  /** Built-in kinds and custom categories. */
  types: PlaceType[];
  active?: PlaceType;
  /** Icon-only chips on small screens (used over the map). */
  compact?: boolean;
  /** Other filters the chips keep, e.g. `{ carpeta: "…" }` on the map. */
  keep?: Record<string, string>;
};

const CHIP =
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-xs transition";

export function KindFilter({
  basePath,
  types,
  active,
  compact,
  keep,
}: KindFilterProps) {
  const hrefFor = (tipo?: string) => {
    const params = new URLSearchParams(keep);
    if (tipo) params.set("tipo", tipo);
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };
  const options = [
    { href: hrefFor(), label: "Todos", icon: null, selected: !active },
    ...types.map((type) => ({
      href: hrefFor(type.slug),
      label: type.plural,
      icon: type.icon,
      selected: active?.key === type.key,
    })),
  ];

  return (
    <nav aria-label="Filtrar por tipo" className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          aria-current={option.selected ? "page" : undefined}
          title={option.label}
          className={`${CHIP} ${
            option.selected
              ? "border-brand-600 bg-brand-600 text-white"
              : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900"
          }`}
        >
          {option.icon && <span aria-hidden>{option.icon}</span>}
          <span className={compact && option.icon ? "hidden sm:inline" : ""}>
            {option.label}
          </span>
        </Link>
      ))}
      {!compact && (
        <Link
          href="/tipos"
          title="Crear o editar tipos"
          className={`${CHIP} border-dashed border-stone-300 bg-transparent text-stone-500 hover:border-stone-400 hover:text-stone-900`}
        >
          <span aria-hidden>＋</span>
          Tipos
        </Link>
      )}
    </nav>
  );
}
