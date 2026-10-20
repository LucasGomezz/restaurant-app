"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser, getProfile } from "@/lib/auth/session";
import {
  PASSWORD_MIN_LENGTH,
  normalizeUsername,
  usernameError,
} from "@/lib/auth/validation";
import { createClient } from "@/lib/supabase/server";

/** `error` shows in red; `message` replaces the form with a notice. */
export type AuthState = { error?: string; message?: string } | undefined;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** The site's own origin, for the links Supabase emails. */
async function siteOrigin(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

function passwordError(password: string, confirm: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `La contraseña tiene que tener al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (password !== confirm) return "Las contraseñas no coinciden.";
  return null;
}

export async function login(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = str(formData, "email");
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Ingresá tu email y contraseña." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error?.code === "email_not_confirmed") {
    return {
      error:
        "Todavía no confirmaste tu email. Revisá tu bandeja de entrada (y el spam).",
    };
  }
  if (error) {
    return { error: "Email o contraseña incorrectos." };
  }

  redirect("/");
}

export async function signup(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = str(formData, "email");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (!email) return { error: "Ingresá tu email." };
  const invalidPassword = passwordError(password, confirm);
  if (invalidPassword) return { error: invalidPassword };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/confirm?next=/bienvenida`,
    },
  });

  if (error?.code === "weak_password") {
    return { error: "Esa contraseña es muy fácil de adivinar. Probá con otra." };
  }
  if (error?.code === "over_email_send_rate_limit") {
    return {
      error: "Se mandaron demasiados emails. Esperá unos minutos y probá de nuevo.",
    };
  }
  if (error) {
    return { error: "No pudimos crear la cuenta. Revisá el email y probá de nuevo." };
  }

  // Email confirmation turned off in Supabase: the user is already signed in.
  if (data.session) redirect("/bienvenida");

  // Same answer whether or not the email was already registered, so the form
  // can't be used to find out who has an account.
  return {
    message: `Te mandamos un email a ${email}. Abrí el link para activar tu cuenta.`,
  };
}

export async function requestPasswordReset(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = str(formData, "email");
  if (!email) return { error: "Ingresá tu email." };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/restablecer`,
  });

  if (error?.code === "over_email_send_rate_limit") {
    return {
      error: "Se mandaron demasiados emails. Esperá unos minutos y probá de nuevo.",
    };
  }

  // Same answer whether or not the account exists.
  return {
    message: `Si ${email} tiene una cuenta, te llega un email con un link para elegir una contraseña nueva.`,
  };
}

/** Sets a new password for the user signed in through the reset link. */
export async function updatePassword(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const invalidPassword = passwordError(password, confirm);
  if (invalidPassword) return { error: invalidPassword };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error?.code === "same_password") {
    return { error: "La contraseña nueva tiene que ser distinta a la anterior." };
  }
  if (error?.code === "weak_password") {
    return { error: "Esa contraseña es muy fácil de adivinar. Probá con otra." };
  }
  if (error) {
    return {
      error: "No pudimos cambiar la contraseña. Pedí un link nuevo y probá otra vez.",
    };
  }

  redirect("/");
}

export async function createProfile(
  _prevState: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (await getProfile(user.id)) redirect("/");

  const username = normalizeUsername(str(formData, "username"));
  const displayName = str(formData, "displayName");

  const invalidUsername = usernameError(username);
  if (invalidUsername) return { error: invalidUsername };
  if (!displayName) return { error: "Contanos cómo querés que te vean." };
  if (displayName.length > 50) {
    return { error: "El nombre puede tener hasta 50 caracteres." };
  }

  const taken = await db.orm.public.Profile.select("id")
    .where({ username })
    .first();
  if (taken) return { error: `@${username} ya está en uso. Probá con otro.` };

  try {
    await db.orm.public.Profile.create({ id: user.id, username, displayName });
  } catch (error) {
    // Lost a race for the same username against another sign-up?
    const takenNow = await db.orm.public.Profile.select("id")
      .where({ username })
      .first();
    if (takenNow) return { error: `@${username} ya está en uso. Probá con otro.` };
    throw error;
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
