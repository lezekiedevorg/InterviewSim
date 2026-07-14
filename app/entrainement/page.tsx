"use client";

import { useState } from "react";
import { MeetingRoom } from "@/app/components/meeting/MeetingRoom";
import { DrillReportCard } from "@/app/components/DrillReportCard";
import { DRILL_THEMES, drillTheme, type DrillThemeId } from "@/lib/drillThemes";
import { saveDrill } from "@/lib/drills";
import type { InterviewContext, ChatMessage } from "@/lib/types";
import type { DrillReport } from "@/lib/drillReport";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { VoiceWave } from "@/app/components/VoiceWave";

type Phase = "theme" | "chat" | "report";

const DRILL_QUESTIONS = 4;

export default function Entrainement() {
  const [phase, setPhase] = useState<Phase>("theme");
  const [selectedTheme, setSelectedTheme] = useState<DrillThemeId | null>(null);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [report, setReport] = useState<DrillReport | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const theme = selectedTheme ? drillTheme(selectedTheme) : undefined;
  const context: InterviewContext = { poste: theme?.label ?? "", cv: "" };

  async function streamDrill(nextHistory: ChatMessage[]) {
    setStreaming(true);
    setErrorMsg(null);
    setHistory([...nextHistory, { role: "recruiter", text: "" }]);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, history: nextHistory, theme: selectedTheme }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setErrorMsg(txt || "Erreur.");
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

  function startDrill(id: DrillThemeId) {
    setSelectedTheme(id);
    setHistory([]);
    setReport(null);
    setReportError(null);
    setPhase("chat");
    streamDrill([]);
  }

  async function generateReport(transcript: ChatMessage[]) {
    setPhase("report");
    setErrorMsg(null);
    setReport(null);
    setReportError(null);
    setLoadingReport(true);
    try {
      const res = await fetch("/api/drill-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: selectedTheme, transcript }),
      });
      const data = await res.json();
      if (!res.ok || !data.report) {
        setReportError(data.error ?? "Impossible de générer le bilan. Réessaie.");
        return;
      }
      setReport(data.report);
      void saveDrill(selectedTheme as string, data.report);
    } catch {
      setReportError("Connexion interrompue. Réessaie.");
    } finally {
      setLoadingReport(false);
    }
  }

  function sendAnswer() {
    if (currentAnswer.trim() === "" || streaming) return;
    const next: ChatMessage[] = [...history, { role: "candidate", text: currentAnswer.trim() }];
    setCurrentAnswer("");
    const recruiterTurns = next.filter((m) => m.role === "recruiter").length;
    if (recruiterTurns >= DRILL_QUESTIONS) {
      setHistory(next);
      generateReport(next);
      return;
    }
    streamDrill(next);
  }

  function finishInterview() {
    generateReport(history);
  }

  function restartTheme() {
    if (selectedTheme) startDrill(selectedTheme);
  }

  function chooseAnotherTheme() {
    setSelectedTheme(null);
    setHistory([]);
    setReport(null);
    setReportError(null);
    setPhase("theme");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {phase === "theme" && (
        <div className="stagger">
          <div className="mb-10 text-center">
            <p className="mb-5 text-[10.5px] font-bold uppercase tracking-[0.18em] text-amber-400 sm:text-xs sm:tracking-[0.2em]">
              Entraînement quotidien · {DRILL_QUESTIONS} questions
            </p>
            <h1 className="mx-auto max-w-3xl font-heading text-[clamp(2.2rem,8vw,3.8rem)] font-extrabold leading-none tracking-[-0.03em] text-cream [text-wrap:balance]">
              Choisis ton <span className="text-amber-400">thème du jour</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
              Un mini-entretien ciblé de {DRILL_QUESTIONS} questions, suivi d&apos;un bilan
              immédiat. Sans inscription.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {DRILL_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => startDrill(t.id)}
                className="cursor-pointer rounded-[20px] border border-cream/15 bg-night-800 p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-400/45 hover:shadow-cta"
              >
                <h2 className="mb-1.5 font-heading text-lg font-bold text-cream">{t.label}</h2>
                <p className="text-sm leading-snug text-muted">{t.description}</p>
              </button>
            ))}
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
          jury={false}
        />
      )}

      {phase === "report" && (
        <div className="flex flex-col gap-4 animate-rise">
          {reportError && (
            <Card>
              <p className="mb-3 text-sm text-danger-400">{reportError}</p>
              <Button onClick={() => generateReport(history)}>Réessayer</Button>
            </Card>
          )}
          {loadingReport && (
            <Card className="flex flex-col items-center gap-4 py-8 text-sm text-muted">
              <VoiceWave bars={14} height={32} />
              Analyse de ton drill en cours…
            </Card>
          )}
          {report && theme && <DrillReportCard report={report} themeLabel={theme.label} />}
          {(report || reportError) && (
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="secondary" onClick={restartTheme}>
                Refaire ce thème
              </Button>
              <Button onClick={chooseAnotherTheme}>Choisir un autre thème</Button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
