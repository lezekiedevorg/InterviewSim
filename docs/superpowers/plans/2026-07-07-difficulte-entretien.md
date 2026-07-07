# Difficulté de l'entretien — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Réglage de difficulté à 3 niveaux (Détendu / Réaliste / Sans pitié) qui change le comportement du recruteur (et du jury) via un bloc de consignes injecté dans le prompt — jamais la notation.

**Architecture:** `lib/difficulte.ts` = source de vérité (id, libellé, description UI, bloc de consignes) ; `buildRecruiterPrompt`/`buildJuryPrompt` injectent le bloc quand il est non vide (réaliste = bloc vide = prompt inchangé octet pour octet) ; pilules dans le formulaire d'accueil ; le niveau voyage dans `InterviewContext.difficulte` et est sauvegardé dans le jsonb `context` de la session. Spec : `docs/superpowers/specs/2026-07-07-difficulte-entretien-design.md`.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind v3 (charte « Studio nuit »), Vitest.

## Global Constraints

- Texte utilisateur en **français**, tutoiement. Zéro dépendance npm ajoutée.
- Ids exacts : `detendu`, `realiste` (défaut), `sans-pitie`.
- **Non-régression absolue** : sans `difficulte` (ou avec `realiste`), les prompts recruteur et jury restent identiques à aujourd'hui — rien n'est inséré, pas même un titre.
- `buildDebriefPrompt` ne reçoit JAMAIS le niveau (scores comparables — décision du sous-projet B).
- Style UI « Studio nuit » : pilule active `bg-amber-400 text-amber-ink`, inactive `bg-night-700 text-muted ring-1 ring-cream/15`, cibles tactiles ≥ 44px, labels 11px uppercase tracking 0.14em `text-faint`.
- Branche : `feat/score-credible` (déjà active). Commandes : `npm test`, `npm run build`.

---

### Task 1 : Source de vérité `lib/difficulte.ts` + type

**Files:**
- Modify: `lib/types.ts` (ajouter `DifficulteId`, champ `difficulte?` sur `InterviewContext`)
- Create: `lib/difficulte.ts`
- Test: `tests/difficulte.test.ts`

**Interfaces:**
- Produces: `DifficulteId = "detendu" | "realiste" | "sans-pitie"` (dans `lib/types.ts`) ; `DIFFICULTES: { id: DifficulteId; label: string; description: string; bloc: string }[]` ; `difficulteBloc(id?: string): string` (défaut et id inconnu → `""`) ; `difficulteLabel(id: unknown): string | null` (libellé si niveau connu ≠ realiste, sinon null).

- [ ] **Step 1 : Ajouter le type dans `lib/types.ts`**

Après le type `ChatMessage`, ajouter :

```ts
export type DifficulteId = "detendu" | "realiste" | "sans-pitie";
```

Et dans `InterviewContext`, ajouter le champ optionnel (compat totale — anciens appels sans le champ → réaliste) :

```ts
export type InterviewContext = {
  poste: string;
  entreprise?: string;
  domaine?: string;
  niveau?: string;
  langue?: string;
  cv: string;
  offre?: string;
  difficulte?: DifficulteId; // absent → « realiste »
};
```

- [ ] **Step 2 : Écrire les tests qui échouent — `tests/difficulte.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { DIFFICULTES, difficulteBloc, difficulteLabel } from "../lib/difficulte";

describe("DIFFICULTES", () => {
  it("contient exactement 3 niveaux aux ids attendus", () => {
    expect(DIFFICULTES.map((d) => d.id)).toEqual(["detendu", "realiste", "sans-pitie"]);
  });
  it("chaque niveau a un libellé et une description non vides", () => {
    for (const d of DIFFICULTES) {
      expect(d.label.trim().length).toBeGreaterThan(0);
      expect(d.description.trim().length).toBeGreaterThan(0);
    }
  });
  it("réaliste est le seul niveau au bloc vide", () => {
    for (const d of DIFFICULTES) {
      if (d.id === "realiste") expect(d.bloc).toBe("");
      else expect(d.bloc.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("difficulteBloc", () => {
  it("sans argument → bloc vide (réaliste par défaut)", () => {
    expect(difficulteBloc()).toBe("");
    expect(difficulteBloc("realiste")).toBe("");
  });
  it("sans-pitie contient la consigne de coupure", () => {
    expect(difficulteBloc("sans-pitie")).toContain("Venons-en au fait");
  });
  it("detendu contient l'encouragement", () => {
    expect(difficulteBloc("detendu")).toContain("prenez votre temps");
  });
  it("id inconnu → réaliste (bloc vide)", () => {
    expect(difficulteBloc("nimporte-quoi")).toBe("");
  });
});

describe("difficulteLabel", () => {
  it("realiste, inconnu, undefined → null (rien à afficher)", () => {
    expect(difficulteLabel("realiste")).toBeNull();
    expect(difficulteLabel("nimporte")).toBeNull();
    expect(difficulteLabel(undefined)).toBeNull();
    expect(difficulteLabel(42)).toBeNull();
  });
  it("niveaux non réalistes → leur libellé", () => {
    expect(difficulteLabel("sans-pitie")).toBe("Sans pitié");
    expect(difficulteLabel("detendu")).toBe("Détendu");
  });
});
```

- [ ] **Step 3 : Vérifier que les tests échouent**

Run : `npm test 2>&1 | tail -10`
Attendu : ÉCHEC — `tests/difficulte.test.ts` ne résout pas `../lib/difficulte`.

- [ ] **Step 4 : Implémenter `lib/difficulte.ts`**

```ts
import type { DifficulteId } from "./types";

// Les 3 niveaux de difficulté — source de vérité unique (UI, prompts et progression la consomment).
// Le bloc est injecté tel quel dans les prompts recruteur/jury ; réaliste = bloc vide
// = comportement actuel inchangé. La difficulté ne touche JAMAIS la notation.
export const DIFFICULTES: {
  id: DifficulteId;
  label: string;
  description: string;
  bloc: string;
}[] = [
  {
    id: "detendu",
    label: "Détendu",
    description: "Recruteur bienveillant qui te met en confiance — idéal pour un premier essai.",
    bloc: `- Ton chaleureux et rassurant : mets le candidat en confiance, encourage-le (« prenez votre temps »).
- Si le candidat sèche ou répond à côté, reformule ta question plus simplement au lieu d'insister.
- Une seule relance douce par réponse vague, puis passe à la suite.
- AUCUNE question piège : remplace la phase « questions pièges » par des questions de projection simples (« comment vous voyez-vous dans ce poste ? »).
- Ne confronte pas les incohérences pendant l'entretien : garde-les pour le débrief.`,
  },
  {
    id: "realiste",
    label: "Réaliste",
    description: "Un vrai entretien professionnel : relances, écarts CV/offre confrontés.",
    bloc: "",
  },
  {
    id: "sans-pitie",
    label: "Sans pitié",
    description: "Recruteur pressé qui coupe et challenge tout — comme un vrai mauvais jour.",
    bloc: `- Tu es un recruteur pressé et exigeant, qui a vu trop de candidats aujourd'hui.
- Si une réponse s'étire ou tourne en rond, coupe poliment mais fermement : « Venons-en au fait. »
- Challenge CHAQUE affirmation chiffrée ou invérifiable : « Comment le mesurez-vous ? », « Qui peut le confirmer ? »
- Confronte IMMÉDIATEMENT toute incohérence ou contradiction avec le CV, l'offre ou une réponse précédente.
- Pose des questions pièges dès le milieu de l'entretien, pas seulement à la fin.
- Aucun compliment, aucun encouragement pendant l'entretien ; enchaîne sec après chaque réponse, sans transition aimable.`,
  },
];

// Bloc de consignes du niveau demandé. Id absent ou inconnu → réaliste (vide) :
// les anciens appels et les valeurs corrompues retombent sur le comportement actuel.
export function difficulteBloc(id?: string): string {
  return DIFFICULTES.find((d) => d.id === id)?.bloc ?? "";
}

// Libellé à afficher dans la progression — null pour réaliste (le défaut n'est pas un événement)
// et pour toute valeur inconnue (le champ vient d'un jsonb non typé).
export function difficulteLabel(id: unknown): string | null {
  if (typeof id !== "string" || id === "realiste") return null;
  return DIFFICULTES.find((d) => d.id === id)?.label ?? null;
}
```

- [ ] **Step 5 : Vérifier que les tests passent**

Run : `npm test 2>&1 | tail -5`
Attendu : PASS.

- [ ] **Step 6 : Commit**

```bash
git add lib/types.ts lib/difficulte.ts tests/difficulte.test.ts
git commit -m "feat(difficulte): 3 niveaux d'entretien (détendu/réaliste/sans pitié) — source de vérité et helpers"
```

---

### Task 2 : Injection dans les prompts recruteur et jury

**Files:**
- Modify: `lib/prompts.ts` (`buildRecruiterPrompt` et `buildJuryPrompt` uniquement)
- Test: `tests/prompts.test.ts` (ajouts uniquement — aucun test existant ne change)

**Interfaces:**
- Consumes: `difficulteBloc` de `lib/difficulte.ts` (Task 1) ; `ctx.difficulte` (optionnel).
- Produces: mêmes signatures qu'avant — `buildRecruiterPrompt(ctx)`, `buildJuryPrompt(ctx)` ; le bloc arrive via `ctx.difficulte`.

- [ ] **Step 1 : Ajouter les tests — dans `tests/prompts.test.ts`**

Ajouter un nouveau `describe` à la fin du fichier (les describe existants ne changent pas) :

```ts
describe("difficulté injectée dans les prompts", () => {
  const transcript: ChatMessage[] = [
    { role: "recruiter", text: "Parlez-moi de vous." },
    { role: "candidate", text: "Je suis développeur." },
  ];

  it("sans-pitie : le prompt recruteur contient le bloc", () => {
    const p = buildRecruiterPrompt({ ...ctx, difficulte: "sans-pitie" });
    expect(p).toContain("Venons-en au fait");
    expect(p).toContain("Attitude imposée");
  });

  it("detendu : le prompt jury contient le bloc", () => {
    const p = buildJuryPrompt({ ...ctx, difficulte: "detendu" });
    expect(p).toContain("prenez votre temps");
  });

  it("non-régression : sans difficulté ou en réaliste, les prompts sont inchangés", () => {
    expect(buildRecruiterPrompt(ctx)).toBe(buildRecruiterPrompt({ ...ctx, difficulte: "realiste" }));
    expect(buildRecruiterPrompt(ctx)).not.toContain("Attitude imposée");
    expect(buildJuryPrompt(ctx)).toBe(buildJuryPrompt({ ...ctx, difficulte: "realiste" }));
    expect(buildJuryPrompt(ctx)).not.toContain("Attitude imposée");
  });

  it("le prompt débrief ignore totalement la difficulté", () => {
    const p = buildDebriefPrompt({ ...ctx, difficulte: "sans-pitie" }, transcript);
    expect(p).not.toContain("Venons-en au fait");
    expect(p).not.toContain("Attitude imposée");
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

Run : `npm test 2>&1 | tail -10`
Attendu : ÉCHEC — les prompts ne contiennent pas « Attitude imposée ».

- [ ] **Step 3 : Implémenter l'injection dans `lib/prompts.ts`**

Ajouter l'import en tête de fichier :

```ts
import { difficulteBloc } from "./difficulte";
```

Dans `buildRecruiterPrompt`, ajouter au début du corps de la fonction :

```ts
  const bloc = difficulteBloc(ctx.difficulte);
  const attitude = bloc === "" ? "" : `\nAttitude imposée pour cet entretien (prioritaire sur le reste) :\n${bloc}\n`;
```

Puis insérer `${attitude}` dans le template, sur sa propre ligne, juste AVANT la ligne `Règles :` (le prompt réaliste reste octet pour octet identique puisque `attitude` est alors la chaîne vide) :

```ts
${contextLines(ctx)}
${attitude}
Règles :
```

ATTENTION à la non-régression : aujourd'hui le template contient `${contextLines(ctx)}\n\nRègles :` (une ligne vide entre les deux). Avec l'insertion ci-dessus, en réaliste on obtient `${contextLines(ctx)}\n\nRègles :` (la ligne `${attitude}` vide laisse exactement la ligne vide d'origine) — vérifier avec le test de non-régression qui compare octet pour octet.

Faire EXACTEMENT la même chose dans `buildJuryPrompt` (mêmes deux lignes en début de fonction, même insertion avant son `Règles :`).

- [ ] **Step 4 : Vérifier que les tests passent**

Run : `npm test 2>&1 | tail -5`
Attendu : PASS (y compris le test de non-régression octet pour octet et tous les tests existants).

- [ ] **Step 5 : Commit**

```bash
git add lib/prompts.ts tests/prompts.test.ts
git commit -m "feat(difficulte): blocs d'attitude injectés dans les prompts recruteur et jury (réaliste = prompt inchangé)"
```

---

### Task 3 : UI — pilules du formulaire, envoi, sauvegarde, tag progression

**Files:**
- Modify: `app/page.tsx` (état + pilules + envoi + whitelist Supabase)
- Modify: `app/progression/page.tsx` (tag à côté de la date)

**Interfaces:**
- Consumes: `DIFFICULTES`, `difficulteLabel` de `lib/difficulte.ts` ; type `DifficulteId` de `lib/types.ts`.
- Produces: rien pour d'autres tâches (feuille de l'arbre).

- [ ] **Step 1 : État et envoi dans `app/page.tsx`**

Ajouter les imports :

```ts
import { DIFFICULTES } from "@/lib/difficulte";
import type { DifficulteId } from "@/lib/types";
```

Ajouter l'état à côté de `const [jury, setJury] = useState(false);` :

```ts
  const [difficulte, setDifficulte] = useState<DifficulteId>("realiste");
```

Dans `streamRecruiter`, le body envoie le contexte enrichi (le recruteur voit la difficulté) — remplacer :

```ts
        body: JSON.stringify({ context, history: nextHistory, jury }),
```

par :

```ts
        body: JSON.stringify({ context: { ...context, difficulte }, history: nextHistory, jury }),
```

NE PAS toucher au fetch de `/api/debrief` (le correcteur ne doit pas voir la difficulté).

Dans l'insert Supabase de `finishInterview`, ajouter `difficulte` à la whitelist `context` :

```ts
              context: {
                poste: context.poste,
                entreprise: context.entreprise,
                domaine: context.domaine,
                niveau: context.niveau,
                langue: context.langue,
                difficulte,
              },
```

- [ ] **Step 2 : Pilules dans le formulaire de `app/page.tsx`**

Insérer ce bloc juste AVANT le `<label className="mb-4 flex items-start gap-2.5 …">` de « Mode jury » :

```tsx
            <div className="mb-4">
              <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
                Difficulté
              </span>
              <div className="flex flex-wrap gap-2">
                {DIFFICULTES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDifficulte(d.id)}
                    aria-pressed={difficulte === d.id}
                    className={`min-h-[44px] cursor-pointer rounded-full px-4 py-2 text-[13px] font-semibold transition-all duration-200 ${
                      difficulte === d.id
                        ? "bg-amber-400 text-amber-ink"
                        : "bg-night-700 text-muted ring-1 ring-cream/15 hover:text-cream"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[13px] leading-snug text-muted">
                {DIFFICULTES.find((d) => d.id === difficulte)?.description}
              </p>
            </div>
```

- [ ] **Step 3 : Tag dans `app/progression/page.tsx`**

Ajouter l'import :

```ts
import { difficulteLabel } from "@/lib/difficulte";
```

Remplacer la ligne de date de chaque session :

```tsx
                <p className="text-xs text-faint">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </p>
```

par :

```tsx
                <p className="text-xs text-faint">
                  {[new Date(r.created_at).toLocaleDateString("fr-FR"), difficulteLabel(r.context?.difficulte)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
```

- [ ] **Step 4 : Vérifier build + tests**

Run : `npm run build 2>&1 | tail -3 && npm test 2>&1 | tail -3`
Attendu : build OK, tests PASS.

- [ ] **Step 5 : Commit**

```bash
git add app/page.tsx app/progression/page.tsx
git commit -m "feat(difficulte): pilules dans le formulaire, envoi au recruteur, sauvegarde session et tag progression"
```

---

### Task 4 : Vérification finale

**Files:** aucun nouveau.

- [ ] **Step 1 : Suite complète**

Run : `npm run build 2>&1 | tail -3 && npm test 2>&1 | tail -5 && npx tsc --noEmit`
Attendu : tout vert.

- [ ] **Step 2 : Test de bout en bout réel (navigateur)**

1. Formulaire : les 3 pilules s'affichent, « Réaliste » actif par défaut, la description change en cliquant.
2. Entretien « Sans pitié » avec une réponse longue et vague → le recruteur doit couper/challenger.
3. Entretien « Détendu » en séchant sur une question → le recruteur doit reformuler gentiment.
4. Session connectée en « Sans pitié » → « Ma progression » affiche « … · Sans pitié » à côté de la date ; une ancienne session n'affiche rien de plus.

- [ ] **Step 3 : Pousser la branche**

```bash
git push origin feat/score-credible
```
