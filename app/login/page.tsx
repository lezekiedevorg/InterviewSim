"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/authErrors";
import { Card } from "@/app/components/ui/Card";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setMsg(null);
    setInfo(null);
    // ponytail: supabase instantiated per-call so it never runs during server prerender
    const supabase = createBrowserSupabase();
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return setMsg(authErrorMessage(error.message));
      setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer ton email, puis connecte-toi.");
      setMode("login");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setMsg(authErrorMessage(error.message));
      router.push("/progression");
    }
  }

  async function forgot() {
    setMsg(null);
    setInfo(null);
    if (!email) return setMsg("Entre ton email d'abord.");
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    if (error) return setMsg(authErrorMessage(error.message));
    setInfo("Si un compte existe, un email de réinitialisation vient d'être envoyé.");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card className="p-6 animate-rise sm:p-7">
        <div className="mb-5 text-center">
          <span className="mx-auto mb-3 flex w-fit items-center justify-center">
            <svg width="34" height="34" viewBox="0 0 30 30" aria-hidden>
              <rect width="30" height="30" rx="9" fill="#ffb224" />
              <rect x="12" y="6" width="6" height="11" rx="3" fill="#14100a" />
              <path d="M9 14a6 6 0 0 0 12 0" stroke="#14100a" strokeWidth="2" fill="none" />
              <line x1="15" y1="20" x2="15" y2="24" stroke="#14100a" strokeWidth="2" />
            </svg>
          </span>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight text-cream">
            {mode === "login" ? "Content de te revoir" : "Crée ton compte"}
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {mode === "login"
              ? "Retrouve ta progression et tes débriefs."
              : "Gratuit — pour garder tes débriefs et suivre ta progression."}
          </p>
        </div>
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Mot de passe" type="password" value={password} onChange={setPassword} />
        {msg && <p className="mb-2 text-sm text-danger-400">{msg}</p>}
        {info && <p className="mb-2 text-sm text-ok">{info}</p>}
        <Button className="w-full" onClick={submit}>
          {mode === "login" ? "Se connecter" : "Créer mon compte"}
        </Button>
        <div className="mt-3 flex justify-between text-sm">
          <button
            className="cursor-pointer font-semibold text-amber-400 transition-colors duration-200 hover:text-amber-300"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
          {mode === "login" && (
            <button
              className="cursor-pointer text-muted transition-colors duration-200 hover:text-cream"
              onClick={forgot}
            >
              Mot de passe oublié ?
            </button>
          )}
        </div>
      </Card>
    </main>
  );
}
