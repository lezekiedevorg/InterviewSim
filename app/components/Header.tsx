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
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-lg font-bold text-brand-700">
          InterviewSim
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {email ? (
            <>
              <Link href="/progression" className="text-slate-600 hover:text-slate-900">
                Ma progression
              </Link>
              <span className="hidden text-slate-400 sm:inline">{email}</span>
              <button onClick={signOut} className="text-slate-600 hover:text-slate-900">
                Se déconnecter
              </button>
            </>
          ) : (
            <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
              Se connecter
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
