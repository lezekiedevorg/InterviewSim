# Score crédible — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le score « au doigt mouillé » par une grille de 5 critères pondérés, notés avec preuves obligatoires et ancrage « marché réel », le score global étant calculé par notre code.

**Architecture:** L'IA note 5 critères (avec citation-preuve chacun) dans un JSON v2 ; `lib/score.ts` applique les plafonds et calcule le score global pondéré ; l'API refuse de noter un entretien de moins de 3 réponses ; le débrief affiche le détail en mini-barres. Spec : `docs/superpowers/specs/2026-07-06-score-credible-design.md`.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind v3 (charte « Studio nuit »), Groq `llama-3.3-70b-versatile` via fetch, Vitest.

## Global Constraints

- Tout le texte visible utilisateur en **français**, tutoiement.
- Zéro dépendance npm ajoutée.
- Anciens débriefs en base SANS `criteres` : doivent continuer à s'afficher (champ optionnel, affichage conditionnel).
- Couleurs de bande : réutiliser `scoreColor`/`BAND_HEX` de `lib/scoreColor.ts` (rouge < 40, ambre < 70, vert ≥ 70).
- Style UI : jetons « Studio nuit » (`night-800`, `cream`, `muted`, `faint`, `amber-400`…), labels 11px uppercase tracking 0.14em.
- Branche de travail : `feat/score-credible` (déjà créée).
- Commandes : `npm test` (Vitest), `npm run build`.

---

### Task 1 : Types + moteur de calcul `lib/score.ts`

**Files:**
- Modify: `lib/types.ts` (ajouter `CritereId`, `CritereNote`, champ `criteres?` sur `Debrief`)
- Create: `lib/score.ts`
- Test: `tests/score.test.ts`

**Interfaces:**
- Consumes: `ChatMessage` de `lib/types.ts` (existant).
- Produces: `CRITERES: { id: CritereId; label: string; poids: number }[]`, `PLAFOND_SANS_PREUVE = 40`, `MIN_REPONSES = 3`, `capNote(note: number, preuve: string): number`, `computeScore(criteres: CritereNote[]): number`, `estTropCourt(transcript: ChatMessage[]): boolean`. Types `CritereId`, `CritereNote` exportés depuis `lib/types.ts`.

- [ ] **Step 1 : Ajouter les types dans `lib/types.ts`**

Après le type `ChatMessage`, ajouter :

```ts
export type CritereId = "structure" | "concret" | "adequation" | "communication" | "pression";

export type CritereNote = {
  id: CritereId;
  note: number; // 0-100, déjà bornée et plafonnée par lib/score.ts
  preuve: string; // citation exacte du candidat ("" si aucune)
  commentaire: string; // 1 phrase de justification
};
```

Et dans `Debrief`, ajouter le champ optionnel (compat anciens débriefs stockés) :

```ts
export type Debrief = {
  pointsForts: string[];
  pointsATravailler: string[];
  reformulations: string[];
  scoreConfiance: number;
  syntheseGenerale: string;
  criteres?: CritereNote[]; // absent sur les débriefs enregistrés avant la grille
};
```

- [ ] **Step 2 : Écrire les tests qui échouent — `tests/score.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  CRITERES,
  PLAFOND_SANS_PREUVE,
  MIN_REPONSES,
  capNote,
  computeScore,
  estTropCourt,
} from "../lib/score";
import type { CritereNote } from "../lib/types";
import type { ChatMessage } from "../lib/types";

function criteresAvecNote(note: number): CritereNote[] {
  return CRITERES.map((c) => ({ id: c.id, note, preuve: "citation", commentaire: "ok" }));
}

describe("CRITERES", () => {
  it("contient exactement 5 critères dont les poids somment à 100", () => {
    expect(CRITERES).toHaveLength(5);
    expect(CRITERES.reduce((s, c) => s + c.poids, 0)).toBe(100);
  });
});

describe("capNote", () => {
  it("borne la note dans [0, 100] et arrondit", () => {
    expect(capNote(-5, "preuve")).toBe(0);
    expect(capNote(112, "preuve")).toBe(100);
    expect(capNote(63.6, "preuve")).toBe(64);
  });
  it("plafonne à 40 quand la preuve est vide ou blanche", () => {
    expect(capNote(90, "")).toBe(PLAFOND_SANS_PREUVE);
    expect(capNote(90, "   ")).toBe(PLAFOND_SANS_PREUVE);
    expect(capNote(30, "")).toBe(30); // sous le plafond : inchangé
  });
});

describe("computeScore", () => {
  it("fait la moyenne pondérée (toutes notes égales → cette note)", () => {
    expect(computeScore(criteresAvecNote(60))).toBe(60);
  });
  it("pondère selon les poids de la grille", () => {
    // structure 20×80, concret 25×40, adequation 20×60, communication 15×100, pression 20×50
    const criteres: CritereNote[] = [
      { id: "structure", note: 80, preuve: "p", commentaire: "" },
      { id: "concret", note: 40, preuve: "p", commentaire: "" },
      { id: "adequation", note: 60, preuve: "p", commentaire: "" },
      { id: "communication", note: 100, preuve: "p", commentaire: "" },
      { id: "pression", note: 50, preuve: "p", commentaire: "" },
    ];
    // (80*20 + 40*25 + 60*20 + 100*15 + 50*20) / 100 = (1600+1000+1200+1500+1000)/100 = 63
    expect(computeScore(criteres)).toBe(63);
  });
  it("compte 0 pour un critère absent de la liste", () => {
    const sansConcret = criteresAvecNote(100).filter((c) => c.id !== "concret");
    // 100 partout sauf concret (poids 25) à 0 → 75
    expect(computeScore(sansConcret)).toBe(75);
  });
});

describe("estTropCourt", () => {
  const r = (text: string): ChatMessage => ({ role: "recruiter", text });
  const c = (text: string): ChatMessage => ({ role: "candidate", text });

  it("vrai sous MIN_REPONSES réponses candidat non vides", () => {
    expect(MIN_REPONSES).toBe(3);
    expect(estTropCourt([r("Bonjour"), c("Bonjour"), r("Parcours ?"), c("Je suis dev.")])).toBe(true);
  });
  it("faux à partir de 3 réponses candidat", () => {
    expect(
      estTropCourt([r("q1"), c("r1"), r("q2"), c("r2"), r("q3"), c("r3")])
    ).toBe(false);
  });
  it("ignore les réponses candidat vides ou blanches", () => {
    expect(estTropCourt([c("r1"), c("   "), c("r2"), c("")])).toBe(true);
  });
});
```

- [ ] **Step 3 : Vérifier que les tests échouent**

Run : `npm test 2>&1 | tail -15`
Attendu : ÉCHEC — `tests/score.test.ts` ne résout pas `../lib/score`.

- [ ] **Step 4 : Implémenter `lib/score.ts`**

```ts
import type { ChatMessage, CritereId, CritereNote } from "./types";

// La grille de notation — source de vérité unique (prompt, calcul et affichage la consomment).
export const CRITERES: { id: CritereId; label: string; poids: number }[] = [
  { id: "structure", label: "Structure des réponses", poids: 20 },
  { id: "concret", label: "Concret & chiffres", poids: 25 },
  { id: "adequation", label: "Adéquation au poste", poids: 20 },
  { id: "communication", label: "Communication", poids: 15 },
  { id: "pression", label: "Réaction sous pression", poids: 20 },
];

// Anti-complaisance : une note sans citation-preuve ne peut pas dépasser ce plafond.
export const PLAFOND_SANS_PREUVE = 40;

// Sous ce nombre de réponses du candidat, l'entretien n'est pas notable.
export const MIN_REPONSES = 3;

// Borne la note dans [0, 100] et applique le plafond « pas de preuve ».
export function capNote(note: number, preuve: string): number {
  const bornee = Math.max(0, Math.min(100, Math.round(note)));
  return preuve.trim() === "" ? Math.min(bornee, PLAFOND_SANS_PREUVE) : bornee;
}

// Score global = moyenne pondérée des 5 critères. C'est NOTRE code qui calcule,
// jamais le modèle (il ne peut plus « offrir » un global incohérent avec son détail).
export function computeScore(criteres: CritereNote[]): number {
  let total = 0;
  for (const c of CRITERES) {
    const trouve = criteres.find((x) => x.id === c.id);
    total += (trouve ? trouve.note : 0) * c.poids;
  }
  return Math.round(total / 100);
}

// Moins de MIN_REPONSES réponses non vides du candidat → pas de note fiable possible.
export function estTropCourt(transcript: ChatMessage[]): boolean {
  const reponses = transcript.filter((m) => m.role === "candidate" && m.text.trim() !== "");
  return reponses.length < MIN_REPONSES;
}
```

- [ ] **Step 5 : Vérifier que les tests passent**

Run : `npm test 2>&1 | tail -5`
Attendu : PASS (tous les fichiers, y compris `score.test.ts`).

- [ ] **Step 6 : Commit**

```bash
git add lib/types.ts lib/score.ts tests/score.test.ts
git commit -m "feat(score): grille de 5 critères pondérés, plafond sans preuve, garde-fou entretien trop court"
```

---

### Task 2 : `parseDebrief` v2 (critères exigés, score calculé)

**Files:**
- Modify: `lib/parseDebrief.ts`
- Test: `tests/parseDebrief.test.ts` (réécrire les fixtures au format v2)

**Interfaces:**
- Consumes: `CRITERES`, `capNote`, `computeScore` de `lib/score.ts` (Task 1) ; types `Debrief`, `CritereNote` de `lib/types.ts`.
- Produces: `parseDebrief(raw: string): Debrief | null` — même signature qu'avant, mais exige désormais `criteres` (5 entrées aux ids exacts de la grille) dans le JSON du modèle, ignore tout `scoreConfiance` fourni par le modèle et le recalcule via `computeScore`.

- [ ] **Step 1 : Réécrire les tests — `tests/parseDebrief.test.ts`**

Remplacer tout le fichier par :

```ts
import { describe, it, expect } from "vitest";
import { parseDebrief } from "../lib/parseDebrief";
import { CRITERES, PLAFOND_SANS_PREUVE } from "../lib/score";

// Fixture v2 : les 5 critères notés 60 avec preuve → score global attendu 60.
const valid = {
  criteres: CRITERES.map((c) => ({
    id: c.id,
    note: 60,
    preuve: "J'ai livré le projet en trois semaines.",
    commentaire: "Réponse illustrée.",
  })),
  pointsForts: ["clair"],
  pointsATravailler: ["trop long"],
  reformulations: ["Version reformulée"],
  syntheseGenerale: "Bon entretien dans l'ensemble.",
};

describe("parseDebrief (JSON v2)", () => {
  it("parse un JSON valide et calcule le score global côté code", () => {
    const d = parseDebrief(JSON.stringify(valid));
    expect(d).not.toBeNull();
    expect(d!.scoreConfiance).toBe(60);
    expect(d!.criteres).toHaveLength(5);
    expect(d!.pointsForts).toEqual(["clair"]);
  });

  it("parse un JSON entouré d'un bloc markdown", () => {
    const raw = "```json\n" + JSON.stringify(valid) + "\n```";
    expect(parseDebrief(raw)).not.toBeNull();
  });

  it("ignore un scoreConfiance fourni par le modèle (recalcule)", () => {
    const triche = { ...valid, scoreConfiance: 99 };
    expect(parseDebrief(JSON.stringify(triche))!.scoreConfiance).toBe(60);
  });

  it("plafonne un critère sans preuve", () => {
    const sansPreuve = {
      ...valid,
      criteres: valid.criteres.map((c) =>
        c.id === "concret" ? { ...c, note: 90, preuve: "" } : c
      ),
    };
    const d = parseDebrief(JSON.stringify(sansPreuve))!;
    const concret = d.criteres!.find((c) => c.id === "concret")!;
    expect(concret.note).toBe(PLAFOND_SANS_PREUVE);
  });

  it("renvoie null si JSON invalide", () => {
    expect(parseDebrief("pas du json")).toBeNull();
  });

  it("renvoie null si un critère de la grille manque", () => {
    const incomplet = { ...valid, criteres: valid.criteres.slice(1) };
    expect(parseDebrief(JSON.stringify(incomplet))).toBeNull();
  });

  it("renvoie null si criteres est absent (ancien format)", () => {
    const { criteres, ...ancien } = valid;
    expect(parseDebrief(JSON.stringify({ ...ancien, scoreConfiance: 72 }))).toBeNull();
  });

  it("renvoie null si un champ texte obligatoire manque", () => {
    const { syntheseGenerale, ...incomplet } = valid;
    expect(parseDebrief(JSON.stringify(incomplet))).toBeNull();
  });
});
```

- [ ] **Step 2 : Vérifier que les tests échouent**

Run : `npm test 2>&1 | tail -15`
Attendu : ÉCHEC — l'implémentation actuelle accepte l'ancien format et exige `scoreConfiance`.

- [ ] **Step 3 : Réécrire `lib/parseDebrief.ts`**

```ts
import type { Debrief, CritereNote } from "./types";
import { CRITERES, capNote, computeScore } from "./score";

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
    typeof d.syntheseGenerale !== "string" ||
    !Array.isArray(d.criteres)
  ) {
    return null;
  }

  // Les 5 critères de la grille sont exigés ; note bornée + plafonnée par capNote.
  const bruts = d.criteres as Record<string, unknown>[];
  const criteres: CritereNote[] = [];
  for (const c of CRITERES) {
    const trouve = bruts.find((x) => x && typeof x === "object" && x.id === c.id);
    if (!trouve || typeof trouve.note !== "number") return null;
    const preuve = typeof trouve.preuve === "string" ? trouve.preuve : "";
    const commentaire = typeof trouve.commentaire === "string" ? trouve.commentaire : "";
    criteres.push({ id: c.id, note: capNote(trouve.note, preuve), preuve, commentaire });
  }

  return {
    pointsForts: d.pointsForts as string[],
    pointsATravailler: d.pointsATravailler as string[],
    reformulations: d.reformulations as string[],
    criteres,
    // Le score global vient de NOTRE calcul, jamais du modèle.
    scoreConfiance: computeScore(criteres),
    syntheseGenerale: d.syntheseGenerale,
  };
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

Run : `npm test 2>&1 | tail -5`
Attendu : PASS.

- [ ] **Step 5 : Commit**

```bash
git add lib/parseDebrief.ts tests/parseDebrief.test.ts
git commit -m "feat(score): parseDebrief v2 — critères exigés, plafonds appliqués, score global recalculé"
```

---

### Task 3 : Prompt de débrief v2 (barème, ancrage, preuves)

**Files:**
- Modify: `lib/prompts.ts` (fonction `buildDebriefPrompt` uniquement)
- Test: `tests/prompts.test.ts` (bloc `describe("buildDebriefPrompt")` uniquement)

**Interfaces:**
- Consumes: `CRITERES` de `lib/score.ts` (les libellés/ids du prompt viennent de la grille — DRY).
- Produces: `buildDebriefPrompt(ctx, transcript): string` — même signature ; le prompt exige le JSON v2 SANS `scoreConfiance`.

- [ ] **Step 1 : Mettre à jour les tests — bloc `buildDebriefPrompt` de `tests/prompts.test.ts`**

Remplacer le test `"demande un JSON avec les champs attendus"` par :

```ts
  it("demande le JSON v2 avec critères et preuves, sans score global", () => {
    const p = buildDebriefPrompt(ctx, transcript);
    expect(p).toContain('"criteres"');
    expect(p).toContain('"preuve"');
    expect(p).toContain("pointsForts");
    expect(p).toContain("syntheseGenerale");
    expect(p).not.toContain("scoreConfiance");
  });

  it("contient l'ancrage marché réel et les 5 critères de la grille", () => {
    const p = buildDebriefPrompt(ctx, transcript);
    expect(p).toContain("ne serait PAS retenu");
    for (const id of ["structure", "concret", "adequation", "communication", "pression"]) {
      expect(p).toContain(`"${id}"`);
    }
  });
```

(Garder le test `"inclut le transcript"` tel quel.)

- [ ] **Step 2 : Vérifier que les tests échouent**

Run : `npm test 2>&1 | tail -15`
Attendu : ÉCHEC — le prompt actuel contient `scoreConfiance` et pas `"criteres"`.

- [ ] **Step 3 : Réécrire `buildDebriefPrompt` dans `lib/prompts.ts`**

Ajouter l'import en tête de fichier :

```ts
import { CRITERES } from "./score";
```

Puis remplacer la fonction entière par :

```ts
export function buildDebriefPrompt(
  ctx: InterviewContext,
  transcript: ChatMessage[]
): string {
  const conversation = transcript
    .map((m) => `${m.role === "recruiter" ? "Recruteur" : "Candidat"}: ${m.text}`)
    .join("\n");

  // Barème par tranche pour chaque critère de la grille (ids alignés sur lib/score.ts).
  const baremes: Record<string, string> = {
    structure:
      "80+ = réponses organisées (situation → action → résultat) ; 50 = organisation partielle, des digressions ; 20 = décousu, coq-à-l'âne.",
    concret:
      "80+ = exemples réels précis avec chiffres ou résultats mesurables ; 50 = exemples vagues sans mesure ; 20 = généralités, aucune expérience citée.",
    adequation:
      "80+ = réponses collées au poste et à l'offre, vocabulaire du métier juste ; 50 = lien partiel avec le poste ; 20 = hors sujet, réponses passe-partout.",
    communication:
      "80+ = clair, concis, adapté à l'oral ; 50 = compréhensible mais confus ou trop long ; 20 = laconique, incompréhensible ou tunnel interminable.",
    pression:
      "80+ = garde son calme, répond avec précision aux relances et questions pièges ; 50 = se défend mais s'embrouille ; 20 = élude, se contredit ou s'effondre.",
  };
  const grille = CRITERES.map(
    (c) => `- "${c.id}" (${c.label}) : ${baremes[c.id]}`
  ).join("\n");

  return `Tu es un évaluateur de recrutement froid, factuel et exigeant. Tu notes l'entretien ci-dessous (poste : ${ctx.poste}) comme un VRAI processus de recrutement compétitif, pas comme un professeur bienveillant. La complaisance rend l'évaluation inutile pour le candidat.

ANCRAGE DU BARÈME (à respecter strictement) :
- 50 = candidat moyen qui ne serait PAS retenu.
- 70+ = candidat convaincant, embauche probable — exige des preuves solides.
- 85+ = exceptionnel, quasi jamais atteint en entraînement.
- Une réponse vague, générique ou sans exemple se note SOUS 50.

CRITÈRES — note chacun de 0 à 100 :
${grille}

RÈGLES DE PREUVE :
- Pour CHAQUE critère, cite dans "preuve" une phrase EXACTE du candidat (la plus représentative de ta note). Ne cite JAMAIS le recruteur.
- Aucune citation pertinente → mets "preuve": "" (la note sera plafonnée).
- N'attribue JAMAIS plus de 55 à un critère sans citation précise qui le justifie.
- Ne calcule AUCUN score global : il est calculé ailleurs à partir de tes 5 notes.

Entretien :
${conversation}

Réponds UNIQUEMENT par un objet JSON valide, sans texte autour, avec exactement ces champs :
{
  "criteres": [
    { "id": "structure", "note": entier 0-100, "preuve": "citation exacte du candidat", "commentaire": "1 phrase de justification" },
    { "id": "concret", "note": …, "preuve": …, "commentaire": … },
    { "id": "adequation", "note": …, "preuve": …, "commentaire": … },
    { "id": "communication", "note": …, "preuve": …, "commentaire": … },
    { "id": "pression", "note": …, "preuve": …, "commentaire": … }
  ],
  "pointsForts": [liste de chaînes],
  "pointsATravailler": [liste de chaînes],
  "reformulations": [liste de chaînes : des réponses du candidat reformulées en mieux],
  "syntheseGenerale": une chaîne (2-3 phrases, ton direct et honnête)
}`;
}
```

- [ ] **Step 4 : Vérifier que les tests passent**

Run : `npm test 2>&1 | tail -5`
Attendu : PASS.

- [ ] **Step 5 : Commit**

```bash
git add lib/prompts.ts tests/prompts.test.ts
git commit -m "feat(score): prompt de débrief v2 — barème par tranche, ancrage marché réel, preuves obligatoires"
```

---

### Task 4 : API — température 0 et garde-fou « trop court »

**Files:**
- Modify: `lib/askModel.ts` (paramètre `temperature` optionnel)
- Modify: `app/api/debrief/route.ts`

**Interfaces:**
- Consumes: `estTropCourt` de `lib/score.ts` (Task 1) ; `parseDebrief` v2 (Task 2) ; `buildDebriefPrompt` v2 (Task 3).
- Produces: `askModelText(systemPrompt, history, opts?: { temperature?: number })` ; la route `/api/debrief` répond `{ tooShort: true }` (HTTP 200) quand l'entretien est trop court, sans appeler le modèle.

- [ ] **Step 1 : Ajouter `temperature` à `lib/askModel.ts`**

Remplacer `post` et `askModelText` par (le reste du fichier ne change pas) :

```ts
async function post(
  systemPrompt: string,
  history: ChatMessage[],
  stream: boolean,
  temperature?: number
) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: toMessages(systemPrompt, history),
      stream,
      // Température imposée uniquement quand demandé (débrief : 0 → correcteur froid et régulier)
      ...(temperature !== undefined && { temperature }),
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq ${res.status}: ${await res.text()}`);
  }
  return res;
}
```

```ts
export async function askModelText(
  systemPrompt: string,
  history: ChatMessage[],
  opts?: { temperature?: number }
): Promise<string> {
  const res = await post(systemPrompt, history, false, opts?.temperature);
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}
```

(`askModelStream` appelle `post(systemPrompt, history, true)` sans température : inchangé.)

- [ ] **Step 2 : Brancher le garde-fou et la température dans `app/api/debrief/route.ts`**

Ajouter l'import :

```ts
import { estTropCourt } from "@/lib/score";
```

Après la validation du contexte (`if (errors.length > 0) …`), insérer :

```ts
  const transcript = body.transcript ?? [];

  // Entretien trop court pour être noté sérieusement : on ne consomme pas le modèle.
  if (estTropCourt(transcript)) {
    return Response.json({ tooShort: true });
  }
```

Puis utiliser `transcript` et la température 0 dans la suite (remplacer les lignes existantes) :

```ts
  const prompt = buildDebriefPrompt(body.context, transcript);
```

```ts
    let raw = await askModelText(prompt, seed, { temperature: 0 });
```

```ts
      raw = await askModelText(prompt, seed, { temperature: 0 });
```

- [ ] **Step 3 : Vérifier build + tests**

Run : `npm run build 2>&1 | tail -3 && npm test 2>&1 | tail -3`
Attendu : build OK, tests PASS.

- [ ] **Step 4 : Commit**

```bash
git add lib/askModel.ts app/api/debrief/route.ts
git commit -m "feat(score): température 0 sur le débrief + refus de noter un entretien de moins de 3 réponses"
```

---

### Task 5 : UI — carte « Détail de la note » + cas « trop court »

**Files:**
- Modify: `app/components/Debrief.tsx` (carte détail, insérée entre le bloc jauge/verdict et la grille points forts/à travailler)
- Modify: `app/page.tsx` (état `tooShort` + affichage dédié dans la phase débrief)

**Interfaces:**
- Consumes: `CRITERES` de `lib/score.ts` (libellés), `scoreColor`/`BAND_HEX` de `lib/scoreColor.ts`, champ `criteres?` du type `Debrief` ; réponse `{ tooShort: true }` de l'API (Task 4).
- Produces: rien de nouveau pour d'autres tâches (feuille de l'arbre).

- [ ] **Step 1 : Carte détail dans `app/components/Debrief.tsx`**

Ajouter les imports :

```ts
import { CRITERES } from "@/lib/score";
import { scoreColor, BAND_HEX } from "@/lib/scoreColor";
```

Insérer ce bloc juste APRÈS le `</div>` qui ferme le bloc jauge/verdict/synthèse et AVANT `<div className="grid w-full gap-3.5 sm:grid-cols-2">` :

```tsx
      {/* Détail de la note — présent uniquement sur les débriefs notés avec la grille */}
      {data.criteres && data.criteres.length > 0 && (
        <Card className="flex w-full flex-col gap-4">
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
            Détail de la note
          </span>
          {data.criteres.map((c) => {
            const label = CRITERES.find((x) => x.id === c.id)?.label ?? c.id;
            const hex = BAND_HEX[scoreColor(c.note)];
            return (
              <div key={c.id} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-cream">{label}</span>
                  <span className="font-heading text-[15px] font-extrabold" style={{ color: hex }}>
                    {c.note}
                    <span className="ml-0.5 text-[10px] font-medium text-faint">/100</span>
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-cream/10">
                  <div
                    className="h-full rounded-full transition-[width] duration-700"
                    style={{ width: `${c.note}%`, background: hex }}
                  />
                </div>
                {c.commentaire && (
                  <p className="text-[13px] leading-snug text-muted">{c.commentaire}</p>
                )}
                {c.preuve && (
                  <p className="border-l-2 border-cream/15 pl-2.5 text-xs italic leading-snug text-faint">
                    «&nbsp;{c.preuve}&nbsp;»
                  </p>
                )}
              </div>
            );
          })}
        </Card>
      )}
```

- [ ] **Step 2 : Cas « trop court » dans `app/page.tsx`**

Ajouter l'état à côté des autres `useState` :

```ts
  const [tooShort, setTooShort] = useState(false);
```

Dans `finishInterview()`, ajouter `setTooShort(false);` à côté des autres resets (`setSaveMsg(null);`), puis juste APRÈS `const data = await res.json();` et le bloc `if (!res.ok) …`, insérer :

```ts
      if (data.tooShort) {
        setTooShort(true);
        return;
      }
```

Dans le JSX de la phase débrief, remplacer la condition des points de chargement :

```tsx
          {!errorMsg && !tooShort && !debrief && !debriefRaw && (
```

et insérer AVANT ce bloc de chargement :

```tsx
          {tooShort && (
            <Card className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="max-w-sm text-sm leading-relaxed text-muted">
                Entretien trop court pour être évalué sérieusement — réponds à au moins
                3 questions, puis termine.
              </p>
              <Button onClick={() => window.location.reload()}>Nouvel entretien</Button>
            </Card>
          )}
```

- [ ] **Step 3 : Vérifier build + tests**

Run : `npm run build 2>&1 | tail -3 && npm test 2>&1 | tail -3`
Attendu : build OK, tests PASS.

- [ ] **Step 4 : Vérification visuelle dans le navigateur**

Avec `npm run dev` lancé :
1. Faire un entretien d'UNE seule réponse, cliquer « Terminer » → message « Entretien trop court… » + bouton « Nouvel entretien ». Rien dans « Ma progression ».
2. Faire un entretien de 3+ réponses (réponses volontairement vagues) → le débrief affiche la jauge, PUIS la carte « Détail de la note » avec 5 barres colorées, notes, commentaires et citations. Le score doit être bas (réponses vagues → sous 50).
3. Vérifier qu'un ancien entretien dans « Ma progression » s'ouvre toujours sans carte détail et sans erreur.

- [ ] **Step 5 : Commit**

```bash
git add app/components/Debrief.tsx app/page.tsx
git commit -m "feat(score): carte détail de la note (5 barres avec preuves) + écran entretien trop court"
```

---

### Task 6 : Vérification finale

**Files:** aucun nouveau.

- [ ] **Step 1 : Suite complète**

Run : `npm run build 2>&1 | tail -3 && npm test 2>&1 | tail -5`
Attendu : build OK, tous les tests PASS.

- [ ] **Step 2 : Test de bout en bout réel**

Un entretien complet (5-6 réponses de qualité variable) → vérifier que le détail des notes est cohérent avec les réponses données, que les citations sont bien des phrases du candidat, et que le score global affiché = moyenne pondérée du détail (recalculer à la main une fois).

- [ ] **Step 3 : Pousser la branche**

```bash
git push -u origin feat/score-credible
```
