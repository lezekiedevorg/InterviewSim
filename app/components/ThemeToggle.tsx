"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  BASCULE CLAIR / SOMBRE
 * ─────────────────────────────────────────────────────────────────────────────
 *  Trois points de rigueur :
 *
 *  1. Le thème est posé par un script en ligne dans <head> (voir layout.tsx),
 *     donc AVANT la première peinture. Sans ça, on voit un flash crème puis
 *     le passage au brun — le défaut classique des thèmes React.
 *  2. L'état n'est lu qu'après le montage : le rendu serveur ne peut pas
 *     connaître le choix du visiteur, et s'en servir produirait une erreur
 *     d'hydratation.
 *  3. `prefers-color-scheme` sert de valeur initiale, puis le choix explicite
 *     l'emporte et persiste.
 */

import { useEffect, useState } from "react";

const STORAGE_KEY = "isim-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  // null tant qu'on n'a pas monté : évite de rendre une icône qui ne
  // correspond pas au thème réellement appliqué.
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
    try {
      localStorage.setItem(STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* Navigation privée : le thème reste appliqué, il ne persiste juste pas. */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={
        dark === null
          ? "Basculer le thème"
          : dark
            ? "Passer au thème clair"
            : "Passer au thème sombre"
      }
      aria-pressed={dark === true}
      title="Thème clair / sombre"
      className={`grid h-10 w-10 shrink-0 place-items-center rounded-pill border-[1.5px] border-border bg-surface text-ink-muted transition-all duration-studio ease-studio hover:-translate-y-px hover:border-border-strong hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-accent/20 ${className}`}
    >
      {/* Les deux icônes sont toujours rendues : le contraste est géré par
          l'opacité, donc pas de saut de mise en page au basculement. */}
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"
        aria-hidden="true"
        style={{ display: dark ? "none" : "block" }}
      >
        <circle cx="12" cy="12" r="4.2" />
        <path d="M12 2.4v2.1M12 19.5v2.1M4.3 4.3l1.5 1.5M18.2 18.2l1.5 1.5M2.4 12h2.1M19.5 12h2.1M4.3 19.7l1.5-1.5M18.2 5.8l1.5-1.5" />
      </svg>
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"
        aria-hidden="true"
        style={{ display: dark ? "block" : "none" }}
      >
        <path d="M20.5 14.3A8.6 8.6 0 1 1 9.7 3.5a6.9 6.9 0 0 0 10.8 10.8z" />
      </svg>
    </button>
  );
}
