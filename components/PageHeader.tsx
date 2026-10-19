import Link from "next/link";

type PageHeaderProps = {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  children?: React.ReactNode;
};

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = "Volver",
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {backHref && (
        <Link
          href={backHref}
          className="self-start text-sm font-medium text-stone-500 transition hover:text-stone-900"
        >
          ← {backLabel}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-stone-500">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
