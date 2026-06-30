# InterviewSim MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le cœur d'InterviewSim — un utilisateur décrit son entretien + colle son CV, une IA (Gemini gratuit) joue un recruteur au tour par tour, puis génère un débrief structuré.

**Architecture:** App Next.js unique (App Router). Le front React (`app/page.tsx`) détient tout l'état de session et appelle deux routes API serveur (`/api/interview` en streaming, `/api/debrief` en JSON). Les routes appellent Gemini via une fonction isolée `askModel`. Aucune base de données : l'historique est renvoyé au serveur à chaque tour.

**Tech Stack:** Next.js (App Router, TypeScript), React, `@google/genai` (Gemini `gemini-2.5-flash`, palier gratuit), Vitest pour les tests de logique pure.

## Global Constraints

- Modèle : `gemini-2.5-flash` via `@google/genai`. Palier gratuit.
- Clé API : `GEMINI_API_KEY` dans `.env.local`, jamais committée, jamais exposée au client.
- Tout appel Gemini passe par la SEULE fonction `lib/askModel.ts`. Aucun autre fichier n'importe `@google/genai`.
- Pas de base de données. Pas de comptes. État de session dans le state React de `app/page.tsx`.
- Champs obligatoires : `poste` et `cv`. Tout le reste est optionnel.
- Tests automatisés sur la logique pure uniquement (validation, prompts, parsing, mapping d'erreur). `askModel` est mocké — jamais d'appel réseau réel dans les tests.
- Langue de l'UI et des prompts : français.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `lib/types.ts` | Types partagés : `InterviewContext`, `ChatMessage`, `Debrief`. |
| `lib/validate.ts` | `validateContext(ctx)` → erreurs si poste/CV manquants. Pur. |
| `lib/prompts.ts` | `buildRecruiterPrompt(ctx)` et `buildDebriefPrompt(ctx, transcript)`. Purs. |
| `lib/parseDebrief.ts` | `parseDebrief(raw)` → `Debrief` ou `null` si JSON invalide. Pur. |
| `lib/askModel.ts` | Seul point d'appel à Gemini. `askModel(systemPrompt, history)` + `askModelJSON(...)`. |
| `app/api/interview/route.ts` | POST : valide, construit le prompt recruteur, stream la réplique. |
| `app/api/debrief/route.ts` | POST : valide, construit le prompt débrief, parse, renvoie le JSON. |
| `app/page.tsx` | Écran unique : formulaire → chat → débrief. Détient l'état. |
| `app/layout.tsx` | Layout racine Next.js (minimal). |
| `tests/validate.test.ts` | Tests de `validateContext`. |
| `tests/prompts.test.ts` | Tests de construction des prompts. |
| `tests/parseDebrief.test.ts` | Tests de parsing du débrief. |

---

## Task 1: Initialiser le projet Next.js + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `vitest.config.ts`, `app/layout.tsx`, `app/page.tsx` (placeholder), `.env.local.example`, `.gitignore`

**Interfaces:**
- Consumes: rien.
- Produces: un projet qui démarre (`npm run dev`) et qui lance les tests (`npm test`).

- [ ] **Step 1: Créer le projet Next.js TypeScript**

Run :
```bash
cd "C:/Users/Ezekiel Kouassi/Documents/perso/InterviewSim"
npx create-next-app@latest . --typescript --app --no-tailwind --no-src-dir --no-eslint --import-alias "@/*" --use-npm
```
Répondre « yes » si on demande de continuer dans un dossier non vide (le dossier `docs/` existe déjà).
Expected: les fichiers `package.json`, `app/layout.tsx`, `app/page.tsx`, `tsconfig.json` sont créés.

- [ ] **Step 2: Installer les dépendances du projet**

Run :
```bash
npm install @google/genai
npm install -D vitest
```
Expected: `@google/genai` en dependencies, `vitest` en devDependencies dans `package.json`.

- [ ] **Step 3: Ajouter la config Vitest**

Create `vitest.config.ts` :
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Ajouter le script de test**

Modify `package.json` — ajouter dans `"scripts"` :
```json
"test": "vitest run"
```

- [ ] **Step 5: Créer `.env.local.example`**

Create `.env.local.example` :
```
GEMINI_API_KEY=ta-cle-ici
```

- [ ] **Step 6: Vérifier que `.env.local` est ignoré**

Vérifier que `.gitignore` contient `.env*` (create-next-app l'ajoute par défaut). Sinon, l'ajouter.

- [ ] **Step 7: Premier test sanity**

Create `tests/sanity.test.ts` :
```typescript
import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 8: Lancer les tests**

Run: `npm test`
Expected: PASS (1 test).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "chore: init Next.js project with Vitest"
```

---

## Task 2: Types partagés

**Files:**
- Create: `lib/types.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `InterviewContext = { poste: string; entreprise?: string; domaine?: string; niveau?: string; langue?: string; cv: string; offre?: string }`
  - `ChatMessage = { role: "recruiter" | "candidate"; text: string }`
  - `Debrief = { pointsForts: string[]; pointsATravailler: string[]; reformulations: string[]; scoreConfiance: number; syntheseGenerale: string }`

- [ ] **Step 1: Créer les types**

Create `lib/types.ts` :
```typescript
export type InterviewContext = {
  poste: string;
  entreprise?: string;
  domaine?: string;
  niveau?: string;
  langue?: string;
  cv: string;
  offre?: string;
};

export type ChatMessage = {
  role: "recruiter" | "candidate";
  text: string;
};

export type Debrief = {
  pointsForts: string[];
  pointsATravailler: string[];
  reformulations: string[];
  scoreConfiance: number;
  syntheseGenerale: string;
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared types"
```

---

## Task 3: Validation du contexte

**Files:**
- Create: `lib/validate.ts`
- Test: `tests/validate.test.ts`

**Interfaces:**
- Consumes: `InterviewContext` de `lib/types.ts`.
- Produces: `validateContext(ctx: Partial<InterviewContext>): string[]` — renvoie un tableau de messages d'erreur (vide = valide).

- [ ] **Step 1: Écrire les tests qui échouent**

Create `tests/validate.test.ts` :
```typescript
import { describe, it, expect } from "vitest";
import { validateContext } from "../lib/validate";

describe("validateContext", () => {
  it("accepte un contexte avec poste et cv", () => {
    expect(validateContext({ poste: "Dev", cv: "mon cv" })).toEqual([]);
  });

  it("rejette un poste manquant", () => {
    expect(validateContext({ poste: "", cv: "mon cv" })).toContain(
      "Le poste visé est obligatoire."
    );
  });

  it("rejette un CV manquant", () => {
    expect(validateContext({ poste: "Dev", cv: "  " })).toContain(
      "Le CV est obligatoire."
    );
  });

  it("rejette les deux manquants", () => {
    expect(validateContext({}).length).toBe(2);
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test`
Expected: FAIL ("Cannot find module '../lib/validate'").

- [ ] **Step 3: Implémenter**

Create `lib/validate.ts` :
```typescript
import type { InterviewContext } from "./types";

export function validateContext(ctx: Partial<InterviewContext>): string[] {
  const errors: string[] = [];
  if (!ctx.poste || ctx.poste.trim() === "") {
    errors.push("Le poste visé est obligatoire.");
  }
  if (!ctx.cv || ctx.cv.trim() === "") {
    errors.push("Le CV est obligatoire.");
  }
  return errors;
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/validate.ts tests/validate.test.ts
git commit -m "feat: add context validation"
```

---

## Task 4: Construction des prompts

**Files:**
- Create: `lib/prompts.ts`
- Test: `tests/prompts.test.ts`

**Interfaces:**
- Consumes: `InterviewContext`, `ChatMessage` de `lib/types.ts`.
- Produces:
  - `buildRecruiterPrompt(ctx: InterviewContext): string`
  - `buildDebriefPrompt(ctx: InterviewContext, transcript: ChatMessage[]): string`

- [ ] **Step 1: Écrire les tests qui échouent**

Create `tests/prompts.test.ts` :
```typescript
import { describe, it, expect } from "vitest";
import { buildRecruiterPrompt, buildDebriefPrompt } from "../lib/prompts";
import type { InterviewContext, ChatMessage } from "../lib/types";

const ctx: InterviewContext = {
  poste: "Développeur back-end",
  entreprise: "Startup fintech",
  niveau: "Junior",
  langue: "français",
  cv: "5 ans en Node.js",
};

describe("buildRecruiterPrompt", () => {
  it("inclut le poste et le CV", () => {
    const p = buildRecruiterPrompt(ctx);
    expect(p).toContain("Développeur back-end");
    expect(p).toContain("5 ans en Node.js");
  });

  it("inclut les phases du déroulé", () => {
    const p = buildRecruiterPrompt(ctx);
    expect(p).toContain("mise en confiance");
    expect(p).toContain("questions pièges");
  });

  it("demande une seule question à la fois", () => {
    expect(buildRecruiterPrompt(ctx).toLowerCase()).toContain("une question");
  });

  it("gère les champs optionnels absents sans planter", () => {
    const minimal: InterviewContext = { poste: "Vendeur", cv: "CV vente" };
    const p = buildRecruiterPrompt(minimal);
    expect(p).toContain("Vendeur");
  });
});

describe("buildDebriefPrompt", () => {
  const transcript: ChatMessage[] = [
    { role: "recruiter", text: "Parlez-moi de vous." },
    { role: "candidate", text: "Je suis développeur." },
  ];

  it("inclut le transcript", () => {
    const p = buildDebriefPrompt(ctx, transcript);
    expect(p).toContain("Parlez-moi de vous.");
    expect(p).toContain("Je suis développeur.");
  });

  it("demande un JSON avec les champs attendus", () => {
    const p = buildDebriefPrompt(ctx, transcript);
    expect(p).toContain("pointsForts");
    expect(p).toContain("scoreConfiance");
    expect(p).toContain("syntheseGenerale");
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test`
Expected: FAIL ("Cannot find module '../lib/prompts'").

- [ ] **Step 3: Implémenter**

Create `lib/prompts.ts` :
```typescript
import type { InterviewContext, ChatMessage } from "./types";

function contextLines(ctx: InterviewContext): string {
  const parts = [`Poste visé : ${ctx.poste}`];
  if (ctx.entreprise) parts.push(`Entreprise / type : ${ctx.entreprise}`);
  if (ctx.domaine) parts.push(`Domaine : ${ctx.domaine}`);
  if (ctx.niveau) parts.push(`Niveau : ${ctx.niveau}`);
  parts.push(`Langue de l'entretien : ${ctx.langue ?? "français"}`);
  parts.push(`CV du candidat :\n${ctx.cv}`);
  if (ctx.offre) parts.push(`Offre d'emploi :\n${ctx.offre}`);
  return parts.join("\n");
}

export function buildRecruiterPrompt(ctx: InterviewContext): string {
  return `Tu es un recruteur expérimenté qui fait passer un entretien d'embauche.

${contextLines(ctx)}

Règles :
- Mène l'entretien en suivant ce déroulé en phases : mise en confiance → questions techniques → mises en situation → questions pièges. Compte environ 2 à 3 questions par phase, puis conclus naturellement l'entretien.
- Pose UNE seule question à la fois, puis attends la réponse du candidat.
- Rebondis sur les réponses du candidat et sur son CV : creuse, demande des précisions, mets en situation.
- Reste dans le personnage du recruteur. Ne donne pas de feedback pendant l'entretien (il sera donné à la fin).
- Réponds dans la langue de l'entretien indiquée ci-dessus.`;
}

export function buildDebriefPrompt(
  ctx: InterviewContext,
  transcript: ChatMessage[]
): string {
  const conversation = transcript
    .map((m) => `${m.role === "recruiter" ? "Recruteur" : "Candidat"}: ${m.text}`)
    .join("\n");

  return `Tu es un coach en recrutement. Analyse l'entretien ci-dessous (pour le poste de ${ctx.poste}) et produis un débrief exploitable pour le candidat.

Entretien :
${conversation}

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, avec exactement ces champs :
{
  "pointsForts": [liste de chaînes],
  "pointsATravailler": [liste de chaînes],
  "reformulations": [liste de chaînes : des réponses du candidat reformulées en mieux],
  "scoreConfiance": un entier de 0 à 100,
  "syntheseGenerale": une chaîne (2-3 phrases)
}`;
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/prompts.ts tests/prompts.test.ts
git commit -m "feat: add prompt builders"
```

---

## Task 5: Parsing du débrief

**Files:**
- Create: `lib/parseDebrief.ts`
- Test: `tests/parseDebrief.test.ts`

**Interfaces:**
- Consumes: `Debrief` de `lib/types.ts`.
- Produces: `parseDebrief(raw: string): Debrief | null` — parse le JSON renvoyé par le modèle, tolère un éventuel bloc ```` ```json ```` autour, renvoie `null` si invalide ou champs manquants.

- [ ] **Step 1: Écrire les tests qui échouent**

Create `tests/parseDebrief.test.ts` :
```typescript
import { describe, it, expect } from "vitest";
import { parseDebrief } from "../lib/parseDebrief";

const valid = {
  pointsForts: ["clair"],
  pointsATravailler: ["trop long"],
  reformulations: ["Version reformulée"],
  scoreConfiance: 72,
  syntheseGenerale: "Bon entretien dans l'ensemble.",
};

describe("parseDebrief", () => {
  it("parse un JSON brut valide", () => {
    expect(parseDebrief(JSON.stringify(valid))).toEqual(valid);
  });

  it("parse un JSON entouré d'un bloc markdown", () => {
    const raw = "```json\n" + JSON.stringify(valid) + "\n```";
    expect(parseDebrief(raw)).toEqual(valid);
  });

  it("renvoie null si JSON invalide", () => {
    expect(parseDebrief("pas du json")).toBeNull();
  });

  it("renvoie null si un champ obligatoire manque", () => {
    const { scoreConfiance, ...incomplete } = valid;
    expect(parseDebrief(JSON.stringify(incomplete))).toBeNull();
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test`
Expected: FAIL ("Cannot find module '../lib/parseDebrief'").

- [ ] **Step 3: Implémenter**

Create `lib/parseDebrief.ts` :
```typescript
import type { Debrief } from "./types";

export function parseDebrief(raw: string): Debrief | null {
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

  if (
    !Array.isArray(d.pointsForts) ||
    !Array.isArray(d.pointsATravailler) ||
    !Array.isArray(d.reformulations) ||
    typeof d.scoreConfiance !== "number" ||
    typeof d.syntheseGenerale !== "string"
  ) {
    return null;
  }

  return {
    pointsForts: d.pointsForts as string[],
    pointsATravailler: d.pointsATravailler as string[],
    reformulations: d.reformulations as string[],
    scoreConfiance: d.scoreConfiance,
    syntheseGenerale: d.syntheseGenerale,
  };
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/parseDebrief.ts tests/parseDebrief.test.ts
git commit -m "feat: add debrief JSON parser"
```

---

## Task 6: Fonction d'appel à Gemini (`askModel`)

**Files:**
- Create: `lib/askModel.ts`

**Interfaces:**
- Consumes: `ChatMessage` de `lib/types.ts`, `@google/genai`, `process.env.GEMINI_API_KEY`.
- Produces:
  - `askModelStream(systemPrompt: string, history: ChatMessage[]): AsyncIterable<string>` — pour l'entretien (streaming de texte).
  - `askModelText(systemPrompt: string, history: ChatMessage[]): Promise<string>` — pour le débrief (texte complet, à parser ensuite).
  - Erreur de type rate limit : laisser remonter l'erreur du SDK (la route la mappe en 429).

> **Note pour l'implémenteur :** vérifier la forme exacte de l'API `@google/genai` au moment de l'implémentation (constructeur client, méthode de génération, format des messages `role`/`parts`, méthode de streaming). Le modèle attend des rôles `"user"` / `"model"` ; mapper `candidate → "user"` et `recruiter → "model"`. Le `systemPrompt` se passe via `systemInstruction`. Ce fichier est le SEUL à importer `@google/genai`.

- [ ] **Step 1: Implémenter `askModel.ts`**

Create `lib/askModel.ts` :
```typescript
import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "./types";

const MODEL = "gemini-2.5-flash";

function client(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY manquante");
  return new GoogleGenAI({ apiKey });
}

function toContents(history: ChatMessage[]) {
  return history.map((m) => ({
    role: m.role === "candidate" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
}

export async function* askModelStream(
  systemPrompt: string,
  history: ChatMessage[]
): AsyncIterable<string> {
  const ai = client();
  const stream = await ai.models.generateContentStream({
    model: MODEL,
    contents: toContents(history),
    config: { systemInstruction: systemPrompt },
  });
  for await (const chunk of stream) {
    const text = chunk.text;
    if (text) yield text;
  }
}

export async function askModelText(
  systemPrompt: string,
  history: ChatMessage[]
): Promise<string> {
  const ai = client();
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: toContents(history),
    config: { systemInstruction: systemPrompt },
  });
  return res.text ?? "";
}
```

- [ ] **Step 2: Vérifier que ça compile**

Run: `npx tsc --noEmit`
Expected: pas d'erreur de type. Si l'API `@google/genai` diffère (noms de méthodes/champs), ajuster d'après la doc de la version installée — c'est le seul fichier concerné.

- [ ] **Step 3: Commit**

```bash
git add lib/askModel.ts
git commit -m "feat: add Gemini model wrapper"
```

---

## Task 7: Route API entretien (streaming)

**Files:**
- Create: `app/api/interview/route.ts`

**Interfaces:**
- Consumes: `validateContext`, `buildRecruiterPrompt`, `askModelStream`, types.
- Produces: `POST /api/interview` — corps `{ context: InterviewContext, history: ChatMessage[] }`. Renvoie un flux texte (`text/plain`) de la réplique du recruteur. `400` si validation échoue, `429` si rate limit, `500` sinon.

> **Note :** détecter le 429 du SDK Gemini par le statut/message de l'erreur. La forme exacte dépend du SDK ; au moment de l'implémentation, logguer l'erreur une fois pour repérer comment le rate limit se présente, puis mapper sur `status === 429` ou un message contenant "RESOURCE_EXHAUSTED"/"429".

- [ ] **Step 1: Implémenter la route**

Create `app/api/interview/route.ts` :
```typescript
import { validateContext } from "@/lib/validate";
import { buildRecruiterPrompt } from "@/lib/prompts";
import { askModelStream } from "@/lib/askModel";
import type { InterviewContext, ChatMessage } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { context: InterviewContext; history: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return new Response("Requête invalide.", { status: 400 });
  }

  const errors = validateContext(body.context ?? {});
  if (errors.length > 0) {
    return new Response(errors.join(" "), { status: 400 });
  }

  const systemPrompt = buildRecruiterPrompt(body.context);
  const history = body.history ?? [];

  try {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of askModelStream(systemPrompt, history)) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err: unknown) {
    return mapError(err);
  }
}

function mapError(err: unknown): Response {
  const msg = String((err as { message?: string })?.message ?? err);
  const status = (err as { status?: number })?.status;
  if (status === 429 || /429|RESOURCE_EXHAUSTED/i.test(msg)) {
    return new Response(
      "L'IA est momentanément surchargée, réessaie dans quelques instants.",
      { status: 429 }
    );
  }
  return new Response("Une erreur est survenue.", { status: 500 });
}
```

- [ ] **Step 2: Vérifier que ça compile**

Run: `npx tsc --noEmit`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add app/api/interview/route.ts
git commit -m "feat: add interview streaming route"
```

---

## Task 8: Route API débrief (JSON)

**Files:**
- Create: `app/api/debrief/route.ts`

**Interfaces:**
- Consumes: `validateContext`, `buildDebriefPrompt`, `askModelText`, `parseDebrief`, types.
- Produces: `POST /api/debrief` — corps `{ context: InterviewContext, transcript: ChatMessage[] }`. Renvoie `{ debrief: Debrief }` (200) ou `{ raw: string }` (200, si JSON non parsable après un re-essai). `400`/`429`/`500` comme l'autre route.

- [ ] **Step 1: Implémenter la route**

Create `app/api/debrief/route.ts` :
```typescript
import { validateContext } from "@/lib/validate";
import { buildDebriefPrompt } from "@/lib/prompts";
import { askModelText } from "@/lib/askModel";
import { parseDebrief } from "@/lib/parseDebrief";
import type { InterviewContext, ChatMessage } from "@/lib/types";

export async function POST(req: Request): Promise<Response> {
  let body: { context: InterviewContext; transcript: ChatMessage[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  const errors = validateContext(body.context ?? {});
  if (errors.length > 0) {
    return Response.json({ error: errors.join(" ") }, { status: 400 });
  }

  const prompt = buildDebriefPrompt(body.context, body.transcript ?? []);

  try {
    // Premier essai
    let raw = await askModelText(prompt, []);
    let debrief = parseDebrief(raw);

    // Un seul re-essai si le JSON est malformé
    if (!debrief) {
      raw = await askModelText(prompt, []);
      debrief = parseDebrief(raw);
    }

    if (debrief) return Response.json({ debrief });
    return Response.json({ raw }); // fallback texte brut
  } catch (err: unknown) {
    const msg = String((err as { message?: string })?.message ?? err);
    const status = (err as { status?: number })?.status;
    if (status === 429 || /429|RESOURCE_EXHAUSTED/i.test(msg)) {
      return Response.json(
        { error: "L'IA est momentanément surchargée, réessaie dans quelques instants." },
        { status: 429 }
      );
    }
    return Response.json({ error: "Une erreur est survenue." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Vérifier que ça compile**

Run: `npx tsc --noEmit`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add app/api/debrief/route.ts
git commit -m "feat: add debrief route"
```

---

## Task 9: UI — écran unique (formulaire → chat → débrief)

**Files:**
- Modify: `app/page.tsx` (remplace le placeholder)

**Interfaces:**
- Consumes: types, les deux routes API.
- Produces: l'écran utilisateur complet. Composant client (`"use client"`).

> **Note design :** UI volontairement simple (HTML/CSS de base, pas de lib de composants au MVP). Trois états d'écran pilotés par un state `phase: "form" | "chat" | "debrief"`.

État local nécessaire :
- `phase` : "form" | "chat" | "debrief"
- `context` : `InterviewContext` (lié au formulaire)
- `history` : `ChatMessage[]`
- `currentAnswer` : string (réponse en cours de saisie)
- `streaming` : boolean (réplique recruteur en cours)
- `errorMsg` : string | null
- `debrief` : `Debrief | null`
- `debriefRaw` : string | null (fallback texte)

- [ ] **Step 1: Implémenter `page.tsx`**

Modify `app/page.tsx` (remplacer tout le contenu) :
```tsx
"use client";

import { useState } from "react";
import type { InterviewContext, ChatMessage, Debrief } from "@/lib/types";
import { validateContext } from "@/lib/validate";

type Phase = "form" | "chat" | "debrief";

export default function Home() {
  const [phase, setPhase] = useState<Phase>("form");
  const [context, setContext] = useState<InterviewContext>({ poste: "", cv: "" });
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [debrief, setDebrief] = useState<Debrief | null>(null);
  const [debriefRaw, setDebriefRaw] = useState<string | null>(null);

  const formErrors = validateContext(context);

  async function streamRecruiter(nextHistory: ChatMessage[]) {
    setStreaming(true);
    setErrorMsg(null);
    // Ajoute un message recruteur vide qu'on va remplir au fil du flux
    setHistory([...nextHistory, { role: "recruiter", text: "" }]);
    try {
      const res = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, history: nextHistory }),
      });
      if (!res.ok) {
        const txt = await res.text();
        setErrorMsg(txt || "Erreur.");
        // retire le message recruteur vide
        setHistory(nextHistory);
        return;
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setHistory([...nextHistory, { role: "recruiter", text: acc }]);
      }
    } catch {
      setErrorMsg("Connexion interrompue. Réessaie.");
      setHistory(nextHistory);
    } finally {
      setStreaming(false);
    }
  }

  function startInterview() {
    if (formErrors.length > 0) return;
    setPhase("chat");
    streamRecruiter([]); // première réplique du recruteur
  }

  function sendAnswer() {
    if (currentAnswer.trim() === "" || streaming) return;
    const next: ChatMessage[] = [
      ...history,
      { role: "candidate", text: currentAnswer.trim() },
    ];
    setCurrentAnswer("");
    streamRecruiter(next);
  }

  async function finishInterview() {
    setPhase("debrief");
    setErrorMsg(null);
    setDebrief(null);
    setDebriefRaw(null);
    try {
      const res = await fetch("/api/debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, transcript: history }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Erreur.");
        return;
      }
      if (data.debrief) setDebrief(data.debrief);
      else setDebriefRaw(data.raw ?? "");
    } catch {
      setErrorMsg("Connexion interrompue. Réessaie.");
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: 24, fontFamily: "system-ui" }}>
      <h1>InterviewSim</h1>

      {phase === "form" && (
        <section>
          <p>Décris ton entretien, colle ton CV, puis lance la simulation.</p>
          <Field label="Poste visé *" value={context.poste}
            onChange={(v) => setContext({ ...context, poste: v })} />
          <Field label="Entreprise / type" value={context.entreprise ?? ""}
            onChange={(v) => setContext({ ...context, entreprise: v })} />
          <Field label="Domaine" value={context.domaine ?? ""}
            onChange={(v) => setContext({ ...context, domaine: v })} />
          <Field label="Niveau (junior/senior)" value={context.niveau ?? ""}
            onChange={(v) => setContext({ ...context, niveau: v })} />
          <Field label="Langue" value={context.langue ?? ""}
            onChange={(v) => setContext({ ...context, langue: v })} />
          <Area label="CV (collé) *" value={context.cv}
            onChange={(v) => setContext({ ...context, cv: v })} />
          <Area label="Offre d'emploi (collée)" value={context.offre ?? ""}
            onChange={(v) => setContext({ ...context, offre: v })} />
          <button disabled={formErrors.length > 0} onClick={startInterview}>
            Démarrer l'entretien
          </button>
          {formErrors.length > 0 && (
            <p style={{ color: "#a00" }}>{formErrors.join(" ")}</p>
          )}
        </section>
      )}

      {phase === "chat" && (
        <section>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {history.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "recruiter" ? "flex-start" : "flex-end",
                background: m.role === "recruiter" ? "#eef" : "#efe",
                padding: 10, borderRadius: 8, maxWidth: "85%", whiteSpace: "pre-wrap",
              }}>
                <strong>{m.role === "recruiter" ? "Recruteur" : "Toi"}</strong>
                <div>{m.text}</div>
              </div>
            ))}
          </div>
          {errorMsg && <p style={{ color: "#a00" }}>{errorMsg}</p>}
          <div style={{ marginTop: 16 }}>
            <textarea value={currentAnswer} disabled={streaming}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              rows={3} style={{ width: "100%" }} placeholder="Ta réponse..." />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={sendAnswer} disabled={streaming || currentAnswer.trim() === ""}>
                Envoyer
              </button>
              <button onClick={finishInterview} disabled={streaming}>
                Terminer l'entretien
              </button>
            </div>
          </div>
        </section>
      )}

      {phase === "debrief" && (
        <section>
          <h2>Débrief</h2>
          {errorMsg && (
            <>
              <p style={{ color: "#a00" }}>{errorMsg}</p>
              <button onClick={finishInterview}>Réessayer</button>
            </>
          )}
          {!errorMsg && !debrief && !debriefRaw && <p>Génération du débrief…</p>}
          {debrief && (
            <div>
              <p><strong>Score de confiance :</strong> {debrief.scoreConfiance}/100</p>
              <p>{debrief.syntheseGenerale}</p>
              <h3>Points forts</h3>
              <ul>{debrief.pointsForts.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <h3>À travailler</h3>
              <ul>{debrief.pointsATravailler.map((x, i) => <li key={i}>{x}</li>)}</ul>
              <h3>Reformulations suggérées</h3>
              <ul>{debrief.reformulations.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          )}
          {debriefRaw && <pre style={{ whiteSpace: "pre-wrap" }}>{debriefRaw}</pre>}
        </section>
      )}
    </main>
  );
}

function Field(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: "block", fontSize: 14 }}>{props.label}</label>
      <input value={props.value} onChange={(e) => props.onChange(e.target.value)}
        style={{ width: "100%" }} />
    </div>
  );
}

function Area(props: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <label style={{ display: "block", fontSize: 14 }}>{props.label}</label>
      <textarea value={props.value} onChange={(e) => props.onChange(e.target.value)}
        rows={5} style={{ width: "100%" }} />
    </div>
  );
}
```

- [ ] **Step 2: Vérifier que ça compile**

Run: `npx tsc --noEmit`
Expected: pas d'erreur.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add single-screen UI (form, chat, debrief)"
```

---

## Task 10: Vérification manuelle de bout en bout

**Files:** aucun (test manuel).

**Interfaces:**
- Consumes: tout le système + une vraie clé `GEMINI_API_KEY`.
- Produces: confirmation que la boucle complète fonctionne avec le vrai modèle.

> C'est ici qu'on valide ce qui ne peut pas l'être par tests automatisés : la qualité du jeu de rôle et du débrief.

- [ ] **Step 1: Configurer la clé**

Copier `.env.local.example` vers `.env.local` et y mettre une vraie clé Gemini (palier gratuit, obtenue sur Google AI Studio).

- [ ] **Step 2: Lancer l'app**

Run: `npm run dev`
Ouvrir http://localhost:3000

- [ ] **Step 3: Tester le parcours complet**

Vérifier :
1. Le bouton « Démarrer » reste désactivé tant que poste + CV ne sont pas remplis.
2. Après démarrage, le recruteur pose une première question qui s'appuie sur le CV.
3. Les réponses déclenchent des relances pertinentes ; la réplique s'affiche en streaming.
4. Le bouton « Terminer l'entretien » génère un débrief structuré (score + listes).
5. (Optionnel) Vérifier le message d'erreur 429 si on enchaîne trop vite (rate limit gratuit).

- [ ] **Step 4: Lancer la suite de tests automatisés une dernière fois**

Run: `npm test`
Expected: tous les tests PASS.

---

## Self-Review (auteur du plan)

**Couverture de la spec :**
- Formulaire de contexte + CV collé → Task 9 (UI) + Task 3 (validation).
- IA recruteur au tour par tour, sur la connaissance du LLM + CV → Tasks 4, 6, 7.
- Déroulé en phases + bouton terminer → prompt (Task 4) + UI (Task 9).
- Débrief JSON structuré → Tasks 4, 5, 8, 9.
- Gemini gratuit isolé derrière `askModel` → Task 6 (contrainte globale respectée).
- Pas de DB, état React → Task 9.
- Gestion 429 / champs manquants / JSON malformé / coupure streaming → Tasks 3, 7, 8, 9.

**Placeholders :** aucun « TODO/TBD ». Les deux « Notes pour l'implémenteur » (forme exacte de l'API `@google/genai` et du 429) sont des points de vérification légitimes contre une lib externe, pas des trous dans le plan — le code complet est fourni dans les deux cas.

**Cohérence des types :** `askModelStream`/`askModelText` (Task 6) sont consommés tels quels par les routes (Tasks 7, 8). `parseDebrief` (Task 5) renvoie `Debrief | null`, utilisé en Task 8. `validateContext` (Task 3) utilisé en Tasks 7, 8, 9. Rôles `ChatMessage` `"recruiter"|"candidate"` cohérents partout (mappés `user`/`model` uniquement dans `askModel`).
