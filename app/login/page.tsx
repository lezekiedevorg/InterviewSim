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
      <Card className="animate-scale-in">
        <div className="mb-5 text-center">
          <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-accent-500 font-heading text-sm font-bold text-white shadow-brand">
            IS
          </span>
          <h1 className="font-heading text-xl font-bold">
            {mode === "login" ? "Content de te revoir" : "Crée ton compte"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === "login"
              ? "Retrouve ta progression et tes débriefs."
              : "Gratuit — pour garder tes débriefs et suivre ta progression."}
          </p>
        </div>
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Mot de passe" type="password" value={password} onChange={setPassword} />
        {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
        {info && <p className="mb-2 text-sm text-emerald-700">{info}</p>}
        <Button className="w-full" onClick={submit}>
          {mode === "login" ? "Se connecter" : "Créer mon compte"}
        </Button>
        <div className="mt-3 flex justify-between text-sm">
          <button
            className="cursor-pointer font-medium text-brand-700 transition-colors duration-200 hover:text-brand-800"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
          {mode === "login" && (
            <button
              className="cursor-pointer text-slate-500 transition-colors duration-200 hover:text-slate-900"
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
