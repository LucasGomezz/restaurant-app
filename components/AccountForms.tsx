"use client";

import { useActionState } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import { deleteAccount, updateDisplayName } from "@/lib/actions/account";

export function DisplayNameForm({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(updateDisplayName, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="displayName" className="field-label">
        Tu nombre
      </label>
      <div className="flex gap-2">
        <input
          id="displayName"
          name="displayName"
          defaultValue={displayName}
          maxLength={50}
          required
          className="input min-w-0 flex-1"
        />
        <button type="submit" disabled={pending} className="btn-secondary shrink-0">
          {pending ? "Guardando..." : "Guardar"}
        </button>
      </div>
      <FormError message={state?.error} />
      <FormNotice message={state?.message} />
    </form>
  );
}

export function DeleteAccountForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(deleteAccount, undefined);

  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="confirm" className="text-sm text-stone-700">
        Para confirmar, escribí tu usuario <strong>{username}</strong>:
      </label>
      <input
        id="confirm"
        name="confirm"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required
        className="input"
      />
      <FormError message={state?.error} />
      <button type="submit" disabled={pending} className="btn-danger self-start">
        {pending ? "Eliminando..." : "Eliminar mi cuenta para siempre"}
      </button>
    </form>
  );
}
