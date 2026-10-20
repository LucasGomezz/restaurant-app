/** Round badge with a person's initial. */
export function Avatar({ name }: { name: string }) {
  return (
    <span
      className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white"
      aria-hidden
    >
      {name.slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
