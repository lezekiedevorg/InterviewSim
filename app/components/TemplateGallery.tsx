"use client";

import { useRef } from "react";
import type { Template } from "@/lib/templates";
import { TEMPLATES } from "@/lib/templates";

// Icônes Lucide (MIT) en SVG inline — remplace les emojis pour un rendu net et cohérent.
const ICON_PATHS: Record<string, React.ReactNode> = {
  "stage-marketing": (
    <>
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </>
  ),
  "premier-emploi-dev": (
    <>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </>
  ),
  "job-etudiant-vente": (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  "relation-client": (
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  ),
  "stage-administratif": (
    <>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </>
  ),
  "stage-banque": (
    <>
      <line x1="3" x2="21" y1="22" y2="22" />
      <line x1="6" x2="6" y1="18" y2="11" />
      <line x1="10" x2="10" y1="18" y2="11" />
      <line x1="14" x2="14" y1="18" y2="11" />
      <line x1="18" x2="18" y1="18" y2="11" />
      <polygon points="12 2 20 7 4 7" />
    </>
  ),
  "job-etudiant-restauration": (
    <>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
    </>
  ),
  animateur: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
};

// Repli pour un scénario sans icône dédiée (porte-documents).
const FALLBACK = (
  <>
    <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </>
);

function TemplateIcon({ id }: { id: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden
    >
      {ICON_PATHS[id] ?? FALLBACK}
    </svg>
  );
}

// Carrousel horizontal : cartes défilables au doigt, flèches pour la souris.
export function TemplateGallery({
  onPick,
  selectedId,
}: {
  onPick: (t: Template) => void;
  selectedId?: string | null;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  function slide(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: "smooth" });
  }

  const arrow =
    "grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full border border-slate-200 bg-white/80 text-slate-600 backdrop-blur transition-all duration-200 hover:border-brand-300 hover:text-brand-700 hover:shadow-soft";

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-slate-500">
          Pas d&apos;idée ? Pars d&apos;un scénario
        </h2>
        <div className="flex gap-2">
          <button type="button" onClick={() => slide(-1)} aria-label="Scénarios précédents" className={arrow}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button type="button" onClick={() => slide(1)} aria-label="Scénarios suivants" className={arrow}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={trackRef}
        className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className={`group flex w-40 shrink-0 snap-start cursor-pointer flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card ${
              selectedId === t.id
                ? "border-brand-500 bg-brand-50/90 shadow-card ring-2 ring-brand-200"
                : "border-white/70 bg-white/80 backdrop-blur hover:border-brand-200"
            }`}
          >
            <span
              className={`grid h-9 w-9 place-items-center rounded-lg transition-colors duration-200 ${
                selectedId === t.id
                  ? "bg-brand-600 text-white"
                  : "bg-brand-50 text-brand-700 group-hover:bg-brand-100"
              }`}
            >
              <TemplateIcon id={t.id} />
            </span>
            <span className="text-sm font-semibold text-slate-900">{t.titre}</span>
            <span className="text-xs text-slate-500">{t.sousTitre}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
