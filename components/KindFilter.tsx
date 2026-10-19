import Link from "next/link";
import { KIND_ORDER, KINDS, type PlaceKind } from "@/lib/places";

type KindFilterProps = {
  /** Page the chips link to, e.g. "/pendientes". */
  basePath: string;
  active?: PlaceKind;
  /** Icon-only chips on small screens (used over the map). */
  compact?: boolean;
};

export function KindFilter({ basePath, active, compact }: KindFilterProps) {
  const options = [
    { href: basePath, label: "Todos", icon: null, selected: !active },
    ...KIND_ORDER.map((kind) => ({
      href: `${basePath}?tipo=${KINDS[kind].slug}`,
      label: KINDS[kind].plural,
      icon: KINDS[kind].icon,
      selected: active === kind,
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
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium shadow-xs transition ${
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
    </nav>
  );
}
