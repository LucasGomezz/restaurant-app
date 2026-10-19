import Link from "next/link";

export function EmptyState({
  icon,
  message,
  actionHref,
  actionLabel,
}: {
  icon: string;
  message: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/60 px-6 py-14 text-center">
      <span className="text-4xl" aria-hidden>
        {icon}
      </span>
      <p className="max-w-xs text-sm text-stone-500">{message}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-primary mt-2">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
