"use client";

import { useState } from "react";
import { MeetingRoom } from "@/app/components/meeting/MeetingRoom";
import type { InterviewContext, ChatMessage, Debrief } from "@/lib/types";
import { validateContext } from "@/lib/validate";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field } from "@/app/components/ui/Field";
import { Debrief as DebriefComponent } from "@/app/components/Debrief";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { TemplateGallery } from "@/app/components/TemplateGallery";
import type { Template } from "@/lib/templates";

type Phase = "form" | "chat" | "debrief";

const STEPS: { key: Phase; label: string }[] = [
  { key: "form", label: "Préparation" },
  { key: "chat", label: "Entretien" },
  { key: "debrief", label: "Débrief" },
];

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
  const [templateId, setTemplateId] = useState<string | null>(null);

  function pickTemplate(t: Template) {
    setContext({
      poste: t.context.poste,
      domaine: t.context.domaine,
      niveau: t.context.niveau,
      langue: t.context.langue,
      cv: "",
    });
    setTemplateId(t.id);
  }

  const formErrors = validateContext(context);

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

  function onAnswerKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    // Entrée = envoyer, Maj+Entrée = saut de ligne
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendAnswer();
    }
  }

  const activeStep = STEPS.findIndex((s) => s.key === phase);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Stepper */}
      <ol className="mb-8 flex items-center justify-center gap-2 text-xs font-medium sm:gap-3">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2 sm:gap-3">
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1 transition-colors ${
                i === activeStep
                  ? "bg-brand-600 text-white shadow-brand"
                  : i < activeStep
                  ? "bg-brand-100 text-brand-700"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <span className="grid h-4 w-4 place-items-center rounded-full bg-white/25 text-[10px]">
                {i < activeStep ? "✓" : i + 1}
              </span>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-slate-200 sm:w-8" />}
          </li>
        ))}
      </ol>

      {phase === "form" && (
        <div className="animate-rise">
          <div className="mb-8 text-center">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Passe l&apos;entretien <span className="text-brand-600">avant</span>{" "}l&apos;entretien.
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              Un recruteur IA te fait passer une simulation sur mesure à partir de ton profil
              (CV optionnel), puis te livre un débrief actionnable. Sans jugement, autant de fois
              que tu veux.
            </p>
          </div>

          <TemplateGallery onPick={pickTemplate} selectedId={templateId} />

          <Card>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field label="Poste visé *" value={context.poste}
                  placeholder="Ex : Développeur back-end"
                  onChange={(v) => setContext({ ...context, poste: v })} />
              </div>
              <Field label="Entreprise / type" value={context.entreprise ?? ""}
                placeholder="Ex : Startup fintech"
                onChange={(v) => setContext({ ...context, entreprise: v })} />
              <Field label="Domaine" value={context.domaine ?? ""}
                placeholder="Ex : Paiement en ligne"
                onChange={(v) => setContext({ ...context, domaine: v })} />
              <Field label="Niveau" value={context.niveau ?? ""}
                placeholder="Junior, confirmé, senior…"
                onChange={(v) => setContext({ ...context, niveau: v })} />
              <Field label="Langue" value={context.langue ?? ""}
                placeholder="Français"
                onChange={(v) => setContext({ ...context, langue: v })} />
              <div className="sm:col-span-2">
                <Field label="CV (collé)" value={context.cv} textarea rows={5}
                  placeholder="Colle ici le texte de ton CV…"
                  hint="Copié-collé brut, la mise en forme n'a pas d'importance."
                  onChange={(v) => setContext({ ...context, cv: v })} />
              </div>
              <div className="sm:col-span-2">
                <Field label="Offre d'emploi (collée)" value={context.offre ?? ""} textarea rows={5}
                  placeholder="Optionnel — colle l'offre pour un entretien plus ciblé."
                  onChange={(v) => setContext({ ...context, offre: v })} />
              </div>
            </div>
            {formErrors.length > 0 && (
              <p className="mb-3 text-sm text-red-600">{formErrors.join(" ")}</p>
            )}
            <Button size="lg" className="w-full" disabled={formErrors.length > 0} onClick={startInterview}>
              Démarrer l&apos;entretien →
            </Button>
          </Card>
        </div>
      )}

      {phase === "chat" && (
        <MeetingRoom
          history={history}
          streaming={streaming}
          currentAnswer={currentAnswer}
          setCurrentAnswer={setCurrentAnswer}
          sendAnswer={sendAnswer}
          finishInterview={finishInterview}
          errorMsg={errorMsg}
        />
      )}

      {phase === "debrief" && (
        <div className="flex flex-col gap-4 animate-rise">
          {errorMsg && (
            <Card>
              <p className="mb-3 text-sm text-red-600">{errorMsg}</p>
              <Button onClick={finishInterview}>Réessayer</Button>
            </Card>
          )}
          {!errorMsg && !debrief && !debriefRaw && (
            <Card className="flex items-center gap-3 text-sm text-slate-600">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.3s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-brand-500" />
              </span>
              Analyse de ton entretien en cours…
            </Card>
          )}
          {debrief && <DebriefComponent data={debrief} />}
          {saveMsg && (
            <p className="text-center text-sm text-slate-500">{saveMsg}</p>
          )}
          {debriefRaw && (
            <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{debriefRaw}</pre>
          )}
          {(debrief || debriefRaw) && (
            <Button variant="secondary" className="mx-auto" onClick={() => window.location.reload()}>
              Nouvel entretien
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
