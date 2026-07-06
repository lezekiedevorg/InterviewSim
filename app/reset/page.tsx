"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/authErrors";
import { Card } from "@/app/components/ui/Card";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";

export default function ResetPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();

  async function submit() {
    setMsg(null);
    // ponytail: supabase instantiated here so it never runs during server prerender
    const supabase = createBrowserSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMsg(authErrorMessage(error.message));
    router.push("/progression");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card className="p-6 animate-rise sm:p-7">
        <h1 className="mb-4 font-heading text-2xl font-extrabold tracking-tight text-cream">Nouveau mot de passe</h1>
        <Field label="Nouveau mot de passe" type="password" value={password} onChange={setPassword} />
        {msg && <p className="mb-2 text-sm text-danger-400">{msg}</p>}
        <Button className="w-full" onClick={submit}>Enregistrer</Button>
      </Card>
    </main>
  );
}
