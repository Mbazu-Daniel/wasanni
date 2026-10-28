import * as React from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "wasanni:theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const listeners = new Set<() => void>();
let preference: ThemePreference = "system";

function isThemePreference(value: string | null): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function resolveTheme(of: ThemePreference): ResolvedTheme {
  if (of !== "system") return of;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function paint() {
  document.documentElement.dataset.theme = resolveTheme(preference);
}

export function setTheme(next: ThemePreference) {
  preference = next;
  window.localStorage.setItem(THEME_STORAGE_KEY, next);
  paint();
  for (const listener of listeners) listener();
}

if (typeof window !== "undefined") {
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  preference = isThemePreference(stored) ? stored : "system";
  paint();
  window.matchMedia(DARK_QUERY).addEventListener("change", () => {
    paint();
    for (const listener of listeners) listener();
  });
}

function getSnapshot() {
  return preference;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useTheme() {
  const value = React.useSyncExternalStore(subscribe, getSnapshot, () => "system" as ThemePreference);
  return {
    preference: value,
    resolved: typeof window === "undefined" ? ("light" as ResolvedTheme) : resolveTheme(value),
    set: setTheme,
  };
}

export const THEME_SCRIPT = `(function(){try{var v=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var r=v==="light"||v==="dark"?v:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",r);}catch(e){}})();`;
