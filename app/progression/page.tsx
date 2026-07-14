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
import { scoreColor, BAND_HEX } from "@/lib/scoreColor";
import { Debrief } from "@/app/components/Debrief";
import { ShareScoreButton } from "@/app/components/ShareScoreButton";
import { CrossAnalysis } from "@/app/components/CrossAnalysis";
import type { CrossAnalysis as CrossAnalysisType } from "@/lib/types";
import { difficulteLabel } from "@/lib/difficulte";
import { loadDrillRows } from "@/lib/drills";
import { masteryByTheme, type DrillRow } from "@/lib/drillMastery";

export default function ProgressionPage() {
  const [sessions, setSessions] = useState<SavedSession[] | null>(null);
  const [drillRows, setDrillRows] = useState<DrillRow[]>([]);
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
      const rows = await loadDrillRows();
      setDrillRows(rows);
    })();
  }, [router]);

  if (sessions === null) {
    // squelettes de chargement : pas de saut de contenu, l'espace est réservé
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-4 h-9 w-56 animate-pulse rounded-lg bg-cream/10" />
        <div className="mb-6 h-28 animate-pulse rounded-[20px] bg-cream/10" />
        <div className="mb-6 h-24 animate-pulse rounded-[20px] bg-cream/10 [animation-delay:.15s]" />
        <div className="h-16 animate-pulse rounded-[20px] bg-cream/10 [animation-delay:.3s]" />
      </main>
    );
  }

  if (sessions.length === 0 && masteryByTheme(drillRows).length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10 animate-rise">
        <h1 className="mb-4 font-heading text-3xl font-extrabold tracking-tight text-cream">Ma progression</h1>
        <Card className="text-center">
          <p className="text-muted">
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
  // Points colorés par bande de score (mêmes formules que sparklinePoints)
  const dots = chrono.map((v, i) => ({
    x: chrono.length === 1 ? 0 : (i / (chrono.length - 1)) * 300,
    y: 60 - (v / 100) * 60,
    c: BAND_HEX[scoreColor(v)],
  }));
  const first = chrono[0];
  const last = chrono[chrono.length - 1];
  const totalDelta = last - first;

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
      <h1 className="font-heading text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
        Ma progression
      </h1>
      {sessions.length > 0 && (
        <p className="mb-5 mt-2 text-sm text-muted">
          {sessions.length} entretien{sessions.length > 1 ? "s" : ""} enregistré{sessions.length > 1 ? "s" : ""}
          {chrono.length > 1 && (
            <>
              {" · "}
              <span className={`font-semibold ${totalDelta >= 0 ? "text-ok" : "text-danger-400"}`}>
                {totalDelta >= 0 ? `+${totalDelta}` : totalDelta} points
              </span>
            </>
          )}
        </p>
      )}

      {sessions.length > 0 && (
        <Card className="mb-4">
          {/* Seuils des bandes (40 / 70) en pointillés + points colorés par bande */}
          <svg viewBox="-6 -6 312 72" className="h-20 w-full overflow-visible">
            <line x1="0" y1="18" x2="300" y2="18" stroke="rgba(52,210,123,0.25)" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="0" y1="36" x2="300" y2="36" stroke="rgba(255,90,78,0.25)" strokeWidth="1" strokeDasharray="4 4" />
            <polyline
              points={points}
              fill="none"
              stroke="#ffb224"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {dots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="4.5" fill={d.c} stroke="#101c1f" strokeWidth="2" />
            ))}
          </svg>
        </Card>
      )}

      {sessions.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 font-heading font-bold text-cream">Points faibles récurrents</h2>
          {sessions.length < 3 ? (
            <p className="text-sm text-faint">
              Fais au moins 3 entretiens pour débloquer l&apos;analyse de tes points faibles récurrents.
            </p>
          ) : (
            <>
              <Button variant="secondary" className="w-full" onClick={runAnalysis} disabled={analyzing}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
                  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
                  <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z" />
                </svg>
                {analyzing ? "Analyse en cours…" : "Analyser mes points faibles récurrents"}
              </Button>
              {analyzeError && (
                <p className="mt-3 rounded-xl border border-danger-400/40 bg-danger-400/10 px-3.5 py-2.5 text-sm text-danger-400">{analyzeError}</p>
              )}
              {analysis && (
                <div className="mt-4">
                  <CrossAnalysis data={analysis} />
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {masteryByTheme(drillRows).length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 font-heading font-bold text-cream">Maîtrise par thème</h2>
          <div className="flex flex-col gap-2.5">
            {masteryByTheme(drillRows).map((m) => (
              <div key={m.theme} className="flex items-center gap-3">
                <span className="w-40 shrink-0 truncate text-sm text-muted">{m.label}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream/10">
                  <div className="h-full rounded-full" style={{ width: `${m.mastery}%`, background: BAND_HEX[scoreColor(m.mastery)] }} />
                </div>
                <span className="w-14 shrink-0 text-right text-xs font-semibold text-cream">{m.mastery}%</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {sessions.length > 0 && (
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <Card key={r.id} className="rounded-2xl p-4 transition-colors duration-200 hover:border-amber-400/40">
            <button
              className="flex w-full cursor-pointer items-center justify-between gap-3 text-left"
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
              aria-expanded={openId === r.id}
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-cream">{r.poste}</p>
                <p className="text-xs text-faint">
                  {[new Date(r.created_at).toLocaleDateString("fr-FR"), difficulteLabel(r.context?.difficulte)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                {r.delta !== null && (
                  <span
                    className={`text-[13px] font-bold ${r.delta >= 0 ? "text-ok" : "text-danger-400"}`}
                  >
                    {r.delta >= 0 ? `+${r.delta}` : r.delta}
                  </span>
                )}
                <ScoreBadge score={r.score_confiance} />
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`h-3.5 w-3.5 text-faint transition-transform duration-200 ${openId === r.id ? "rotate-90" : ""}`}
                  aria-hidden
                >
                  <polyline points="9 5 16 12 9 19" />
                </svg>
              </div>
            </button>
            {openId === r.id && (
              <div className="mt-4 border-t border-cream/10 pt-4 animate-rise">
                <Debrief data={r.debrief} />
                <div className="mt-4">
                  <ShareScoreButton poste={r.poste} score={r.debrief.scoreConfiance} />
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
      )}
    </main>
  );
}
