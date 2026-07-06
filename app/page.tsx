"use client";

import { useState } from "react";
import { MeetingRoom } from "@/app/components/meeting/MeetingRoom";
import type { InterviewContext, ChatMessage, Debrief } from "@/lib/types";
import { validateContext } from "@/lib/validate";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field } from "@/app/components/ui/Field";
import { Debrief as DebriefComponent } from "@/app/components/Debrief";
import { ShareScoreButton } from "@/app/components/ShareScoreButton";
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
  const [jury, setJury] = useState(false);

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
        body: JSON.stringify({ context, history: nextHistory, jury }),
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

  const activeStep = STEPS.findIndex((s) => s.key === phase);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* Stepper */}
      <ol className="mb-8 flex items-center justify-center gap-2 text-xs font-medium sm:gap-3">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2 sm:gap-3">
            <span
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition-all duration-300 ${
                i === activeStep
                  ? "bg-brand-600 text-white shadow-brand"
                  : i < activeStep
                  ? "bg-brand-100 text-brand-700"
                  : "bg-white/70 text-slate-400 ring-1 ring-slate-200"
              }`}
            >
              <span className="grid h-4 w-4 place-items-center rounded-full bg-white/25 text-[10px]">
                {i < activeStep ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5" aria-hidden>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <span
                className={`h-0.5 w-4 rounded-full transition-colors duration-300 sm:w-8 ${
                  i < activeStep ? "bg-brand-300" : "bg-slate-200"
                }`}
              />
            )}
          </li>
        ))}
      </ol>

      {phase === "form" && (
        <div className="stagger">
          <div className="mb-10 text-center">
            <p className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50/80 px-3 py-1 text-xs font-semibold text-brand-700">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-500" />
              </span>
              Gratuit · illimité · sans jugement
            </p>
            <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
              Passe l&apos;entretien{" "}
              <span className="text-gradient">avant l&apos;entretien</span>.
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-base text-slate-600 sm:text-lg">
              Un recruteur IA te fait passer une simulation sur mesure à partir de ton profil
              (CV optionnel), puis te livre un débrief actionnable. Autant de fois que tu veux.
            </p>
          </div>

          <TemplateGallery onPick={pickTemplate} selectedId={templateId} />

          <Card>
            <Field label="Poste visé *" value={context.poste}
              placeholder="Ex : Développeur back-end, stagiaire marketing…"
              onChange={(v) => setContext({ ...context, poste: v })} />

            {/* Champs optionnels repliés : le formulaire visible tient en 4 lignes */}
            <details className="group mb-4">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-brand-700 transition-colors hover:text-brand-800 [&::-webkit-details-marker]:hidden">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 transition-transform duration-200 group-open:rotate-90" aria-hidden>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                Personnaliser mon entretien (CV, offre, niveau…) — recommandé
              </summary>
              <div className="mt-4 grid gap-x-4 sm:grid-cols-2">
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
                  <Field label="CV (collé)" value={context.cv} textarea rows={4}
                    placeholder="Colle ici le texte de ton CV…"
                    hint="Copié-collé brut, la mise en forme n'a pas d'importance."
                    onChange={(v) => setContext({ ...context, cv: v })} />
                </div>
                <div className="sm:col-span-2">
                  <Field label="Offre d'emploi (collée)" value={context.offre ?? ""} textarea rows={4}
                    placeholder="Optionnel — colle l'offre pour un entretien plus ciblé."
                    onChange={(v) => setContext({ ...context, offre: v })} />
                </div>
              </div>
            </details>
            {/* L'erreur n'apparaît que si l'utilisateur a tapé quelque chose d'invalide,
                pas à l'arrivée sur la page (le bouton grisé suffit comme garde-fou). */}
            {formErrors.length > 0 && context.poste !== "" && (
              <p className="mb-3 text-sm text-red-600">{formErrors.join(" ")}</p>
            )}
            <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={jury}
                onChange={(e) => setJury(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Mode jury — 3 recruteurs (RH, Manager opérationnel, Expert métier)
            </label>
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
          jury={jury}
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
          {debrief && <ShareScoreButton poste={context.poste} score={debrief.scoreConfiance} />}
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
