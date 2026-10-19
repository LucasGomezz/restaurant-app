"use client";

import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { FormError } from "@/components/FormError";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="input"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="field-label">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="input"
        />
      </div>
      <FormError message={state?.error} />
      <button type="submit" disabled={pending} className="btn-primary mt-2">
        {pending ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
