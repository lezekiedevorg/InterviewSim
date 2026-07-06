"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

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
    <header className="sticky top-3 z-20 px-3">
      <div className="mx-auto flex max-w-3xl items-center justify-between rounded-2xl border border-white/70 bg-white/80 px-4 py-2.5 shadow-card ring-1 ring-brand-600/5 backdrop-blur-xl">
        <Link href="/" className="group flex items-center gap-2 font-heading text-lg font-bold text-slate-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 text-sm text-white shadow-brand transition-transform duration-200 group-hover:scale-105 group-hover:rotate-3">
            IS
          </span>
          Interview<span className="text-gradient">Sim</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {email ? (
            <>
              <Link
                href="/progression"
                className="rounded-lg px-2 py-1 text-slate-600 transition-colors duration-200 hover:bg-brand-50 hover:text-brand-700"
              >
                Ma progression
              </Link>
              <span className="hidden text-slate-400 sm:inline">{email}</span>
              <button
                onClick={signOut}
                className="cursor-pointer rounded-lg px-2 py-1 text-slate-600 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900"
              >
                Se déconnecter
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 px-4 py-1.5 font-semibold text-white shadow-brand transition-all duration-200 hover:shadow-glow hover:brightness-105"
            >
              Se connecter
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
