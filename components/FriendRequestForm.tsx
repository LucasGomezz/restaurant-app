"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import { sendFriendRequest } from "@/lib/actions/friends";
import { USERNAME_MAX_LENGTH } from "@/lib/auth/validation";

/** Sends a friend request to an exact @username. */
export function FriendRequestForm() {
  const [state, action, pending] = useActionState(sendFriendRequest, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-xl border border-stone-300 bg-white shadow-xs transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
          <span className="pl-3.5 text-base text-stone-400" aria-hidden>
            @
          </span>
          <input
            name="username"
            required
            maxLength={USERNAME_MAX_LENGTH + 1}
            placeholder="usuario"
            aria-label="Usuario de tu amigo"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-xl bg-transparent py-2.5 pr-3.5 pl-1 text-base text-stone-900 outline-none"
          />
        </div>
        <button type="submit" disabled={pending} className="btn-primary shrink-0">
          {pending ? "Enviando..." : "Agregar"}
        </button>
      </div>
      <FormError message={state?.error} />
      <FormNotice message={state?.message} />
    </form>
  );
}
