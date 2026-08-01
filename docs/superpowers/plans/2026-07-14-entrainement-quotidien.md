# Mode Entraînement (drills thématiques) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un mode « Entraînement » où l'utilisateur choisit un thème et fait un mini-entretien de 3-5 questions ciblées, obtient un mini-rapport, et voit une maîtrise par thème progresser.

**Architecture:** Un drill est un entretien court thématique : on réutilise le pipeline voix/chat (`MeetingRoom`), la route de streaming (`/api/interview`, étendue d'un param `theme`), et le patron du débrief (nouvelle route `/api/drill-report`). La persistance passe par une nouvelle table Supabase `drills` (séparée de `sessions` pour ne pas polluer le rendu du débrief). La maîtrise = moyenne glissante des scores par thème.

**Tech Stack:** Next.js (voir `node_modules/next/dist/docs/` avant tout code Next), React, TypeScript, Vitest, Supabase (+ RLS), Groq (gpt-oss-120b via `askModel`).

## Global Constraints

- Français partout (UI, prompts, commentaires).
- Aucune nouvelle dépendance npm.
- L'entretien complet existant reste **strictement inchangé** (chemins parallèles).
- Whitelist des thèmes par `.find` (pas d'injection prompt), calqué sur `lib/difficulte.ts`.
- Un drill est **jouable sans compte** ; la maîtrise n'est persistée/affichée que si connecté (calqué sur la sauvegarde best-effort du débrief).
- Modèle : `openai/gpt-oss-120b` via `askModel.ts` (ne pas ré-hardcoder l'endpoint).
- TDD : test qui échoue → implémentation minimale → test qui passe → commit. Petits commits.
- Lancer les tests : `npx vitest run <fichier>`. Typecheck : `npx tsc --noEmit`.

---

### Task 1: Source de vérité des thèmes (`lib/drillThemes.ts`)

**Files:**
- Create: `lib/drillThemes.ts`
- Test: `tests/drillThemes.test.ts`

**Interfaces:**
- Produces:
  - `type DrillThemeId = "pitch" | "motivation" | "comportemental" | "situation" | "pieges" | "technique" | "nego"`
  - `DRILL_THEMES: { id: DrillThemeId; label: string; description: string; bloc: string }[]`
  - `drillTheme(id?: string): DrillTheme | undefined`
  - `drillThemeBloc(id?: string): string` (`""` si inconnu)

- [ ] **Step 1: Write the failing test**

```ts
// tests/drillThemes.test.ts
import { describe, it, expect } from "vitest";
import { DRILL_THEMES, drillTheme, drillThemeBloc } from "../lib/drillThemes";

describe("drillThemes", () => {
  it("expose 7 thèmes aux ids stables", () => {
    expect(DRILL_THEMES).toHaveLength(7);
    expect(DRILL_THEMES.map((t) => t.id)).toEqual([
      "pitch", "motivation", "comportemental", "situation", "pieges", "technique", "nego",
    ]);
  });
  it("drillTheme trouve par id, undefined si inconnu", () => {
    expect(drillTheme("nego")?.label).toContain("Négociation");
    expect(drillTheme("xxx")).toBeUndefined();
    expect(drillTheme()).toBeUndefined();
  });
  it("drillThemeBloc renvoie le bloc ou une chaîne vide", () => {
    expect(drillThemeBloc("pieges").length).toBeGreaterThan(0);
    expect(drillThemeBloc("xxx")).toBe("");
    expect(drillThemeBloc()).toBe("");
  });
  it("chaque bloc décrit le type de questions (non vide)", () => {
    for (const t of DRILL_THEMES) expect(t.bloc.trim().length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/drillThemes.test.ts`
Expected: FAIL (module `../lib/drillThemes` introuvable).

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/drillThemes.ts
export type DrillThemeId =
  | "pitch" | "motivation" | "comportemental" | "situation" | "pieges" | "technique" | "nego";

export type DrillTheme = {
  id: DrillThemeId;
  label: string;
  description: string;
  bloc: string; // injecté dans le prompt du drill : décrit les questions à poser
};

export const DRILL_THEMES: DrillTheme[] = [
  {
    id: "pitch",
    label: "Pitch perso",
    description: "Te présenter en une à deux minutes, claire et percutante.",
    bloc: "Concentre-toi UNIQUEMENT sur la présentation personnelle : « parlez-moi de vous », le pitch en 1-2 minutes, le fil conducteur du parcours, ce qui le rend pertinent pour le poste. Pousse le candidat à structurer et à aller à l'essentiel.",
  },
  {
    id: "motivation",
    label: "Motivation & adéquation",
    description: "Pourquoi ce poste, cette entreprise, et pourquoi toi.",
    bloc: "Concentre-toi UNIQUEMENT sur la motivation et l'adéquation : pourquoi ce poste, pourquoi cette entreprise, ce qui l'attire, sa projection, en quoi son profil colle à l'offre. Challenge les réponses passe-partout.",
  },
  {
    id: "comportemental",
    label: "Comportementales (STAR)",
    description: "« Une fois où… » : conflits, échecs, réussites, méthode STAR.",
    bloc: "Concentre-toi UNIQUEMENT sur les questions comportementales (méthode STAR) : « racontez une fois où… » (un conflit, un échec, une réussite, une prise d'initiative). Exige Situation, Tâche, Action, Résultat, avec des faits concrets et chiffrés.",
  },
  {
    id: "situation",
    label: "Mises en situation",
    description: "Cas pratiques, priorisation, décisions à chaud.",
    bloc: "Concentre-toi UNIQUEMENT sur les mises en situation : cas pratiques liés au poste, priorisation, arbitrages, « que feriez-vous si… ». Pousse le candidat à raisonner à voix haute et à justifier ses choix.",
  },
  {
    id: "pieges",
    label: "Questions pièges",
    description: "Défauts, écarts de CV, questions déstabilisantes.",
    bloc: "Concentre-toi UNIQUEMENT sur les questions pièges et déstabilisantes : défauts, échecs, trous ou écarts dans le CV, prétentions, « pourquoi vous et pas un autre ». Confronte fermement les réponses évasives.",
  },
  {
    id: "technique",
    label: "Technique métier",
    description: "Profondeur du savoir-faire propre au poste.",
    bloc: "Concentre-toi UNIQUEMENT sur la technique métier propre au poste : creuse la profondeur du savoir-faire, les outils, les méthodes, les arbitrages techniques. Adapte la difficulté au niveau indiqué.",
  },
  {
    id: "nego",
    label: "Négociation salariale",
    description: "Prétentions, justification, contre-offre.",
    bloc: "Concentre-toi UNIQUEMENT sur la négociation salariale : prétentions, justification de la valeur, réaction à une contre-offre basse, marges de négociation (avantages, télétravail). Mets le candidat sous une légère pression de négociation.",
  },
];

export function drillTheme(id?: string): DrillTheme | undefined {
  return DRILL_THEMES.find((t) => t.id === id);
}

export function drillThemeBloc(id?: string): string {
  return drillTheme(id)?.bloc ?? "";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/drillThemes.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/drillThemes.ts tests/drillThemes.test.ts
git commit -m "feat(entrainement): source de vérité des 7 thèmes de drill"
```

---

### Task 2: Prompt du drill (`buildDrillPrompt`)

**Files:**
- Modify: `lib/prompts.ts` (ajouter la fonction ; réutilise `contextLines` et `NATUREL_ORAL` déjà présents)
- Test: `tests/prompts.test.ts` (ajouter un `describe`)

**Interfaces:**
- Consumes: `drillThemeBloc` (Task 1), `InterviewContext` (`lib/types.ts`), `NATUREL_ORAL` + `contextLines` (déjà dans `lib/prompts.ts`).
- Produces: `buildDrillPrompt(ctx: InterviewContext, themeId: string, nbQuestions: number): string`

- [ ] **Step 1: Write the failing test**

```ts
// tests/prompts.test.ts — ajouter en haut l'import :
// import { buildDrillPrompt } from "../lib/prompts";
// puis ce describe :
describe("buildDrillPrompt", () => {
  const ctx = { poste: "Développeur back-end", cv: "5 ans Node.js" };
  it("injecte le bloc du thème et le poste", () => {
    const p = buildDrillPrompt(ctx, "pieges", 4);
    expect(p).toContain("questions pièges");
    expect(p).toContain("Développeur back-end");
  });
  it("cadre le nombre de questions et le rôle d'entraînement", () => {
    const p = buildDrillPrompt(ctx, "pitch", 4);
    expect(p).toContain("4 questions");
    expect(p.toLowerCase()).toContain("entraînement");
  });
  it("garde le naturel oral (réagir avant de questionner)", () => {
    expect(buildDrillPrompt(ctx, "pitch", 4)).toContain("Naturel à l'oral");
  });
  it("thème inconnu → pas de crash, prompt générique sûr", () => {
    const p = buildDrillPrompt(ctx, "xxx", 4);
    expect(p).toContain("Développeur back-end");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prompts.test.ts`
Expected: FAIL (`buildDrillPrompt` non exporté).

- [ ] **Step 3: Write minimal implementation**

Dans `lib/prompts.ts`, ajouter l'import en tête :
```ts
import { drillThemeBloc } from "./drillThemes";
```
Puis la fonction (après `buildRecruiterPrompt`) :
```ts
export function buildDrillPrompt(
  ctx: InterviewContext,
  themeId: string,
  nbQuestions: number
): string {
  const bloc = drillThemeBloc(themeId);
  const focus = bloc === "" ? "" : `\nThème imposé de cette session d'entraînement (ne sors JAMAIS de ce thème) :\n${bloc}\n`;
  return `Tu es un recruteur expérimenté qui fait passer une courte session d'ENTRAÎNEMENT ciblée sur UN seul thème (pas un entretien complet).

IMPORTANT : mène tout l'échange dans la « Langue de l'entretien » indiquée ci-dessous, même si ces instructions sont en français.

RÈGLE D'OR : chaque réplique fait 2 à 4 phrases orales MAXIMUM et pose UNE SEULE question (un seul point d'interrogation). Pose environ ${nbQuestions} questions au total sur le thème, en creusant les réponses, puis laisse la session se terminer sans la clôturer toi-même.

${contextLines(ctx)}
${focus}
${NATUREL_ORAL}

Règles :
- Reste STRICTEMENT sur le thème imposé ci-dessus ; ne pose aucune question d'un autre domaine.
- Une seule question à la fois, puis attends la réponse. Quand une réponse est vague, relance : demande un exemple concret, un chiffre, un « comment » ou un « pourquoi ».
- Calibre la difficulté sur le « Niveau » indiqué ; sans niveau, déduis-le du CV. Sans CV, n'invente PAS de parcours à la place du candidat.
- Ne donne pas de feedback pendant la session (il sera donné à la fin). Reste dans le personnage.
- N'écris JAMAIS de crochets à remplir du type « [entreprise] ». Réponds dans la langue de l'entretien indiquée ci-dessus.`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prompts.test.ts`
Expected: PASS (les 4 nouveaux tests + les anciens inchangés).

- [ ] **Step 5: Commit**

```bash
git add lib/prompts.ts tests/prompts.test.ts
git commit -m "feat(entrainement): buildDrillPrompt (thème imposé, N questions, naturel oral)"
```

---

### Task 3: Prompt + parsing du mini-rapport

**Files:**
- Modify: `lib/prompts.ts` (ajouter `buildDrillReportPrompt`)
- Create: `lib/parseDrillReport.ts`
- Create: `lib/drillReport.ts` (le type `DrillReport`, importé par le parseur et l'UI)
- Test: `tests/parseDrillReport.test.ts`, et un test de `buildDrillReportPrompt` dans `tests/prompts.test.ts`

**Interfaces:**
- Consumes: `ChatMessage` (`lib/types.ts`), `drillTheme` (Task 1).
- Produces:
  - `type DrillReport = { score: number; pointsForts: string[]; aTravailler: string[]; meilleureReponse: { question: string; avant: string; apres: string } | null }`
  - `buildDrillReportPrompt(themeId: string, transcript: ChatMessage[]): string`
  - `parseDrillReport(raw: string): DrillReport | null`

- [ ] **Step 1: Write the failing test**

```ts
// lib/drillReport.ts sera créé à l'étape 3 ; ce test cible le parseur.
// tests/parseDrillReport.test.ts
import { describe, it, expect } from "vitest";
import { parseDrillReport } from "../lib/parseDrillReport";

const ok = JSON.stringify({
  score: 72,
  pointsForts: ["clair", "structuré"],
  aTravailler: ["plus de chiffres", "trop long"],
  meilleureReponse: { question: "Parlez-moi de vous", avant: "euh je sais pas", apres: "Version améliorée." },
});

describe("parseDrillReport", () => {
  it("parse un JSON valide", () => {
    const r = parseDrillReport(ok)!;
    expect(r.score).toBe(72);
    expect(r.pointsForts).toHaveLength(2);
    expect(r.meilleureReponse?.apres).toContain("améliorée");
  });
  it("borne le score entre 0 et 100", () => {
    expect(parseDrillReport(JSON.stringify({ ...JSON.parse(ok), score: 140 }))!.score).toBe(100);
    expect(parseDrillReport(JSON.stringify({ ...JSON.parse(ok), score: -5 }))!.score).toBe(0);
  });
  it("accepte meilleureReponse null", () => {
    const r = parseDrillReport(JSON.stringify({ ...JSON.parse(ok), meilleureReponse: null }))!;
    expect(r.meilleureReponse).toBeNull();
  });
  it("retire un bloc markdown ```json", () => {
    expect(parseDrillReport("```json\n" + ok + "\n```")!.score).toBe(72);
  });
  it("JSON invalide → null", () => {
    expect(parseDrillReport("pas du json")).toBeNull();
    expect(parseDrillReport(JSON.stringify({ score: 50 }))).toBeNull(); // champs manquants
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/parseDrillReport.test.ts`
Expected: FAIL (modules absents).

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/drillReport.ts
export type DrillReport = {
  score: number; // 0-100, maîtrise du thème sur ce drill
  pointsForts: string[];
  aTravailler: string[];
  meilleureReponse: { question: string; avant: string; apres: string } | null;
};
```

```ts
// lib/parseDrillReport.ts
import type { DrillReport } from "./drillReport";

export function parseDrillReport(raw: string): DrillReport | null {
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

  if (
    typeof d.score !== "number" ||
    !Array.isArray(d.pointsForts) ||
    !Array.isArray(d.aTravailler)
  ) {
    return null;
  }

  let meilleureReponse: DrillReport["meilleureReponse"] = null;
  const m = d.meilleureReponse;
  if (m && typeof m === "object") {
    const mm = m as Record<string, unknown>;
    if (typeof mm.question === "string" && typeof mm.avant === "string" && typeof mm.apres === "string") {
      meilleureReponse = { question: mm.question, avant: mm.avant, apres: mm.apres };
    }
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(d.score))),
    pointsForts: (d.pointsForts as unknown[]).filter((x): x is string => typeof x === "string"),
    aTravailler: (d.aTravailler as unknown[]).filter((x): x is string => typeof x === "string"),
    meilleureReponse,
  };
}
```

Dans `lib/prompts.ts`, ajouter (réutilise le pattern de `buildDebriefPrompt`) :
```ts
import { drillTheme } from "./drillThemes"; // compléter l'import existant si besoin

export function buildDrillReportPrompt(themeId: string, transcript: ChatMessage[]): string {
  const theme = drillTheme(themeId);
  const label = theme?.label ?? "ce thème";
  const conversation = transcript
    .map((m) => `${m.role === "recruiter" ? "Recruteur" : "Candidat"}: ${m.text}`)
    .join("\n");

  return `Tu es un coach en recrutement. Évalue UNIQUEMENT la performance du candidat sur le thème « ${label} » dans cette courte session d'entraînement. Sois honnête et exigeant : la complaisance ne l'aide pas.

Session :
${conversation}

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, avec exactement ces champs :
{
  "score": un entier de 0 à 100 (maîtrise du thème : 50 = moyen non retenu, 70+ = convaincant, 85+ = rare),
  "pointsForts": [2 chaînes courtes],
  "aTravailler": [2 chaînes courtes et actionnables],
  "meilleureReponse": {
    "question": "la question concernée",
    "avant": "une citation EXACTE d'une réponse faible du candidat",
    "apres": "cette réponse réécrite en mieux (2-3 phrases orales)"
  }
}
Si aucune réponse du candidat n'est exploitable, mets "meilleureReponse": null. Ne cite JAMAIS le recruteur dans "avant".`;
}
```

Ajouter un test dans `tests/prompts.test.ts` :
```ts
describe("buildDrillReportPrompt", () => {
  it("demande le JSON attendu et cible le thème", () => {
    const p = buildDrillReportPrompt("pieges", [
      { role: "recruiter", text: "Votre plus gros défaut ?" },
      { role: "candidate", text: "Je suis perfectionniste." },
    ]);
    expect(p).toContain("score");
    expect(p).toContain("meilleureReponse");
    expect(p).toContain("Je suis perfectionniste.");
  });
});
```
(compléter l'import de `tests/prompts.test.ts` avec `buildDrillReportPrompt`.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/parseDrillReport.test.ts tests/prompts.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/drillReport.ts lib/parseDrillReport.ts lib/prompts.ts tests/parseDrillReport.test.ts tests/prompts.test.ts
git commit -m "feat(entrainement): mini-rapport (prompt + parseur tolérant)"
```

---

### Task 4: Routes API (drill + report)

**Files:**
- Modify: `app/api/interview/route.ts` (accepter un `theme` optionnel → `buildDrillPrompt`)
- Create: `app/api/drill-report/route.ts` (calque de `app/api/debrief/route.ts`)

**Interfaces:**
- Consumes: `buildDrillPrompt`, `buildDrillReportPrompt`, `parseDrillReport`, `askModelStream`, `askModelText`.
- Produces : `/api/interview` accepte `{ context, history, theme? }` ; `/api/drill-report` accepte `{ theme, transcript }` → `{ report }` ou `{ raw }`.

- [ ] **Step 1: Étendre `/api/interview`**

Dans `app/api/interview/route.ts` :
```ts
// import à compléter :
import { buildRecruiterPrompt, buildJuryPrompt, buildDrillPrompt } from "@/lib/prompts";

// dans POST, remplacer le type du body :
let body: { context: InterviewContext; history: ChatMessage[]; jury?: boolean; theme?: string };

// et le calcul du prompt :
const DRILL_QUESTIONS = 4; // ponytail: cap fixe ; passer en param si on veut 3-5 variable
const systemPrompt = body.theme
  ? buildDrillPrompt(body.context, body.theme, DRILL_QUESTIONS)
  : body.jury
  ? buildJuryPrompt(body.context)
  : buildRecruiterPrompt(body.context);
```
(Le reste de la route est inchangé : le streaming et la gestion 429 marchent tels quels.)

- [ ] **Step 2: Créer `/api/drill-report`**

```ts
// app/api/drill-report/route.ts
import { buildDrillReportPrompt } from "@/lib/prompts";
import { askModelText } from "@/lib/askModel";
import { parseDrillReport } from "@/lib/parseDrillReport";
import { isRateLimitError } from "@/lib/mapModelError";
import { drillTheme } from "@/lib/drillThemes";
import type { ChatMessage } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { theme: string; transcript: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }
  if (!drillTheme(body.theme)) {
    return Response.json({ error: "Thème inconnu." }, { status: 400 });
  }
  const transcript = body.transcript ?? [];
  const prompt = buildDrillReportPrompt(body.theme, transcript);
  const seed = [{ role: "candidate" as const, text: "Génère le bilan de cette session." }];

  try {
    let raw = await askModelText(prompt, seed, { temperature: 0 });
    let report = parseDrillReport(raw);
    if (!report) {
      raw = await askModelText(prompt, seed, { temperature: 0.2 });
      report = parseDrillReport(raw);
    }
    if (report) return Response.json({ report });
    return Response.json({ raw });
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

- [ ] **Step 3: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Vérifier la non-régression des tests**

Run: `npx vitest run`
Expected: PASS (aucun test cassé ; les routes ne sont pas testées unitairement, la logique l'est via Tasks 2-3).

- [ ] **Step 5: Commit**

```bash
git add app/api/interview/route.ts app/api/drill-report/route.ts
git commit -m "feat(entrainement): /api/interview accepte un thème + route /api/drill-report"
```

---

### Task 5: Maîtrise par thème (`lib/drillMastery.ts`, pur)

**Files:**
- Create: `lib/drillMastery.ts`
- Test: `tests/drillMastery.test.ts`

**Interfaces:**
- Consumes: `DrillThemeId` (Task 1).
- Produces:
  - `type DrillRow = { theme: string; score: number; created_at: string }`
  - `masteryByTheme(rows: DrillRow[], window?: number): { theme: DrillThemeId; label: string; mastery: number; count: number }[]`
  (moyenne glissante des `window` derniers scores par thème ; ne renvoie QUE les thèmes entamés, dans l'ordre de `DRILL_THEMES`.)

- [ ] **Step 1: Write the failing test**

```ts
// tests/drillMastery.test.ts
import { describe, it, expect } from "vitest";
import { masteryByTheme } from "../lib/drillMastery";

const row = (theme: string, score: number, d: string) => ({ theme, score, created_at: d });

describe("masteryByTheme", () => {
  it("moyenne glissante sur les N derniers, thèmes entamés seulement", () => {
    const rows = [
      row("pitch", 40, "2026-01-01"),
      row("pitch", 80, "2026-01-02"),
      row("nego", 60, "2026-01-03"),
    ];
    const m = masteryByTheme(rows, 5);
    expect(m.map((x) => x.theme)).toEqual(["pitch", "nego"]); // ordre de DRILL_THEMES
    expect(m.find((x) => x.theme === "pitch")!.mastery).toBe(60); // (40+80)/2
    expect(m.find((x) => x.theme === "pitch")!.count).toBe(2);
  });
  it("ne garde que la fenêtre des N derniers scores (par date desc)", () => {
    const rows = [
      row("pitch", 100, "2026-01-01"),
      row("pitch", 0, "2026-01-02"),
      row("pitch", 0, "2026-01-03"),
    ];
    // window=2 → deux plus récents : (0+0)/2 = 0
    expect(masteryByTheme(rows, 2).find((x) => x.theme === "pitch")!.mastery).toBe(0);
  });
  it("aucun drill → tableau vide", () => {
    expect(masteryByTheme([], 5)).toEqual([]);
  });
  it("ignore les thèmes inconnus", () => {
    expect(masteryByTheme([row("xxx", 90, "2026-01-01")], 5)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/drillMastery.test.ts`
Expected: FAIL (module absent).

- [ ] **Step 3: Write minimal implementation**

```ts
// lib/drillMastery.ts
import { DRILL_THEMES, type DrillThemeId } from "./drillThemes";

export type DrillRow = { theme: string; score: number; created_at: string };

export function masteryByTheme(
  rows: DrillRow[],
  window = 5
): { theme: DrillThemeId; label: string; mastery: number; count: number }[] {
  return DRILL_THEMES.flatMap((t) => {
    const scores = rows
      .filter((r) => r.theme === t.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)) // plus récent d'abord
      .slice(0, window)
      .map((r) => r.score);
    if (scores.length === 0) return [];
    const mastery = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
    return [{ theme: t.id, label: t.label, mastery, count: scores.length }];
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/drillMastery.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/drillMastery.ts tests/drillMastery.test.ts
git commit -m "feat(entrainement): calcul de la maîtrise par thème (moyenne glissante)"
```

---

### Task 6: Table Supabase `drills` + accès (`lib/drills.ts`)

**Files:**
- Create: `supabase/migrations/2026-07-14-drills.sql` (ou coller le SQL dans l'éditeur SQL Supabase — voir Step 1)
- Create: `lib/drills.ts` (save + load côté client, best-effort si connecté)

**Interfaces:**
- Consumes: `createBrowserSupabase` (`lib/supabase/client.ts`), `DrillReport` (Task 3), `DrillRow` (Task 5).
- Produces:
  - `saveDrill(theme: string, report: DrillReport): Promise<void>` (no-op silencieux si non connecté)
  - `loadDrillRows(): Promise<DrillRow[]>` (`[]` si non connecté)

- [ ] **Step 1: Créer la table + RLS dans Supabase**

Exécuter ce SQL dans l'éditeur SQL du projet Supabase (calqué sur la policy de `sessions`) :
```sql
create table if not exists public.drills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  theme text not null,
  score int not null check (score between 0 and 100),
  report jsonb,
  created_at timestamptz not null default now()
);
alter table public.drills enable row level security;

create policy "drills lisibles par leur auteur" on public.drills
  for select using (auth.uid() = user_id);
create policy "drills insérables par leur auteur" on public.drills
  for insert with check (auth.uid() = user_id);

create index if not exists drills_user_created_idx on public.drills (user_id, created_at desc);
```

- [ ] **Step 2: Écrire l'accès client**

```ts
// lib/drills.ts
import { createBrowserSupabase } from "./supabase/client";
import type { DrillReport } from "./drillReport";
import type { DrillRow } from "./drillMastery";

// Sauvegarde best-effort : si l'utilisateur n'est pas connecté, on ne fait rien (drill anonyme).
export async function saveDrill(theme: string, report: DrillReport): Promise<void> {
  try {
    const supabase = createBrowserSupabase();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    await supabase.from("drills").insert({
      user_id: data.user.id,
      theme,
      score: report.score,
      report,
    });
  } catch {
    // best-effort : un échec de sauvegarde ne casse jamais l'affichage du rapport
  }
}

export async function loadDrillRows(): Promise<DrillRow[]> {
  try {
    const supabase = createBrowserSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return [];
    const { data } = await supabase
      .from("drills")
      .select("theme, score, created_at")
      .order("created_at", { ascending: false });
    return (data as DrillRow[]) ?? [];
  } catch {
    return [];
  }
}
```

- [ ] **Step 3: Vérifier le typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/2026-07-14-drills.sql lib/drills.ts
git commit -m "feat(entrainement): table drills (RLS) + accès save/load best-effort"
```

---

### Task 7: Composant mini-rapport (`DrillReportCard`)

**Files:**
- Create: `app/components/DrillReportCard.tsx`

**Interfaces:**
- Consumes: `DrillReport` (Task 3), `scoreColor`/`BAND_HEX` (`lib/scoreColor.ts`), `Card` (`app/components/ui/Card.tsx`), `ScoreBadge` (`app/components/ui/ScoreBadge.tsx`).
- Produces: `<DrillReportCard report={DrillReport} themeLabel={string} />`

**Pattern à suivre :** mirror léger de `app/components/Debrief.tsx` (mêmes primitives UI, charte « Studio nuit »). Afficher : le `ScoreBadge` + `themeLabel` en tête ; deux colonnes « Points forts » / « À travailler » (listes) ; si `meilleureReponse` non null, un bloc « Ta réponse, en mieux » avec `avant` (barré/atténué) puis `apres` (mis en avant, bordure ambre). Aucune logique métier, pur affichage.

- [ ] **Step 1: Écrire le composant**

Créer `app/components/DrillReportCard.tsx` : composant présentational (`"use client"` non requis s'il ne prend pas de hooks). Structure JSX (compléter avec les classes Tailwind de `Debrief.tsx` pour rester cohérent) :
```tsx
import { Card } from "@/app/components/ui/Card";
import { ScoreBadge } from "@/app/components/ui/ScoreBadge";
import type { DrillReport } from "@/lib/drillReport";

export function DrillReportCard({ report, themeLabel }: { report: DrillReport; themeLabel: string }) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-cream">{themeLabel}</h2>
        <ScoreBadge score={report.score} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-ok">Points forts</h3>
          <ul className="list-disc pl-5 text-sm text-muted">{report.pointsForts.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
        <div>
          <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-400">À travailler</h3>
          <ul className="list-disc pl-5 text-sm text-muted">{report.aTravailler.map((p, i) => <li key={i}>{p}</li>)}</ul>
        </div>
      </div>
      {report.meilleureReponse && (
        <div className="rounded-xl border border-amber-400/40 bg-amber-400/5 p-3.5">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Ta réponse, en mieux</p>
          <p className="mb-1 text-xs italic text-faint line-through">{report.meilleureReponse.avant}</p>
          <p className="text-sm text-cream">{report.meilleureReponse.apres}</p>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Vérifier le typecheck + build**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add app/components/DrillReportCard.tsx
git commit -m "feat(entrainement): composant carte de mini-rapport"
```

---

### Task 8: Écran d'entraînement (`/entrainement`) — choix du thème + run + rapport

**Files:**
- Create: `app/entrainement/page.tsx`

**Interfaces:**
- Consumes: `DRILL_THEMES` (Task 1), `MeetingRoom` (`app/components/meeting/MeetingRoom.tsx`), `DrillReportCard` (Task 7), `saveDrill` (Task 6), `drillTheme` (Task 1), types `ChatMessage`.
- Produces: la page `/entrainement` (nouveau parcours, indépendant de `app/page.tsx`).

**Pattern à suivre :** cette page reprend la mécanique de streaming de `app/page.tsx` (fonction `streamRecruiter`, états `history`/`streaming`/`currentAnswer`), en 3 différences :
1. Une phase `theme` en amont : grille de cartes `DRILL_THEMES` (mirror des pilules « Difficulté » de `app/page.tsx`), clic → démarre le drill.
2. L'appel `fetch("/api/interview", …)` inclut `theme: selectedTheme` dans le body ; le contexte est minimal (`{ poste: theme.label, cv: "" }` — on n'exige pas de CV pour un drill ; adapter `validateContext` n'est pas nécessaire côté `/api/interview` car il valide déjà `context`, or `poste` est rempli).
3. **Cap des questions** : compter les messages `role === "recruiter"` dans `history` ; à `>= DRILL_QUESTIONS` (4) après une réponse candidat, ne pas renvoyer au modèle mais déclencher le rapport (`POST /api/drill-report` avec `{ theme, transcript: history }`), puis afficher `DrillReportCard` et appeler `saveDrill(theme, report)`.

**Détails d'implémentation :**
- États : `phase: "theme" | "chat" | "report"`, `selectedTheme: DrillThemeId | null`, `history`, `streaming`, `currentAnswer`, `report: DrillReport | null`, `reportError`.
- Réutiliser `MeetingRoom` en lui passant les mêmes props que `app/page.tsx` (`history`, `streaming`, `currentAnswer`, `setCurrentAnswer`, `sendAnswer`, `finishInterview`, `errorMsg`, `jury={false}`). Ici `finishInterview` = « terminer le drill maintenant » → déclenche le rapport. `sendAnswer` = version locale : ajoute la réponse candidat, puis si le cap n'est pas atteint appelle `streamDrill(next)`, sinon déclenche le rapport.
- `streamDrill(nextHistory)` = copie de `streamRecruiter` de `app/page.tsx` (mêmes lignes) avec `body: JSON.stringify({ context, history: nextHistory, theme: selectedTheme })`.
- Générer le rapport : `const res = await fetch("/api/drill-report", { method:"POST", headers, body: JSON.stringify({ theme: selectedTheme, transcript: history }) })` → `data.report` → `setReport` + `setPhase("report")` + `void saveDrill(selectedTheme, data.report)`. Sur erreur/`data.raw` → message d'erreur lisible + bouton réessayer.
- Bouton « Refaire ce thème » et « Choisir un autre thème » en phase report.

- [ ] **Step 1: Lire la doc Next avant de créer une route/page**

Consulter `node_modules/next/dist/docs/` (routing App Router) — cette version peut différer de la connaissance par défaut. Vérifier la convention `app/<segment>/page.tsx`.

- [ ] **Step 2: Écrire `app/entrainement/page.tsx`**

Implémenter selon le pattern ci-dessus (mirror de `app/page.tsx` phases form/chat + `DrillReportCard`). Réutiliser `Card`, `Button`, la grille de pilules pour les thèmes.

- [ ] **Step 3: Vérifier build + typecheck**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 4: Vérif navigateur manuelle (voix ET texte)**

Lancer l'app (`npm run dev`), aller sur `/entrainement`, choisir un thème, faire un drill au clavier puis un autre à la voix, vérifier : cap à 4 questions, mini-rapport affiché, `avant`/`apres` cohérents. (Vérif à la charge de l'exécutant, à noter dans le commit.)

- [ ] **Step 5: Commit**

```bash
git add app/entrainement/page.tsx
git commit -m "feat(entrainement): écran /entrainement (choix thème + drill + mini-rapport)"
```

---

### Task 9: Maîtrise par thème sur « Ma progression »

**Files:**
- Modify: `app/progression/page.tsx` (ajouter une Card « Maîtrise par thème » ; ne PAS toucher au reste)

**Interfaces:**
- Consumes: `loadDrillRows` (Task 6), `masteryByTheme` (Task 5), `scoreColor`/`BAND_HEX` (déjà importés), `Card`.

- [ ] **Step 1: Charger les drills**

Dans le `useEffect` existant (après le `select` des sessions), ajouter :
```ts
const rows = await loadDrillRows();
setDrillRows(rows);
```
avec un état `const [drillRows, setDrillRows] = useState<DrillRow[]>([])` et les imports `loadDrillRows` + `masteryByTheme` + type `DrillRow`.

- [ ] **Step 2: Afficher la section maîtrise**

Avant la liste des sessions, insérer une `Card` (rendue seulement si `masteryByTheme(drillRows).length > 0`) : une barre par thème entamé, `label` à gauche, barre de largeur `mastery%` colorée via `BAND_HEX[scoreColor(mastery)]`, `mastery` + `count` à droite. Structure :
```tsx
{masteryByTheme(drillRows).length > 0 && (
  <Card className="mb-6">
    <h2 className="mb-3 font-heading font-bold text-cream">Maîtrise par thème</h2>
    <div className="flex flex-col gap-2.5">
      {masteryByTheme(drillRows).map((m) => (
        <div key={m.theme} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate text-sm text-muted">{m.label}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream/10">
            <div className="h-full rounded-full" style={{ width: `${m.mastery}%`, background: BAND_HEX[scoreColor(m.mastery)] }} />
          </div>
          <span className="w-14 shrink-0 text-right text-xs font-semibold text-cream">{m.mastery}%</span>
        </div>
      ))}
    </div>
  </Card>
)}
```

- [ ] **Step 3: Vérifier que la courbe d'entretien reste inchangée**

Les drills vivent dans la table `drills`, PAS dans `sessions` → la courbe et la liste d'entretiens ne sont pas affectées (rien à filtrer). Vérifier visuellement que la page progression affiche entretiens + maîtrise sans mélange.

Run: `npx tsc --noEmit` puis vérif navigateur (compte connecté avec ≥1 drill).

- [ ] **Step 4: Commit**

```bash
git add app/progression/page.tsx
git commit -m "feat(entrainement): section maîtrise par thème sur la progression"
```

---

### Task 10: Point d'entrée « Entraînement » + finition

**Files:**
- Modify: `app/components/Header.tsx` (ou l'endroit du menu/nav existant) — ajouter un lien vers `/entrainement`
- Modify: `app/page.tsx` (optionnel : un bouton « ou entraîne-toi sur un thème → /entrainement » sous le CTA)

**Interfaces:** aucune nouvelle interface ; navigation uniquement.

- [ ] **Step 1: Repérer la nav existante**

Lire `app/components/Header.tsx` pour voir comment « Ma progression » est liée, et mirror pour « Entraînement ».

- [ ] **Step 2: Ajouter le lien**

Ajouter un lien `Entraînement` → `/entrainement` à côté de « Ma progression ».

- [ ] **Step 3: Vérif finale**

Run: `npx vitest run` (tous les tests) + `npx tsc --noEmit` + `npm run build`.
Expected: tests PASS, typecheck clean, build OK.

- [ ] **Step 4: Commit**

```bash
git add app/components/Header.tsx app/page.tsx
git commit -m "feat(entrainement): point d'entrée Entraînement dans la navigation"
```

---

## Self-Review (fait par l'auteur du plan)

**Couverture spec :**
- §2 parcours (thème → 3-5 questions → rapport → maîtrise) → Tasks 8, 3, 9. ✅
- §4 thèmes (7, négo incluse) → Task 1. ✅
- §5 réutilisation (MeetingRoom, askModelStream, débrief pattern) → Tasks 4, 8. ✅
- §6 mini-rapport format → Task 3. ✅
- §7 progression/maîtrise + sans-compte → Tasks 5, 6, 9 (storage = table `drills` dédiée, décision de planning). ✅
- §8 voix/texte au choix → réutilisation MeetingRoom (Task 8), gratuit. ✅
- §9 non-régression (entretien inchangé, drills hors courbe) → séparation par table (Task 6/9). ✅
- §10 tests → Tasks 1,2,3,5 (logique pure testée). ✅

**Décision actée au planning (laissée ouverte en §7) :** table `drills` dédiée (pas de marqueur dans `sessions`) — évite de casser le rendu débrief de la page progression et garde des types honnêtes.

**Cohérence des types :** `DrillReport` (Task 3) consommé identiquement par parseur (3), `saveDrill` (6), `DrillReportCard` (7). `DrillRow` défini en Task 5, réutilisé en Task 6/9. `DrillThemeId` (Task 1) partout. OK.

**Placeholders :** les Tasks logiques (1,2,3,5) ont du code complet. Les Tasks UI (7,8,9,10) donnent structure + JSX concret + composant/pattern de référence exact à mirror (`Debrief.tsx`, `app/page.tsx`, pilules Difficulté) — volontaire : reproduire tout le JSX d'une app entière verbatim n'apporte rien, l'exécutant a le code de référence cité.
