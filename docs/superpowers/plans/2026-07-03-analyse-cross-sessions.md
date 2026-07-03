# Analyse cross-sessions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter à « Ma progression » un bouton qui génère à la demande une synthèse IA des points faibles récurrents du candidat + un plan d'action.

**Architecture:** Calque exact du flux `/api/debrief` : la page envoie les 10 dernières sessions réduites à une nouvelle route `POST /api/analyse`, qui construit un prompt, appelle Groq via `askModelText`, parse le JSON et renvoie `{ analysis }`. Helpers purs `buildCrossAnalysisPrompt` + `parseCrossAnalysis` testés en unitaire ; route et UI vérifiées au build + navigateur.

**Tech Stack:** Next.js App Router + TypeScript, Groq (`llama-3.3-70b-versatile` via `lib/askModel`), Supabase (chargement RLS existant, inchangé), vitest.

**Spec:** `docs/superpowers/specs/2026-07-03-analyse-cross-sessions-design.md`

## Global Constraints

- **Copie UI en français.**
- **Aucune nouvelle dépendance.**
- **Réutiliser les patterns existants** : la route calque `app/api/debrief/route.ts` (route handler App Router, `askModelText(prompt, seed)`, re-essai unique, fallback `{ raw }`, `isRateLimitError` → 429, 500 générique). `parseCrossAnalysis` calque `lib/parseDebrief.ts`. Le composant calque `app/components/Debrief.tsx`.
- **Ne JAMAIS envoyer le CV ni le transcript à Groq** — uniquement `poste` + `pointsATravailler` + `syntheseGenerale`, plafonné à 10 sessions.
- **Seuil : 3 entretiens** — bouton masqué en dessous (garde-fou serveur en plus : `400` si `< 3`).
- Tests via **vitest** (`npm test`), descriptions en français, style de `tests/parseDebrief.test.ts` et `tests/prompts.test.ts`.
- Palette : `brand` (émeraude) + `amber`/`emerald`/`red` déjà utilisés dans `Debrief.tsx`.

---

### Task 1: Types + `buildCrossAnalysisPrompt`

**Files:**
- Modify: `lib/types.ts` (ajout de 2 types)
- Modify: `lib/prompts.ts` (ajout d'une fonction + import)
- Test: `tests/prompts.test.ts` (ajout d'un `describe`)

**Interfaces:**
- Consumes: rien.
- Produces:
  - `CrossAnalysis = { pointsRecurrents: string[]; planAction: string[] }`
  - `SessionSummary = { poste: string; pointsATravailler: string[]; syntheseGenerale: string }`
  - `buildCrossAnalysisPrompt(sessions: SessionSummary[]): string`

- [ ] **Step 1: Ajouter les types**

À la fin de `lib/types.ts` :

```ts
export type CrossAnalysis = {
  pointsRecurrents: string[];
  planAction: string[];
};

export type SessionSummary = {
  poste: string;
  pointsATravailler: string[];
  syntheseGenerale: string;
};
```

- [ ] **Step 2: Écrire les tests qui échouent**

Dans `tests/prompts.test.ts`, ajouter `buildCrossAnalysisPrompt` à l'import existant depuis `../lib/prompts` et `SessionSummary` à l'import de type depuis `../lib/types`, puis ajouter à la fin du fichier :

```ts
describe("buildCrossAnalysisPrompt", () => {
  const sessions: SessionSummary[] = [
    { poste: "Dev back-end", pointsATravailler: ["réponses trop vagues"], syntheseGenerale: "Correct mais imprécis." },
    { poste: "Dev front-end", pointsATravailler: ["manque d'exemples chiffrés"], syntheseGenerale: "Bon contact." },
  ];

  it("inclut le poste, les points à travailler et la synthèse de chaque entretien", () => {
    const p = buildCrossAnalysisPrompt(sessions);
    expect(p).toContain("Dev back-end");
    expect(p).toContain("réponses trop vagues");
    expect(p).toContain("manque d'exemples chiffrés");
    expect(p).toContain("Correct mais imprécis.");
  });

  it("demande un JSON avec les deux champs attendus", () => {
    const p = buildCrossAnalysisPrompt(sessions);
    expect(p).toContain("pointsRecurrents");
    expect(p).toContain("planAction");
  });
});
```

- [ ] **Step 3: Lancer les tests pour vérifier l'échec**

Run: `npm test -- prompts`
Expected: FAIL — `buildCrossAnalysisPrompt is not a function` / erreur d'import.

- [ ] **Step 4: Implémenter le prompt**

Dans `lib/prompts.ts`, ajouter `SessionSummary` à l'import de type existant (`import type { InterviewContext, ChatMessage, SessionSummary } from "./types";`) puis ajouter à la fin :

```ts
export function buildCrossAnalysisPrompt(sessions: SessionSummary[]): string {
  const entretiens = sessions
    .map((s, i) => {
      const points = s.pointsATravailler.map((p) => `  - ${p}`).join("\n");
      return `Entretien ${i + 1} (${s.poste}) :\nPoints à travailler :\n${points}\nSynthèse : ${s.syntheseGenerale}`;
    })
    .join("\n\n");

  return `Tu es un coach en recrutement. Voici les débriefs de plusieurs entretiens d'entraînement d'un même candidat. Identifie ce qui revient d'un entretien à l'autre — les points faibles RÉCURRENTS, pas les remarques isolées — puis propose un plan d'action.

${entretiens}

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, avec exactement ces champs :
{
  "pointsRecurrents": [liste de 3 à 5 chaînes : chaque thème récurrent avec une courte explication],
  "planAction": [liste de 2 à 3 chaînes : actions concrètes à travailler en priorité]
}`;
}
```

- [ ] **Step 5: Lancer les tests pour vérifier le succès**

Run: `npm test -- prompts`
Expected: PASS (tests existants + `buildCrossAnalysisPrompt`).

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/prompts.ts tests/prompts.test.ts
git commit -m "feat: types CrossAnalysis + buildCrossAnalysisPrompt"
```

---

### Task 2: `parseCrossAnalysis`

**Files:**
- Create: `lib/parseCrossAnalysis.ts`
- Test: `tests/parseCrossAnalysis.test.ts`

**Interfaces:**
- Consumes: `CrossAnalysis` (Task 1).
- Produces: `parseCrossAnalysis(raw: string): CrossAnalysis | null`.

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `tests/parseCrossAnalysis.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { parseCrossAnalysis } from "../lib/parseCrossAnalysis";

const valid = {
  pointsRecurrents: ["Réponses vagues : manque d'exemples concrets"],
  planAction: ["Préparer 3 exemples chiffrés"],
};

describe("parseCrossAnalysis", () => {
  it("parse un JSON brut valide", () => {
    expect(parseCrossAnalysis(JSON.stringify(valid))).toEqual(valid);
  });

  it("parse un JSON entouré d'un bloc markdown", () => {
    const raw = "```json\n" + JSON.stringify(valid) + "\n```";
    expect(parseCrossAnalysis(raw)).toEqual(valid);
  });

  it("renvoie null si JSON invalide", () => {
    expect(parseCrossAnalysis("pas du json")).toBeNull();
  });

  it("renvoie null si un champ obligatoire manque", () => {
    const { planAction, ...incomplete } = valid;
    expect(parseCrossAnalysis(JSON.stringify(incomplete))).toBeNull();
  });

  it("renvoie null si un champ n'est pas un tableau", () => {
    expect(parseCrossAnalysis(JSON.stringify({ pointsRecurrents: "x", planAction: [] }))).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npm test -- parseCrossAnalysis`
Expected: FAIL — module `../lib/parseCrossAnalysis` introuvable.

- [ ] **Step 3: Implémenter le parseur**

Créer `lib/parseCrossAnalysis.ts` (calque de `lib/parseDebrief.ts`) :

```ts
import type { CrossAnalysis } from "./types";

export function parseCrossAnalysis(raw: string): CrossAnalysis | null {
  // Retire un éventuel bloc markdown ```json ... ```
  const cleaned = raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let obj: unknown;
  try {
    obj = JSON.parse(cleaned);
  } catch {
    return null;
  }

  if (typeof obj !== "object" || obj === null) return null;
  const d = obj as Record<string, unknown>;

  if (!Array.isArray(d.pointsRecurrents) || !Array.isArray(d.planAction)) {
    return null;
  }

  return {
    pointsRecurrents: d.pointsRecurrents as string[],
    planAction: d.planAction as string[],
  };
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npm test -- parseCrossAnalysis`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/parseCrossAnalysis.ts tests/parseCrossAnalysis.test.ts
git commit -m "feat: parseCrossAnalysis (calque parseDebrief)"
```

---

### Task 3: Route `POST /api/analyse`

**Files:**
- Create: `app/api/analyse/route.ts`

**Interfaces:**
- Consumes: `buildCrossAnalysisPrompt` (Task 1), `parseCrossAnalysis` (Task 2), `askModelText` (`lib/askModel`), `isRateLimitError` (`lib/mapModelError`), `SessionSummary` (Task 1).
- Produces: `POST /api/analyse` — body `{ sessions: SessionSummary[] }` → réponse `{ analysis: CrossAnalysis }` | `{ raw: string }` | `{ error: string }`.

*Note : route calquée sur `app/api/debrief/route.ts` — pas de test unitaire (comme le débrief), vérif au build + navigateur en Task 4. Avant d'écrire, relire `app/api/debrief/route.ts` pour coller au pattern App Router du projet.*

- [ ] **Step 1: Créer la route**

Créer `app/api/analyse/route.ts` :

```ts
import { buildCrossAnalysisPrompt } from "@/lib/prompts";
import { askModelText } from "@/lib/askModel";
import { parseCrossAnalysis } from "@/lib/parseCrossAnalysis";
import { isRateLimitError } from "@/lib/mapModelError";
import type { SessionSummary } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { sessions: SessionSummary[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const sessions = Array.isArray(body.sessions) ? body.sessions : [];
  if (sessions.length < 3) {
    return Response.json(
      { error: "Au moins 3 entretiens sont nécessaires." },
      { status: 400 }
    );
  }

  const prompt = buildCrossAnalysisPrompt(sessions.slice(0, 10));

  // ponytail: Groq exige >=1 message user ; seed serveur, jamais montré à l'UI (comme le débrief).
  const seed = [
    { role: "candidate" as const, text: "Génère l'analyse de mes points faibles récurrents." },
  ];

  try {
    // Premier essai
    let raw = await askModelText(prompt, seed);
    let analysis = parseCrossAnalysis(raw);

    // Un seul re-essai si le JSON est malformé
    if (!analysis) {
      raw = await askModelText(prompt, seed);
      analysis = parseCrossAnalysis(raw);
    }

    if (analysis) return Response.json({ analysis });
    return Response.json({ raw }); // fallback texte brut
  } catch (err: unknown) {
    if (isRateLimitError(err)) {
      return Response.json(
        { error: "L'IA est momentanément surchargée, réessaie dans quelques instants." },
        { status: 429 }
      );
    }
    return Response.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Vérifier build + suite**

Run: `npm run build && npm test`
Expected: build OK (la route compile, route `/api/analyse` listée) ; tous les tests toujours verts.

- [ ] **Step 3: Commit**

```bash
git add app/api/analyse/route.ts
git commit -m "feat: route /api/analyse (synthèse points faibles récurrents)"
```

---

### Task 4: UI — composant + bouton sur « Ma progression »

**Files:**
- Create: `app/components/CrossAnalysis.tsx`
- Modify: `app/progression/page.tsx`

**Interfaces:**
- Consumes: `CrossAnalysis` type (Task 1), route `/api/analyse` (Task 3), `Button` (`app/components/ui/Button`), `Card` (`app/components/ui/Card`).
- Produces: bouton + affichage de l'analyse sur la page progression. Aucune nouvelle interface exportée hors `CrossAnalysis` (composant).

- [ ] **Step 1: Créer le composant d'affichage**

Créer `app/components/CrossAnalysis.tsx` (calque du style de `Debrief.tsx` ; amber = points faibles, emerald = plan) :

```tsx
import type { CrossAnalysis as CrossAnalysisType } from "@/lib/types";
import { Card } from "@/app/components/ui/Card";

export function CrossAnalysis({ data }: { data: CrossAnalysisType }) {
  return (
    <div className="flex flex-col gap-4">
      <Card className="border-l-4 border-l-amber-500">
        <h3 className="mb-2 flex items-center gap-2 font-heading font-semibold text-amber-700">
          <span aria-hidden>↻</span> Points faibles récurrents
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.pointsRecurrents.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </Card>
      <Card className="border-l-4 border-l-emerald-500">
        <h3 className="mb-2 flex items-center gap-2 font-heading font-semibold text-emerald-700">
          <span aria-hidden>◎</span> Plan d&apos;action
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
          {data.planAction.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Câbler la page progression (imports + état)**

Dans `app/progression/page.tsx` :

Ajouter aux imports (après l'import de `Debrief`) :

```ts
import { CrossAnalysis } from "@/app/components/CrossAnalysis";
import type { CrossAnalysis as CrossAnalysisType } from "@/lib/types";
```

Ajouter les états, à la suite de `const [openId, setOpenId] = useState<string | null>(null);` :

```ts
  const [analysis, setAnalysis] = useState<CrossAnalysisType | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
```

- [ ] **Step 3: Ajouter le handler d'analyse**

Toujours dans `app/progression/page.tsx`, juste avant le `return (` final (après `const points = sparklinePoints(...)`), ajouter :

```ts
  async function runAnalysis() {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const payload = desc.slice(0, 10).map((s) => ({
        poste: s.poste,
        pointsATravailler: s.debrief.pointsATravailler,
        syntheseGenerale: s.debrief.syntheseGenerale,
      }));
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessions: payload }),
      });
      const data = await res.json();
      if (!res.ok || !data.analysis) {
        setAnalyzeError(data.error ?? "L'analyse n'a pas pu être générée, réessaie.");
        return;
      }
      setAnalysis(data.analysis);
    } catch {
      setAnalyzeError("Une erreur réseau est survenue, réessaie.");
    } finally {
      setAnalyzing(false);
    }
  }
```

- [ ] **Step 4: Ajouter la carte d'analyse dans le JSX**

Dans `app/progression/page.tsx`, `Button` est-il importé ? Ajouter l'import s'il manque : `import { Button } from "@/app/components/ui/Button";`.

Insérer, entre la `Card` « Évolution du score » (celle qui contient le `<svg>`) et le `<div className="flex flex-col gap-3">` de la liste des sessions :

```tsx
      <Card className="mb-6">
        <h2 className="mb-3 font-heading font-semibold">Points faibles récurrents</h2>
        {sessions.length < 3 ? (
          <p className="text-sm text-slate-500">
            Fais au moins 3 entretiens pour débloquer l&apos;analyse de tes points faibles récurrents.
          </p>
        ) : (
          <>
            <Button onClick={runAnalysis} disabled={analyzing}>
              {analyzing ? "Analyse en cours…" : "🔍 Analyser mes points faibles récurrents"}
            </Button>
            {analyzeError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{analyzeError}</p>
            )}
            {analysis && (
              <div className="mt-4">
                <CrossAnalysis data={analysis} />
              </div>
            )}
          </>
        )}
      </Card>
```

- [ ] **Step 5: Vérifier build + suite**

Run: `npm run build && npm test`
Expected: build OK, tous les tests verts (aucun test cassé).

- [ ] **Step 6: Vérification navigateur (manuelle, avec un compte + ≥3 entretiens)**

Lancer `npm run dev`, se connecter, aller sur « Ma progression » :
1. Avec < 3 entretiens : le message d'invite s'affiche, pas de bouton.
2. Avec ≥ 3 entretiens : le bouton « 🔍 Analyser… » apparaît.
3. Clic → « Analyse en cours… » puis affichage des 2 sections (points récurrents + plan d'action).
4. Vérifier qu'aucun CV / transcript n'est envoyé (onglet Réseau : le payload ne contient que `poste`, `pointsATravailler`, `syntheseGenerale`).

- [ ] **Step 7: Commit**

```bash
git add app/components/CrossAnalysis.tsx app/progression/page.tsx
git commit -m "feat: bouton + affichage analyse cross-sessions sur Ma progression"
```

---

## Self-Review

- **Couverture spec :** synthèse IA (`buildCrossAnalysisPrompt` T1) ✅ ; à la demande non stocké (route T3 + bouton T4) ✅ ; contenu points récurrents + plan d'action (types T1, composant T4) ✅ ; seuil 3 (client T4 step 4 + serveur T3 step 1) ✅ ; entrée réduite sans CV/transcript, cap 10 (payload T4 step 3 + `slice(0,10)` T3) ✅ ; gestion erreurs calquée débrief (T3) ✅ ; confidentialité (payload minimal T4) ✅ ; tests purs `buildCrossAnalysisPrompt` (T1) + `parseCrossAnalysis` (T2) ✅. Toutes les sections du spec sont couvertes.
- **Placeholders :** aucun — code réel à chaque step.
- **Cohérence des types :** `CrossAnalysis`/`SessionSummary` définis en T1, consommés à l'identique en T2 (`parseCrossAnalysis`), T3 (route, `sessions.slice(0,10)`), T4 (état `CrossAnalysisType`, payload `{ poste, pointsATravailler, syntheseGenerale }` = `SessionSummary`). Le champ `debrief.pointsATravailler`/`debrief.syntheseGenerale` lu en T4 correspond au type `SavedSession.debrief: Debrief` existant.
