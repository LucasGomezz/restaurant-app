"use client";

import Link from "next/link";
import { useActionState, type InputHTMLAttributes } from "react";
import { FormError, FormNotice } from "@/components/FormError";
import {
  createProfile,
  login,
  requestPasswordReset,
  signup,
  updatePassword,
} from "@/lib/actions/auth";
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/auth/validation";

function Field({
  label,
  hint,
  id,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input id={id} name={id} className="input" {...input} />
      {hint && <p className="text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

function Submit({ pending, label, pendingLabel }: {
  pending: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <button type="submit" disabled={pending} className="btn-primary mt-2">
      {pending ? pendingLabel : label}
    </button>
  );
}

const emailField = (
  <Field
    id="email"
    label="Email"
    type="email"
    autoComplete="email"
    required
  />
);

/** "New password" + "repeat it", for sign-up and password reset. */
const newPasswordFields = (
  <>
    <Field
      id="password"
      label="Contraseña"
      type="password"
      autoComplete="new-password"
      minLength={PASSWORD_MIN_LENGTH}
      hint={`Al menos ${PASSWORD_MIN_LENGTH} caracteres.`}
      required
    />
    <Field
      id="confirmPassword"
      label="Repetí la contraseña"
      type="password"
      autoComplete="new-password"
      minLength={PASSWORD_MIN_LENGTH}
      required
    />
  </>
);

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      {emailField}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor="password" className="field-label">
            Contraseña
          </label>
          <Link href="/recuperar" className="link text-xs">
            ¿La olvidaste?
          </Link>
        </div>
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
      <Submit pending={pending} label="Ingresar" pendingLabel="Ingresando..." />
    </form>
  );
}

/** Once it succeeds, the form is replaced by its notice. */
export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);

  if (state?.message) return <FormNotice message={state.message} />;

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      {emailField}
      {newPasswordFields}
      <FormError message={state?.error} />
      <Submit
        pending={pending}
        label="Crear cuenta"
        pendingLabel="Creando cuenta..."
      />
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);

  if (state?.message) return <FormNotice message={state.message} />;

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      {emailField}
      <FormError message={state?.error} />
      <Submit
        pending={pending}
        label="Mandarme el link"
        pendingLabel="Enviando..."
      />
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      {newPasswordFields}
      <FormError message={state?.error} />
      <Submit
        pending={pending}
        label="Guardar contraseña"
        pendingLabel="Guardando..."
      />
    </form>
  );
}

export function ProfileForm({
  suggestedUsername,
}: {
  suggestedUsername: string;
}) {
  const [state, action, pending] = useActionState(createProfile, undefined);

  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <Field
        id="displayName"
        label="Tu nombre"
        autoComplete="name"
        maxLength={50}
        placeholder="Ej: Lucas"
        hint="Así te van a ver tus amigos."
        required
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="username" className="field-label">
          Usuario
        </label>
        <div className="flex items-center rounded-xl border border-stone-300 bg-white shadow-xs transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
          <span className="pl-3.5 text-base text-stone-400" aria-hidden>
            @
          </span>
          <input
            id="username"
            name="username"
            defaultValue={suggestedUsername}
            pattern={USERNAME_PATTERN}
            maxLength={USERNAME_MAX_LENGTH}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            className="w-full rounded-xl bg-transparent py-2.5 pr-3.5 pl-1 text-base text-stone-900 outline-none"
          />
        </div>
        <p className="text-xs text-stone-500">
          Minúsculas, números, puntos y guiones bajos. Sirve para que te
          encuentren sin compartir tu email.
        </p>
      </div>
      <FormError message={state?.error} />
      <Submit pending={pending} label="Empezar" pendingLabel="Guardando..." />
    </form>
  );
}
