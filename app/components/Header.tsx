"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

// Logo « Studio nuit » : micro sur pastille ambre.
function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden>
      <rect width="30" height="30" rx="9" fill="#ffb224" />
      <rect x="12" y="6" width="6" height="11" rx="3" fill="#14100a" />
      <path d="M9 14a6 6 0 0 0 12 0" stroke="#14100a" strokeWidth="2" fill="none" />
      <line x1="15" y1="20" x2="15" y2="24" stroke="#14100a" strokeWidth="2" />
    </svg>
  );
}

export function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
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
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Link href="/" className="group flex items-center gap-2.5 font-heading text-lg font-extrabold tracking-tight text-cream">
          <span className="transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3">
            <Logo />
          </span>
          Interview<span className="text-amber-400">Sim</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href="/entrainement"
            className="whitespace-nowrap rounded-full px-2 py-1.5 text-[13px] font-semibold text-muted transition-colors duration-200 hover:bg-cream/10 hover:text-cream sm:px-3 sm:text-sm"
          >
            Entraînement
          </Link>
          {email ? (
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
              className="rounded-full border border-cream/30 px-4 py-2 font-semibold text-cream transition-colors duration-200 hover:border-amber-400 hover:bg-amber-400/10"
            >
              Se connecter
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
