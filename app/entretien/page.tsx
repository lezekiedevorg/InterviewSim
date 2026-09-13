"use client";

import { useState } from "react";
import Link from "next/link";
import { MeetingRoom } from "@/app/components/meeting/MeetingRoom";
import type { InterviewContext, ChatMessage, Debrief, DifficulteId } from "@/lib/types";
import { DIFFICULTES } from "@/lib/difficulte";
import { validateContext } from "@/lib/validate";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Field } from "@/app/components/ui/Field";
import { Debrief as DebriefComponent } from "@/app/components/Debrief";
import { ShareScoreButton } from "@/app/components/ShareScoreButton";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { TemplateGallery } from "@/app/components/TemplateGallery";
import { VoiceWave } from "@/app/components/VoiceWave";
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
  const [difficulte, setDifficulte] = useState<DifficulteId>("realiste");
  const [tooShort, setTooShort] = useState(false);

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
        body: JSON.stringify({ context: { ...context, difficulte }, history: nextHistory, jury }),
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
    setTooShort(false);
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
      if (data.tooShort) {
        setTooShort(true);
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
                difficulte,
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
      <ol className="mb-8 flex items-center justify-center gap-2 text-xs font-semibold sm:gap-3">
        {STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2 sm:gap-3">
            <span
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.06em] transition-all duration-300 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs sm:tracking-[0.08em] ${
                i === activeStep
                  ? "bg-amber-400 text-amber-ink shadow-cta"
                  : i < activeStep
                  ? "bg-amber-400/15 text-amber-400"
                  : "bg-night-700 text-faint ring-1 ring-cream/15"
              }`}
            >
              <span
                className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${
                  i === activeStep ? "bg-amber-ink/15" : "bg-cream/10"
                }`}
              >
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
                className={`h-0.5 w-2 rounded-full transition-colors duration-300 sm:w-8 ${
                  i < activeStep ? "bg-amber-400/50" : "bg-cream/15"
                }`}
              />
            )}
          </li>
        ))}
      </ol>

      {phase === "form" && (
        <div className="stagger">
          <div className="mb-10 text-center">
            <p className="mb-5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-amber-400 sm:text-xs sm:tracking-[0.2em]">
              Entretien vocal · Recruteur IA<span className="hidden sm:inline"> · En direct</span>
            </p>
            <h1 className="mx-auto max-w-3xl font-heading text-[clamp(2.5rem,9vw,4.8rem)] font-extrabold leading-none tracking-[-0.03em] text-cream [text-wrap:balance]">
              Rate tes entretiens ici.{" "}
              <span className="text-amber-400">Réussis le vrai.</span>
            </h1>
            <div className="mt-5 sm:hidden">
              <VoiceWave bars={18} height={40} />
            </div>
            <div className="mt-7 hidden sm:block">
              <VoiceWave />
            </div>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Un recruteur IA te pose de vraies questions, à voix haute, tour après tour.
              À la fin&nbsp;: un débrief honnête et ton score de confiance sur&nbsp;100.
            </p>
            <p className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-amber-400/45 bg-amber-400/10 px-4 py-2.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-amber-300">
              Gratuit
              <span className="h-1 w-1 rounded-full bg-amber-400" aria-hidden />
              Illimité
              <span className="h-1 w-1 rounded-full bg-amber-400" aria-hidden />
              Sans jugement
            </p>
          </div>

          <TemplateGallery onPick={pickTemplate} selectedId={templateId} />

          <Card className="mx-auto max-w-[600px] p-6 sm:p-7">
            <h2 className="mb-4 font-heading text-xl font-bold tracking-tight text-cream">
              …ou décris ton poste
            </h2>
            <Field label="Poste visé *" value={context.poste}
              placeholder="Ex. : Développeur junior dans une fintech"
              onChange={(v) => setContext({ ...context, poste: v })} />

            {/* Champs optionnels repliés : le formulaire visible tient en 4 lignes */}
            <details className="group mb-4 rounded-xl border border-dashed border-cream/25 px-3.5 py-3">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-amber-400 transition-colors hover:text-amber-300 [&::-webkit-details-marker]:hidden">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0 transition-transform duration-200 group-open:rotate-90" aria-hidden>
                  <polyline points="9 5 16 12 9 19" />
                </svg>
                Personnaliser (CV, offre, niveau…) — recommandé
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
              <p className="mb-3 text-sm text-danger-400">{formErrors.join(" ")}</p>
            )}
            <div className="mb-4">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
                Difficulté
              </span>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulte(d.id)}
                    aria-pressed={difficulte === d.id}
                    className={`min-h-[44px] cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${
                      difficulte === d.id
                        ? "bg-amber-400 text-amber-ink"
                        : "bg-night-700 text-muted ring-1 ring-cream/15 hover:text-cream"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-muted">
                {DIFFICULTES.find((d) => d.id === difficulte)?.description}
              </p>
            </div>
            <label className="mb-4 flex items-start gap-2.5 text-sm leading-snug text-muted">
              <input
                type="checkbox"
                checked={jury}
                onChange={(e) => setJury(e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer accent-amber-400"
              />
              <span>
                <strong className="font-semibold text-cream">Mode jury</strong> — trois recruteurs,
                questions croisées
              </span>
            </label>
            {/* Desktop : CTA dans la carte */}
            <div className="hidden sm:block">
              <Button size="lg" className="w-full" disabled={formErrors.length > 0} onClick={startInterview}>
                Démarrer l&apos;entretien
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <polyline points="13 5 20 12 13 19" />
                </svg>
              </Button>
              <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
                Sans inscription · Voix ou texte · Audio léger
              </p>
            </div>
          </Card>

          <p className="mt-4 text-center text-sm text-faint">
            <Link href="/entrainement" className="underline decoration-dotted underline-offset-4 hover:text-cream">
              ou entraîne-toi sur un thème →
            </Link>
          </p>

          {/* Mobile : CTA collé en bas de l'écran, avec fondu vers le contenu */}
          <div className="sticky bottom-0 z-10 -mx-4 bg-gradient-to-t from-night-900 from-55% to-transparent px-4 pb-6 pt-4 sm:hidden">
            <Button size="lg" className="w-full" disabled={formErrors.length > 0} onClick={startInterview}>
              Démarrer l&apos;entretien
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
                <line x1="4" y1="12" x2="20" y2="12" />
                <polyline points="13 5 20 12 13 19" />
              </svg>
            </Button>
          </div>
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
              <p className="mb-3 text-sm text-danger-400">{errorMsg}</p>
              <Button onClick={finishInterview}>Réessayer</Button>
            </Card>
          )}
          {tooShort && (
            <Card className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="max-w-sm text-sm leading-relaxed text-muted">
                Entretien trop court pour être évalué sérieusement — réponds à au moins
                3 questions, puis termine.
              </p>
              <Button onClick={() => window.location.reload()}>Nouvel entretien</Button>
            </Card>
          )}
          {!errorMsg && !tooShort && !debrief && !debriefRaw && (
            <Card className="flex flex-col items-center gap-4 py-8 text-sm text-muted">
              <VoiceWave bars={14} height={32} />
              Analyse de ton entretien en cours…
            </Card>
          )}
          {debrief && <DebriefComponent data={debrief} />}
          {debrief && <ShareScoreButton poste={context.poste} score={debrief.scoreConfiance} />}
          {saveMsg && (
            <p className="text-center text-sm text-faint">{saveMsg}</p>
          )}
          {debriefRaw && (
            <pre className="whitespace-pre-wrap rounded-xl border border-cream/15 bg-night-800 p-3 text-sm text-muted">{debriefRaw}</pre>
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
