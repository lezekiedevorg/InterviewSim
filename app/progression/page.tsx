"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  sortByDateDesc,
  withDeltas,
  sparklinePoints,
  type SavedSession,
} from "@/lib/progression";
import { Card } from "@/app/components/ui/Card";
import { Button } from "@/app/components/ui/Button";
import { ScoreBadge } from "@/app/components/ui/ScoreBadge";
import { Debrief } from "@/app/components/Debrief";
import { ShareScoreButton } from "@/app/components/ShareScoreButton";
import { CrossAnalysis } from "@/app/components/CrossAnalysis";
import type { CrossAnalysis as CrossAnalysisType } from "@/lib/types";

export default function ProgressionPage() {
  const [sessions, setSessions] = useState<SavedSession[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CrossAnalysisType | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabase();
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("sessions")
        .select("id, created_at, poste, context, debrief, score_confiance")
        .order("created_at", { ascending: false });
      setSessions((data as SavedSession[]) ?? []);
    })();
  }, [router]);

  if (sessions === null) {
    // squelettes de chargement : pas de saut de contenu, l'espace est réservé
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-4 h-8 w-48 animate-pulse rounded-lg bg-slate-200/70" />
        <div className="mb-6 h-28 animate-pulse rounded-2xl bg-slate-200/70" />
        <div className="mb-6 h-24 animate-pulse rounded-2xl bg-slate-200/70 [animation-delay:.15s]" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200/70 [animation-delay:.3s]" />
      </main>
    );
  }

  if (sessions.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 animate-rise">
        <h1 className="mb-2 font-heading text-2xl font-bold">Ma progression</h1>
        <Card className="text-center">
          <p className="text-slate-600">
            Aucun entretien enregistré pour l&apos;instant. Fais un entretien, puis reviens ici !
          </p>
          <Button className="mt-4" onClick={() => router.push("/")}>
            Démarrer un entretien →
          </Button>
        </Card>
      </main>
    );
  }

  const desc = sortByDateDesc(sessions);
  const rows = withDeltas(desc);
  const chrono = [...desc].reverse().map((s) => s.score_confiance);
  const points = sparklinePoints(chrono, 300, 60);

  async function runAnalysis() {
    setAnalyzing(true);
    setAnalyzeError(null);
    setAnalysis(null); // évite d'afficher l'ancienne analyse pendant un re-clic
    try {
      const payload = desc.slice(0, 10).map((s) => ({
        poste: s.poste,
        pointsATravailler: s.debrief.pointsATravailler,
        syntheseGenerale: s.debrief.syntheseGenerale,
      }));
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.analysis) {
        setAnalyzeError(data.error ?? "L'analyse n'a pas pu être générée, réessaie.");
        return;
      }
      setAnalysis(data.analysis);
    } catch {
      setAnalyzeError("Une erreur réseau est survenue, réessaie.");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <main className="stagger mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-4 font-heading text-2xl font-bold">
        Ma <span className="text-gradient">progression</span>
      </h1>

      <Card className="mb-6">
        <h2 className="mb-3 font-heading font-semibold">Évolution du score</h2>
        <svg viewBox="0 0 300 60" className="h-16 w-full">
          <defs>
            <linearGradient id="spark" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#059669" />
              <stop offset="100%" stopColor="#2dd4bf" />
            </linearGradient>
          </defs>
          <polyline
            points={points}
            fill="none"
            stroke="url(#spark)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Card>

      <Card className="mb-6">
        <h2 className="mb-3 font-heading font-semibold">Points faibles récurrents</h2>
        {sessions.length < 3 ? (
          <p className="text-sm text-slate-500">
            Fais au moins 3 entretiens pour débloquer l&apos;analyse de tes points faibles récurrents.
          </p>
        ) : (
          <>
            <Button onClick={runAnalysis} disabled={analyzing}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              {analyzing ? "Analyse en cours…" : "Analyser mes points faibles récurrents"}
            </Button>
            {analyzeError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{analyzeError}</p>
            )}
            {analysis && (
              <div className="mt-4">
                <CrossAnalysis data={analysis} />
              </div>
            )}
          </>
        )}
      </Card>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <Card key={r.id} className="transition-shadow duration-200 hover:shadow-glow">
            <button
              className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
              aria-expanded={openId === r.id}
            >
              <div>
                <p className="font-medium text-slate-900">{r.poste}</p>
                <p className="text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.delta !== null && (
                  <span
                    className={`text-sm font-medium ${r.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {r.delta >= 0 ? `+${r.delta}` : r.delta}
                  </span>
                )}
                <ScoreBadge score={r.score_confiance} />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${openId === r.id ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </div>
            </button>
            {openId === r.id && (
              <div className="mt-4 border-t border-slate-100 pt-4 animate-rise">
                <Debrief data={r.debrief} />
                <div className="mt-4">
                  <ShareScoreButton poste={r.poste} score={r.debrief.scoreConfiance} />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </main>
  );
}
