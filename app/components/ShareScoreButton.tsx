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
        {busy ? "…" : "📲 Partager mon score"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
