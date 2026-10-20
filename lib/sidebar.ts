/**
 * Cookie with the desktop sidebar state ("collapsed" | "open"): written by
 * the AppShell toggle, read by the (app) layout so the first render matches.
 * Lives outside AppShell because server code can't import values from a
 * "use client" module.
 */
export const SIDEBAR_COOKIE = "sidebar";
