/** Shared by the auth forms (as input hints) and the Server Actions (as rules). */

export const PASSWORD_MIN_LENGTH = 8;

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
/** Lowercase letters, numbers, dots and underscores. */
export const USERNAME_PATTERN = "[a-z0-9._]{3,20}";

// Handles that would look official or collide with app routes.
const RESERVED_USERNAMES = new Set([
  "admin",
  "administrador",
  "soporte",
  "support",
  "ayuda",
  "help",
  "api",
  "auth",
  "login",
  "registro",
  "bienvenida",
  "nuestrocamino",
]);

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, "").toLowerCase();
}

/** Returns an error message, or null when the username is valid. */
export function usernameError(username: string): string | null {
  if (
    username.length < USERNAME_MIN_LENGTH ||
    username.length > USERNAME_MAX_LENGTH
  ) {
    return `El usuario tiene que tener entre ${USERNAME_MIN_LENGTH} y ${USERNAME_MAX_LENGTH} caracteres.`;
  }
  if (!new RegExp(`^${USERNAME_PATTERN}$`).test(username)) {
    return "Usá solo minúsculas, números, puntos y guiones bajos.";
  }
  if (/^[._]|[._]$|\.\./.test(username)) {
    return "No puede empezar ni terminar con punto o guion bajo, ni tener dos puntos seguidos.";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "Ese usuario no está disponible.";
  }
  return null;
}

/** A starting suggestion from the email, e.g. "Lucas.Gomez+x@…" → "lucas.gomez". */
export function suggestUsername(email: string | undefined): string {
  const local = (email ?? "").split("@")[0].split("+")[0].toLowerCase();
  return local
    .replace(/[^a-z0-9._]/g, "")
    .replace(/^[._]+|[._]+$/g, "")
    .replace(/\.{2,}/g, ".")
    .slice(0, USERNAME_MAX_LENGTH);
}

/**
 * Only same-site paths are allowed as post-login destinations, so a crafted
 * link can't bounce the user to another site.
 */
export function safeNextPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.startsWith("/\\")) return "/";
  return value;
}
