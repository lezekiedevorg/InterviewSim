import type { ReactNode } from "react";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  MAQUETTES DU PARCOURS
 * ─────────────────────────────────────────────────────────────────────────────
 *  Trois écrans du produit, dessinés en HTML/CSS — pas des captures d'écran.
 *
 *  Pourquoi pas des images : une capture vieillit au premier changement
 *  d'interface et pèse lourd. Ici, les maquettes partagent les tokens du site,
 *  donc elles suivent le thème clair/sombre et restent justes tant que le
 *  produit existe.
 *
 *  Elles sont décoratives : chaque bloc porte un `aria-label` qui décrit
 *  l'écran en une phrase, et le contenu interne est masqué aux lecteurs
 *  d'écran pour ne pas doubler l'information.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Cadre commun : la barre de fenêtre donne l'échelle et le contexte « écran ». */
function Fenetre({
  titre,
  pastille,
  children,
  libelle,
}: {
  titre: string;
  pastille?: ReactNode;
  children: ReactNode;
  libelle: string;
}) {
  return (
    <div
      role="img"
      aria-label={libelle}
      className="overflow-hidden rounded-card border-[1.5px] border-border bg-surface shadow-lift"
    >
      <div className="flex items-center gap-2 border-b-[1.5px] border-border bg-surface-2 px-3.5 py-2.5">
        <span className="h-2 w-2 rounded-full bg-border-strong" aria-hidden="true" />
        <span className="h-2 w-2 rounded-full bg-border-strong" aria-hidden="true" />
        <span className="ml-1 truncate font-body text-[12px] font-semibold tracking-normal text-ink-muted">
          {titre}
        </span>
        {pastille ? <span className="ml-auto shrink-0">{pastille}</span> : null}
      </div>
      <div aria-hidden="true" className="p-4">
        {children}
      </div>
    </div>
  );
}

function Etiquette({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-[10.5px] font-semibold uppercase tracking-[.09em] text-ink-faint">
      {children}
    </span>
  );
}

/** Faux champ de saisie : la valeur est déjà remplie, c'est une illustration. */
function Champ({ valeur, discret = false }: { valeur: string; discret?: boolean }) {
  return (
    <div
      className={`rounded-field border-[1.5px] border-border bg-surface px-3 py-2 text-[13px] ${
        discret ? "text-ink-faint" : "text-ink"
      }`}
    >
      {valeur}
    </div>
  );
}

/* ═══ 1. LA PRÉPARATION ═══════════════════════════════════════════════════ */
export function MaquettePreparation() {
  return (
    <Fenetre
      titre="Nouvel entretien"
      libelle="Maquette de l'écran de préparation : le poste visé, le domaine, le niveau, la langue et le CV sont renseignés, puis un bouton lance l'entretien."
      pastille={
        <span className="rounded-pill bg-accent/10 px-2 py-0.5 text-[10.5px] font-semibold text-accent">
          Étape 1
        </span>
      }
    >
      <div className="space-y-3.5">
        <div>
          <Etiquette>Poste visé</Etiquette>
          <Champ valeur="Développeur Fullstack" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Etiquette>Domaine</Etiquette>
            <Champ valeur="Informatique" />
          </div>
          <div>
            <Etiquette>Langue</Etiquette>
            <Champ valeur="Français" />
          </div>
        </div>
        <div>
          <Etiquette>Niveau d&apos;exigence</Etiquette>
          <div className="flex flex-wrap gap-1.5">
            {["Détendu", "Réaliste", "Sans pitié"].map((n, i) => (
              <span
                key={n}
                className={`rounded-pill px-3 py-1 text-[12px] font-medium ${
                  i === 1
                    ? "bg-accent text-accent-ink"
                    : "border-[1.5px] border-border text-ink-muted"
                }`}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
        <div>
          <Etiquette>Votre CV (optionnel)</Etiquette>
          <div className="rounded-field border-[1.5px] border-border bg-surface px-3 py-2 text-[12.5px] leading-relaxed text-ink-faint">
            Collez votre CV ici — le recruteur s&apos;en servira pour vous interroger
            sur votre parcours réel.
          </div>
        </div>
        <div className="flex justify-end pt-0.5">
          <span className="rounded-pill bg-accent px-4 py-2 text-[13px] font-semibold text-accent-ink">
            Démarrer l&apos;entretien
          </span>
        </div>
      </div>
    </Fenetre>
  );
}

/* ═══ 2. L'ENTRETIEN, MODE JURY ══════════════════════════════════════════ */
export function MaquetteEntretien() {
  return (
    <Fenetre
      titre="Jury · Développeur Fullstack"
      libelle="Maquette de l'écran d'entretien en mode jury : trois interlocuteurs posent des questions à tour de rôle pendant que la réponse est donnée à voix haute."
      pastille={
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-accent/10 px-2 py-0.5 text-[10.5px] font-semibold text-accent">
          <span className="h-[5px] w-[5px] animate-live rounded-full bg-accent" />
          En direct
        </span>
      }
    >
      <div className="space-y-3.5">
        {[
          {
            ini: "RC",
            qui: "Recruteur technique",
            texte: "Vous mentionnez un bus de services — comment garantissiez-vous qu'un message n'était pas perdu ?",
            ton: "accent" as const,
          },
          {
            ini: "RH",
            qui: "Responsable RH",
            texte: "Et sur la partie salariale, vous vous situez où aujourd'hui ?",
            ton: "neutre" as const,
          },
        ].map((m) => (
          <div key={m.ini} className="flex items-start gap-2.5">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-pill text-[10.5px] font-bold ${
                m.ton === "accent"
                  ? "border-[1.5px] border-accent/25 bg-accent/10 text-accent"
                  : "border-[1.5px] border-border bg-bg-alt text-ink-muted"
              }`}
            >
              {m.ini}
            </span>
            <p className="text-[12.5px] leading-[1.55]">
              <span className="mb-0.5 block text-[10.5px] font-semibold text-ink-faint">
                {m.qui}
              </span>
              {m.texte}
            </p>
          </div>
        ))}

        <div className="flex items-start gap-2.5 border-t-[1.5px] border-dashed border-border pt-3.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-ok/10 text-[10.5px] font-bold text-ok">
            VS
          </span>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-[10.5px] font-semibold text-ink-faint">
              Vous · à voix haute
            </p>
            <div className="flex h-5 items-end gap-[3px]" aria-hidden="true">
              {[0, 90, 180, 270, 120, 300, 60, 210, 150, 240, 30, 200].map((d, i) => (
                <i
                  key={i}
                  className="w-[3px] animate-voice rounded-sm bg-ok opacity-75"
                  style={{ animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
          <span className="shrink-0 rounded-pill border-[1.5px] border-border px-2.5 py-1 text-[10.5px] font-semibold text-ink-muted">
            Terminer
          </span>
        </div>
      </div>
    </Fenetre>
  );
}

/* ═══ 3. LE DÉBRIEF ══════════════════════════════════════════════════════ */
export function MaquetteDebrief() {
  const criteres = [
    { n: "Structure", v: 82 },
    { n: "Fond technique", v: 74 },
    { n: "Exemples", v: 88 },
    { n: "Clarté", v: 63 },
  ];
  return (
    <Fenetre
      titre="Débrief · Développeur Fullstack"
      libelle="Maquette de l'écran de débrief : une note globale de 78 sur 100, le détail par critère, ce qui a convaincu et ce qui a coincé."
      pastille={
        <span className="rounded-pill bg-ok/10 px-2 py-0.5 text-[10.5px] font-semibold text-ok">
          Étape 3
        </span>
      }
    >
      <div className="space-y-3.5">
        <div className="flex items-center gap-3.5">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 56 56" className="h-14 w-14 -rotate-90" aria-hidden="true">
              <circle cx="28" cy="28" r="24" fill="none" strokeWidth="5" className="stroke-border" />
              <circle
                cx="28" cy="28" r="24" fill="none" strokeWidth="5" strokeLinecap="round"
                strokeDasharray={150.8} strokeDashoffset={150.8 * (1 - 0.78)}
                className="stroke-accent"
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-mono text-[15px] font-medium">
              78
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold">Réponse solide</p>
            <p className="text-[12px] text-ink-muted">
              Vous progressez de 14 points sur vos 7 entretiens.
            </p>
          </div>
        </div>

        <div className="space-y-2 border-t-[1.5px] border-dashed border-border pt-3.5">
          {criteres.map((c) => (
            <div key={c.n} className="grid grid-cols-[88px_1fr_26px] items-center gap-2.5 text-[11.5px]">
              <span className="truncate text-ink-muted">{c.n}</span>
              <span className="h-[6px] overflow-hidden rounded-pill bg-bg-alt">
                <i className="block h-full rounded-pill bg-accent" style={{ width: `${c.v}%` }} />
              </span>
              <span className="text-right font-mono font-medium">{c.v}</span>
            </div>
          ))}
        </div>

        <div className="space-y-1.5 border-t-[1.5px] border-dashed border-border pt-3.5 text-[12px]">
          <p className="flex gap-2 text-ink-muted">
            <span className="shrink-0 font-semibold text-ok">A marché</span>
            <span className="min-w-0">Exemple concret, vocabulaire précis.</span>
          </p>
          <p className="flex gap-2 text-ink-muted">
            <span className="shrink-0 font-semibold text-warn">À revoir</span>
            <span className="min-w-0">Vous avez accéléré sur la fin.</span>
          </p>
        </div>
      </div>
    </Fenetre>
  );
}
