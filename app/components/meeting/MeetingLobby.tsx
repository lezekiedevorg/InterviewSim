"use client";

import { Button } from "@/app/components/ui/Button";

export function MeetingLobby({ onJoin }: { onJoin: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-200 bg-white/80 p-10 text-center shadow-soft animate-rise">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-2xl font-bold text-white shadow-brand">
        RH
      </span>
      <div>
        <h2 className="font-heading text-xl font-bold text-slate-900">Prêt pour ton entretien ?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Le recruteur va te parler. Active le son de ton appareil.
        </p>
      </div>
      <Button size="lg" onClick={onJoin}>
        Rejoindre l&apos;entretien →
      </Button>
    </div>
  );
}
