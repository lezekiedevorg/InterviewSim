"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { renderScoreCard, shareScoreCard } from "@/lib/shareCard";

export function ShareScoreButton({ poste, score }: { poste: string; score: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const blob = await renderScoreCard({ poste, score });
      await shareScoreCard(blob);
    } catch {
      setError("Le partage n'a pas fonctionné, réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="secondary" onClick={onClick} disabled={busy}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
        </svg>
        {busy ? "Préparation…" : "Partager mon score"}
      </Button>
      {error && <p className="text-sm text-danger-400">{error}</p>}
    </div>
  );
}
