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

const selectCls =
  "flex-1 min-h-[46px] cursor-pointer rounded-xl border border-cream/20 bg-night-900 px-3.5 py-2.5 text-[15px] font-semibold text-cream outline-none transition-colors duration-200 hover:border-cream/30 focus:border-amber-400";

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
    <div className="stagger mx-auto flex max-w-md flex-col items-center gap-5 text-center">
      {/* Avatar ambre + anneau qui respire */}
      <span className="relative mt-2 grid h-[104px] w-[104px] place-items-center">
        <span className="absolute inset-0 animate-ring rounded-full border-2 border-amber-400/50" aria-hidden />
        <span className="grid h-[104px] w-[104px] place-items-center rounded-full border-[1.5px] border-amber-400/50 bg-amber-400/10 font-heading text-3xl font-extrabold text-amber-400">
          RH
        </span>
      </span>
      <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-faint">
        {jury ? "Jury · 3 recruteurs IA" : "Recruteur IA"}
      </p>

      <div>
        <h2 className="font-heading text-3xl font-extrabold tracking-tight text-cream sm:text-4xl">
          Prêt pour ton entretien&nbsp;?
        </h2>
        <p className="mt-3 text-[15px] text-muted">
          Le recruteur va te parler. Active le son de ton appareil.
        </p>
      </div>

      {showVoiceChoice && (
        <div className="flex w-full flex-col gap-2.5 rounded-[20px] border border-cream/15 bg-night-800 p-5 text-left shadow-card">
          <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
            {jury ? "Voix du jury" : "Voix du recruteur"}
          </label>
          <div className="flex flex-wrap gap-2.5">
            {jury ? (
              <select value={packId} onChange={(e) => onChangePack(e.target.value)} className={selectCls}>
                {EDGE_JURY_PACKS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            ) : (
              <select value={soloId} onChange={(e) => onChangeSolo(e.target.value)} className={selectCls}>
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

      <Button size="lg" className="w-full" onClick={onJoin}>
        Rejoindre l&apos;entretien
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
          <line x1="4" y1="12" x2="20" y2="12" />
          <polyline points="13 5 20 12 13 19" />
        </svg>
      </Button>
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">
        Tu peux répondre à la voix ou au clavier
      </p>
    </div>
  );
}
