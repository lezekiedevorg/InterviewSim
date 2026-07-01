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
import { ScoreBadge } from "@/app/components/ui/ScoreBadge";
import { Debrief } from "@/app/components/Debrief";

export default function ProgressionPage() {
  const [sessions, setSessions] = useState<SavedSession[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
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
    return <main className="mx-auto max-w-2xl px-4 py-10 text-slate-500">Chargement…</main>;
  }

  if (sessions.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-2 font-heading text-2xl font-bold">Ma progression</h1>
        <p className="text-slate-600">
          Aucun entretien enregistré pour l&apos;instant. Fais un entretien, puis reviens ici !
        </p>
      </main>
    );
  }

  const desc = sortByDateDesc(sessions);
  const rows = withDeltas(desc);
  const chrono = [...desc].reverse().map((s) => s.score_confiance);
  const points = sparklinePoints(chrono, 300, 60);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-4 font-heading text-2xl font-bold">Ma progression</h1>

      <Card className="mb-6">
        <h2 className="mb-3 font-heading font-semibold">Évolution du score</h2>
        <svg viewBox="0 0 300 60" className="h-16 w-full">
          <polyline
            points={points}
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Card>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <button
              className="flex w-full items-center justify-between text-left"
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
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
              </div>
            </button>
            {openId === r.id && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Debrief data={r.debrief} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </main>
  );
}
