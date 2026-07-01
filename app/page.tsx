"use client";

import { useState, useRef, useEffect } from "react";
import type { InterviewContext, ChatMessage, Debrief } from "@/lib/types";
import { validateContext } from "@/lib/validate";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field } from "@/app/components/ui/Field";
import { Debrief as DebriefComponent } from "@/app/components/Debrief";
import { createBrowserSupabase } from "@/lib/supabase/client";

type Phase = "form" | "chat" | "debrief";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("form");
  const [context, setContext] = useState<InterviewContext>({ poste: "", cv: "" });
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [debriefRaw, setDebriefRaw] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const formErrors = validateContext(context);

  // Auto-scroll la box de conversation vers le dernier message à chaque mise à jour
  const chatScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = chatScrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [history]);

  async function streamRecruiter(nextHistory: ChatMessage[]) {
    setStreaming(true);
    setErrorMsg(null);
    // Ajoute un message recruteur vide qu'on va remplir au fil du flux
    setHistory([...nextHistory, { role: "recruiter", text: "" }]);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, history: nextHistory }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setErrorMsg(txt || "Erreur.");
        // retire le message recruteur vide
        setHistory(nextHistory);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setHistory([...nextHistory, { role: "recruiter", text: acc }]);
      }
    } catch {
      setErrorMsg("Connexion interrompue. Réessaie.");
      setHistory(nextHistory);
    } finally {
      setStreaming(false);
    }
  }

  function startInterview() {
    if (formErrors.length > 0) return;
    setPhase("chat");
    streamRecruiter([]); // première réplique du recruteur
  }

  function sendAnswer() {
    if (currentAnswer.trim() === "" || streaming) return;
    const next: ChatMessage[] = [
      ...history,
      { role: "candidate", text: currentAnswer.trim() },
    ];
    setCurrentAnswer("");
    streamRecruiter(next);
  }

  async function finishInterview() {
    setPhase("debrief");
    setErrorMsg(null);
    setDebrief(null);
    setDebriefRaw(null);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, transcript: history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Erreur.");
        return;
      }
      if (data.debrief) setDebrief(data.debrief);
      else setDebriefRaw(data.raw ?? "");
      // sauvegarde best-effort si connecté (n'affecte jamais l'affichage du débrief)
      if (data.debrief) {
        try {
          const supabase = createBrowserSupabase();
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const { error } = await supabase.from("sessions").insert({
              user_id: userData.user.id,
              poste: context.poste,
              context: {
                poste: context.poste,
                entreprise: context.entreprise,
                domaine: context.domaine,
                niveau: context.niveau,
                langue: context.langue,
              },
              debrief: data.debrief,
              score_confiance: data.debrief.scoreConfiance,
            });
            if (error) setSaveMsg("Impossible d'enregistrer cette session.");
            else setSaveMsg("Session enregistrée dans ta progression.");
          }
        } catch {
          setSaveMsg("Impossible d'enregistrer cette session.");
        }
      }
    } catch {
      setErrorMsg("Connexion interrompue. Réessaie.");
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="font-heading text-2xl font-bold text-slate-900 mb-6">InterviewSim</h1>

      {phase === "form" && (
        <Card>
          <p className="mb-4 text-sm text-slate-600">Décris ton entretien, colle ton CV, puis lance la simulation.</p>
          <Field label="Poste visé *" value={context.poste}
            onChange={(v) => setContext({ ...context, poste: v })} />
          <Field label="Entreprise / type" value={context.entreprise ?? ""}
            onChange={(v) => setContext({ ...context, entreprise: v })} />
          <Field label="Domaine" value={context.domaine ?? ""}
            onChange={(v) => setContext({ ...context, domaine: v })} />
          <Field label="Niveau (junior/senior)" value={context.niveau ?? ""}
            onChange={(v) => setContext({ ...context, niveau: v })} />
          <Field label="Langue" value={context.langue ?? ""}
            onChange={(v) => setContext({ ...context, langue: v })} />
          <Field label="CV (collé) *" value={context.cv} textarea rows={5}
            onChange={(v) => setContext({ ...context, cv: v })} />
          <Field label="Offre d'emploi (collée)" value={context.offre ?? ""} textarea rows={5}
            onChange={(v) => setContext({ ...context, offre: v })} />
          {formErrors.length > 0 && (
            <p className="mb-3 text-sm text-red-600">{formErrors.join(" ")}</p>
          )}
          <Button disabled={formErrors.length > 0} onClick={startInterview}>
            Démarrer l&apos;entretien
          </Button>
        </Card>
      )}

      {phase === "chat" && (
        <div className="flex flex-col gap-4">
          <div
            ref={chatScrollRef}
            className="flex h-[55vh] flex-col gap-3 overflow-y-auto rounded-2xl border border-slate-200 bg-white/60 p-4"
          >
            {history.map((m, i) => (
              <div key={i} className={`max-w-[85%] rounded-xl p-3 text-sm whitespace-pre-wrap ${
                m.role === "recruiter"
                  ? "self-start bg-slate-100 text-slate-800"
                  : "self-end bg-brand-50 text-slate-800"
              }`}>
                <strong className="block mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {m.role === "recruiter" ? "Recruteur" : "Toi"}
                </strong>
                {m.text}
              </div>
            ))}
          </div>
          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
          <Card>
            <textarea
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100 mb-3"
              value={currentAnswer}
              disabled={streaming}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              rows={3}
              placeholder="Ta réponse..."
            />
            <div className="flex gap-2">
              <Button onClick={sendAnswer} disabled={streaming || currentAnswer.trim() === ""}>
                Envoyer
              </Button>
              <Button variant="secondary" onClick={finishInterview} disabled={streaming}>
                Terminer l&apos;entretien
              </Button>
            </div>
          </Card>
        </div>
      )}

      {phase === "debrief" && (
        <div className="flex flex-col gap-4">
          {errorMsg && (
            <Card>
              <p className="mb-3 text-sm text-red-600">{errorMsg}</p>
              <Button onClick={finishInterview}>Réessayer</Button>
            </Card>
          )}
          {!errorMsg && !debrief && !debriefRaw && (
            <p className="text-sm text-slate-600">Génération du débrief…</p>
          )}
          {debrief && <DebriefComponent data={debrief} />}
          {saveMsg && <p className="text-sm text-slate-500">{saveMsg}</p>}
          {debriefRaw && (
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{debriefRaw}</pre>
          )}
        </div>
      )}
    </main>
  );
}
