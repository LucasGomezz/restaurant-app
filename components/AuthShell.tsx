import type { ReactNode } from "react";

/**
 * Frame for the account screens (login, sign-up, password reset, welcome):
 * brand header, a card with the form, and an optional footer below it.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative isolate flex flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-12">
      {/* Decorative background: brand wash with a faint dotted map grid. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-brand-50 via-background to-amber-50"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(var(--color-brand-200)_1px,transparent_1px)] [background-size:22px_22px] opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
      />

      <div className="flex w-full max-w-sm flex-col gap-5">
        <div className="card flex flex-col gap-7 p-8 shadow-xl">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-brand-600 text-2xl text-white shadow-sm">
              🫶🏻
            </span>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-tight text-stone-900">
                {title}
              </h1>
              {description && (
                <p className="text-sm text-stone-500">{description}</p>
              )}
            </div>
          </div>
          {children}
        </div>
        {footer && (
          <div className="text-center text-sm text-stone-600">{footer}</div>
        )}
      </div>
    </div>
  );
}
