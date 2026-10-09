"use client";

import { useEffect, useLayoutEffect } from "react";
import { applyTheme, readSavedTheme, resolveTheme, saveTheme } from "@/lib/theme";

export function ThemeToggle() {
  // React's dev-mode remount resets <html> attributes set by the head script.
  useLayoutEffect(() => applyTheme(resolveTheme()), []);

  // Until the user picks a theme, follow system changes.
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (!readSavedTheme()) applyTheme(resolveTheme());
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const toggle = () =>
    saveTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");

  // Both icons are rendered and CSS shows the right one, so it is correct before hydration.
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar entre modo claro y oscuro"
      title="Cambiar tema"
      className="rounded-full p-2 text-muted transition hover:bg-surface-muted hover:text-foreground"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="size-5 dark:hidden"
      >
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
        className="hidden size-5 dark:block"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    </button>
  );
}
