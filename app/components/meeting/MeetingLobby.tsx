"use client";

import { Button } from "@/app/components/ui/Button";
import { PlayIcon } from "@/app/components/ui/icons";
import { EDGE_SOLO_VOICES, EDGE_JURY_PACKS } from "@/lib/edgeVoices";

type Props = {
  onJoin: () => void;
  engine: "probing" | "edge" | "browser";
  ready: boolean;
  jury: boolean;
  soloId: string;
  packId: string;
  onChangeSolo: (id: string) => void;
  onChangePack: (id: string) => void;
  onPreview: () => void;
};

export function MeetingLobby({
  onJoin,
  engine,
  ready,
  jury,
  soloId,
  packId,
  onChangeSolo,
  onChangePack,
  onPreview,
}: Props) {
  const showVoiceChoice = engine === "edge";
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-white/70 bg-white/80 p-10 text-center shadow-card ring-1 ring-brand-600/5 backdrop-blur-xl animate-scale-in">
      <span className="relative grid place-items-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-300/50" aria-hidden />
        <span className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-bold text-white shadow-brand">
          RH
        </span>
      </span>
      <div>
        <h2 className="font-heading text-xl font-bold text-slate-900">Prêt pour ton entretien ?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Le recruteur va te parler. Active le son de ton appareil.
        </p>
      </div>

      {showVoiceChoice && (
        <div className="flex w-full max-w-xs flex-col gap-2 text-left">
          <label className="text-sm font-medium text-slate-700">
            {jury ? "Voix du jury" : "Voix du recruteur"}
          </label>
          <div className="flex gap-2">
            {jury ? (
              <select
                value={packId}
                onChange={(e) => onChangePack(e.target.value)}
                className="flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {EDGE_JURY_PACKS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={soloId}
                onChange={(e) => onChangeSolo(e.target.value)}
                className="flex-1 cursor-pointer rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-sm text-slate-900 outline-none transition-colors duration-200 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              >
                {EDGE_SOLO_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            )}
            <Button variant="secondary" onClick={onPreview} disabled={!ready}>
              <PlayIcon />
              Écouter
            </Button>
          </div>
        </div>
      )}

      <Button size="lg" onClick={onJoin}>
        Rejoindre l&apos;entretien →
      </Button>
    </div>
  );
}
