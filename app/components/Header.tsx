"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { OUTIL_OUVERT } from "@/lib/lancement";

// Logo « Studio nuit » : micro sur pastille ambre.
function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
      <rect width="30" height="30" rx="9" fill="var(--accent)" />
      <rect x="12" y="6" width="6" height="11" rx="3" fill="var(--accent-ink)" />
      <path d="M9 14a6 6 0 0 0 12 0" stroke="var(--accent-ink)" strokeWidth="2" fill="none" />
      <line x1="15" y1="20" x2="15" y2="24" stroke="var(--accent-ink)" strokeWidth="2" />
    </svg>
  );
}

export function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Inutile d'instancier Supabase tant qu'il n'y a pas de connexion à
    // proposer : on éviterait un client inerte et une requête réseau perdue.
    if (!OUTIL_OUVERT) return;

    // ponytail: supabase instantiated here so it never runs during server prerender
    const supabase = createBrowserSupabase();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    const supabase = createBrowserSupabase();
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-20 bg-night-900/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <Link href="/" className="group flex min-w-0 items-center gap-2 font-heading text-sm font-extrabold tracking-tight text-cream sm:gap-2.5 sm:text-lg">
          <span className="transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3">
            <Logo />
          </span>
          Interview<span className="text-amber-400">Sim</span>
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          {/* Tant que l'outil n'est pas ouvert, aucune entrée ne doit y mener :
              un visiteur venu d'un partage n'a rien à faire dans l'application.
              La bascule de thème, elle, reste : c'est un confort de lecture. */}
          {OUTIL_OUVERT && (
            <Link
              href="/entrainement"
              className="whitespace-nowrap rounded-full px-2 py-1.5 text-[13px] font-semibold text-muted transition-colors duration-200 hover:bg-cream/10 hover:text-cream sm:px-3 sm:text-sm"
            >
              Entraînement
            </Link>
          )}
          {!OUTIL_OUVERT ? null : email ? (
            <>
              <Link
                href="/progression"
                className="whitespace-nowrap rounded-full px-2 py-1.5 text-[13px] font-semibold text-muted transition-colors duration-200 hover:bg-cream/10 hover:text-cream sm:px-3 sm:text-sm"
              >
                Ma progression
              </Link>
              <span className="hidden text-faint lg:inline">{email}</span>
              <button
                onClick={signOut}
                aria-label="Se déconnecter"
                className="cursor-pointer rounded-full px-2 py-1.5 font-semibold text-muted transition-colors duration-200 hover:bg-cream/10 hover:text-cream sm:px-3"
              >
                {/* mobile : icône seule ; tablette+ : libellé */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px] sm:hidden" aria-hidden>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span className="hidden sm:inline">Se déconnecter</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="whitespace-nowrap rounded-full border border-cream/30 px-3 py-2 text-[13px] font-semibold text-cream transition-colors duration-200 hover:border-amber-400 hover:bg-amber-400/10 sm:px-4 sm:text-sm"
            >
              Se connecter
            </Link>
          )}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
