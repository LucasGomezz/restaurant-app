"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { formatDate } from "@/lib/format";

type Role = "EDITOR" | "VIEWER";

const noSubscription = () => () => {};

/** Web Share (phones): false on the server, so hydration matches. */
function useCanShare() {
  return useSyncExternalStore(
    noSubscription,
    () => "share" in navigator,
    () => false,
  );
}

const ROLE_TEXT: Record<Role, string> = {
  EDITOR: "pueden editar",
  VIEWER: "solo pueden ver",
};

/**
 * The folder owner's join link: create one for a role, copy it, turn it off.
 * Creating a new link replaces the previous one.
 */
export function InvitePanel({
  link,
  role,
  expiresAt,
  onCreate,
  onRevoke,
}: {
  link: string | null;
  role: Role | null;
  expiresAt: string | null;
  onCreate: (role: Role) => Promise<void>;
  onRevoke: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const canShare = useCanShare();

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (!link) return;
    try {
      await navigator.share({ title: "Sumate a mi carpeta", url: link });
    } catch {
      // Cancelled or unsupported: the copy button is right there.
    }
  }

  const createButtons = (
    <div className="flex flex-wrap gap-2">
      {(["EDITOR", "VIEWER"] as const).map((option) => (
        <button
          key={option}
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => onCreate(option))}
          className={option === "EDITOR" ? "btn-primary" : "btn-secondary"}
        >
          {link ? "Nuevo link: " : "Link: "}
          {ROLE_TEXT[option]}
        </button>
      ))}
    </div>
  );

  if (!link || !role) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-stone-600">
          Generá un link y mandalo por WhatsApp o donde quieras. Quien lo abra
          (con su cuenta) se suma a la carpeta.
        </p>
        {createButtons}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-stone-600">
        Quienes entren con este link <strong>{ROLE_TEXT[role]}</strong>. Vence
        el {expiresAt ? formatDate(expiresAt) : "—"}.
      </p>
      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          aria-label="Link de invitación"
          onFocus={(event) => event.currentTarget.select()}
          className="input min-w-0 flex-1 font-mono text-xs"
        />
        <button type="button" onClick={copy} className="btn-secondary shrink-0">
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
        {canShare && (
          <button type="button" onClick={share} className="btn-secondary shrink-0">
            Compartir
          </button>
        )}
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-stone-500 hover:text-stone-900">
          Cambiar o desactivar el link
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          {createButtons}
          <button
            type="button"
            disabled={pending}
            onClick={() => startTransition(() => onRevoke())}
            className="self-start text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
          >
            Desactivar link
          </button>
        </div>
      </details>
    </div>
  );
}
