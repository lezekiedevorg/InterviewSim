"use client";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  DÉMONSTRATION DU HERO — le produit se montre, il ne se décrit pas
 * ─────────────────────────────────────────────────────────────────────────────
 *  Un entretien se joue en boucle : la question du recruteur s'écrit lettre à
 *  lettre, la réponse apparaît avec l'onde vocale, la jauge monte jusqu'à 78
 *  puis le débrief tombe.
 *
 *  Deux précautions :
 *  - `prefers-reduced-motion` court-circuite la séquence et affiche l'état
 *    final : le contenu reste lisible, rien ne bouge.
 *  - tous les minuteurs sont annulés au démontage, sinon un changement de page
 *    en pleine boucle laisse des `setTimeout` qui écrivent dans un composant
 *    démonté.
 */

import { useEffect, useRef, useState } from "react";

const QUESTION =
  "Parlons de votre expérience récente. Vous mentionnez un bus de services — comment garantissiez-vous qu'un message n'était pas perdu ?";
const FINAL_SCORE = 78;
const CIRCUMFERENCE = 2 * Math.PI * 26; // r = 26 dans le SVG

export function InterviewDemo() {
  const [typed, setTyped] = useState("");
  const [showAnswer, setShowAnswer] = useState(false);
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduce) {
      setTyped(QUESTION);
      setShowAnswer(true);
      setShowScore(true);
      setScore(FINAL_SCORE);
      return;
    }

    const at = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms));
    };

    let cancelled = false;

    function cycle() {
      if (cancelled) return;
      setTyped("");
      setShowAnswer(false);
      setShowScore(false);
      setScore(0);

      // Question, lettre par lettre
      QUESTION.split("").forEach((_, i) => {
        at(260 + i * 17, () => setTyped(QUESTION.slice(0, i + 1)));
      });
      const afterTyping = 260 + QUESTION.length * 17;

      at(afterTyping + 620, () => setShowAnswer(true));
      at(afterTyping + 2000, () => {
        setShowScore(true);
        // Le compteur suit la jauge : les deux arrivent ensemble.
        for (let n = 1; n <= FINAL_SCORE; n++) {
          at(120 + n * 13, () => setScore(n));
        }
      });
      // Et on recommence.
      at(afterTyping + 8200, cycle);
    }

    cycle();

    return () => {
      cancelled = true;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  const dashOffset = CIRCUMFERENCE * (1 - score / 100);

  return (
    <div className="animate-fade-up overflow-hidden rounded-card border-[1.5px] border-border bg-surface shadow-lift">
      {/* Barre de titre */}
      <div className="flex items-center gap-2.5 border-b-[1.5px] border-border bg-surface-2 px-4 py-3">
        <span className="h-[7px] w-[7px] rounded-full bg-ok" aria-hidden="true" />
        <h3 className="font-body text-[13.5px] font-semibold tracking-normal">
          Entretien · Développeur Fullstack
        </h3>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-pill bg-accent/10 px-2.5 py-1 text-[11.5px] font-semibold text-accent">
          <span className="h-[6px] w-[6px] animate-live rounded-full bg-accent" aria-hidden="true" />
          En direct
        </span>
      </div>

      <div className="flex min-h-[288px] flex-col gap-4 p-4">
        {/* Le recruteur */}
        <div className="flex items-start gap-3">
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-pill border-[1.5px] border-accent/25 bg-accent/10 text-[12.5px] font-bold text-accent">
            RC
          </span>
          <p className="text-[14.5px] leading-[1.62]">
            <span className="mb-0.5 block text-[12px] font-semibold text-ink-faint">
              Recruteur technique
            </span>
            <span className={typed.length < QUESTION.length ? "caret" : undefined}>{typed}</span>
          </p>
        </div>

        {/* Votre réponse */}
        <div
          className="flex items-start gap-3 transition-opacity duration-[460ms] ease-studio"
          style={{ opacity: showAnswer ? 1 : 0 }}
          aria-hidden={!showAnswer}
        >
          <span className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-pill bg-ok/10 text-[12.5px] font-bold text-ok">
            VS
          </span>
          <div className="flex-1">
            <p className="text-[14.5px] leading-[1.62]">
              <span className="mb-0.5 block text-[12px] font-semibold text-ink-faint">
                Vous · à voix haute
              </span>
              Chaque message passe par une file avec accusé de réception, et le traitement est{" "}
              <em>idempotent</em> — donc un renvoi ne crée pas de doublon.
            </p>
            <div className="mt-2 flex h-[22px] items-end gap-[3px]" aria-hidden="true">
              {[0, 90, 180, 270, 120, 300, 60, 210, 150].map((delay, i) => (
                <i
                  key={i}
                  className="w-[3px] animate-voice rounded-sm bg-ok opacity-75"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* La note et le débrief */}
        <div
          className="mt-auto flex items-center gap-4 border-t-[1.5px] border-dashed border-border pt-4 transition-opacity duration-[460ms] ease-studio"
          style={{ opacity: showScore ? 1 : 0 }}
          aria-hidden={!showScore}
        >
          <div className="relative h-[60px] w-[60px] shrink-0">
            <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90" aria-hidden="true">
              <circle cx="30" cy="30" r="26" fill="none" strokeWidth="5.5" className="stroke-border" />
              <circle
                cx="30"
                cy="30"
                r="26"
                fill="none"
                strokeWidth="5.5"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={dashOffset}
                className="stroke-accent transition-[stroke-dashoffset] duration-[900ms] ease-studio"
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-mono text-[17px] font-medium">
              {score}
            </span>
          </div>
          <p className="text-[13.5px] text-ink-muted">
            <b className="mb-0.5 block text-[14.5px] font-semibold text-ink">Réponse solide</b>
            Exemple concret et vocabulaire précis. À revoir : vous avez accéléré sur la fin.
          </p>
        </div>
      </div>
    </div>
  );
}
