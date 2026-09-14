"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { OUTIL_OUVERT } from "@/lib/lancement";
import { SpeechLoopMark } from "@/app/components/brand/SpeechLoopMark";

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
        <Link href="/" className="group -ml-1 flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center gap-2 rounded-pill px-1.5 font-heading text-sm font-semibold tracking-tight text-cream transition-colors duration-studio ease-studio hover:bg-cream/5 sm:justify-start sm:gap-2.5 sm:text-lg">
          <span className="text-amber-400 transition-transform duration-studio ease-studio group-hover:-rotate-3 group-hover:scale-105">
            <SpeechLoopMark size={32} animate />
          </span>
          {/* Le nom complet revient à partir de 640 px. En dessous, mesuré :
              il provoque un débordement dès 414 px, et la pastille suffit à
              porter la marque. */}
          <span className="hidden sm:inline">
            Say It <span className="text-amber-400">Aloud</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2 text-sm sm:gap-3">
          {/* Tant que l'outil n'est pas ouvert, aucune entrée ne doit y mener :
              un visiteur venu d'un partage n'a rien à faire dans l'application.
              La bascule de thème, elle, reste : c'est un confort de lecture. */}
          {OUTIL_OUVERT && (
            <Link
              href="/entrainement"
              className="hidden min-h-[44px] items-center whitespace-nowrap rounded-full px-2 text-[13px] font-semibold text-muted transition-colors duration-studio ease-studio hover:bg-cream/10 hover:text-cream min-[360px]:inline-flex sm:px-3 sm:text-sm"
            >
              Entraînement
            </Link>
          )}
          {!OUTIL_OUVERT ? null : email ? (
            <>
              <Link
                href="/progression"
                className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-2 text-[13px] font-semibold text-muted transition-colors duration-studio ease-studio hover:bg-cream/10 hover:text-cream sm:px-3 sm:text-sm"
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
              className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full border-[1.5px] border-cream/30 px-3 text-[13px] font-semibold text-cream transition-colors duration-studio ease-studio hover:border-amber-400 hover:bg-amber-400/10 sm:px-4 sm:text-sm"
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
