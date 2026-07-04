# Meilleure voix du navigateur — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Choisir la meilleure voix française déjà présente sur l'appareil (au lieu de la première venue) pour une synthèse vocale plus naturelle, sans coût ni téléchargement.

**Architecture:** Un helper pur `rankFrenchVoices` classe les voix `speechSynthesis` françaises par qualité (heuristique sur le nom) ; `useSpeech` prend la première du classement comme voix par défaut. Repli sur le comportement actuel si rien de mieux.

**Tech Stack:** TypeScript, Web Speech API (`speechSynthesis`), React hook, vitest.

**Spec:** `docs/superpowers/specs/2026-07-04-meilleure-voix-navigateur-design.md`

## Global Constraints

- **Aucune nouvelle dépendance.** API navigateur native uniquement.
- **Ne pas casser l'existant** : repli sur la première voix FR si aucune voix « de qualité », repli sur `voices[0]` puis `null` si aucune voix FR, comme aujourd'hui. `"use client"` déjà présent dans `useSpeech.ts`.
- Tests via **vitest** (`npm test`), descriptions en français, style de `tests/speech.test.ts`.
- Marqueurs de qualité (score +2) : `natural`, `neural`, `enhanced`, `premium`, `google`, `siri`, `online`. Marqueurs de basse qualité (score −2) : `compact`, `espeak`, `hortense`. Comparaison **insensible à la casse**. Tri **stable** (ordre d'origine préservé à score égal).

---

### Task 1: Helper pur `rankFrenchVoices`

**Files:**
- Modify: `lib/speech.ts` (ajout d'une fonction exportée + une fonction privée)
- Test: `tests/speech.test.ts` (ajout d'un bloc `describe`)

**Interfaces:**
- Consumes: rien.
- Produces: `rankFrenchVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[]` — renvoie les voix françaises triées, meilleures d'abord ; `[]` si aucune voix française.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/speech.test.ts`, ajouter `rankFrenchVoices` à l'import existant depuis `../lib/speech`, puis ajouter à la fin du fichier :

```ts
// Fausses voix pour les tests (seuls name/lang sont utilisés par rankFrenchVoices).
const voice = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;

describe("rankFrenchVoices", () => {
  it("écarte les voix non françaises", () => {
    const r = rankFrenchVoices([voice("Google français", "fr-FR"), voice("Alex", "en-US")]);
    expect(r.map((v) => v.name)).toEqual(["Google français"]);
  });

  it("place une voix naturelle devant une voix robotique", () => {
    const r = rankFrenchVoices([
      voice("Microsoft Hortense", "fr-FR"),
      voice("Microsoft Denise (Natural)", "fr-FR"),
    ]);
    expect(r[0].name).toBe("Microsoft Denise (Natural)");
  });

  it("conserve l'ordre d'origine à score égal", () => {
    const r = rankFrenchVoices([voice("Voix A", "fr-FR"), voice("Voix B", "fr-FR")]);
    expect(r.map((v) => v.name)).toEqual(["Voix A", "Voix B"]);
  });

  it("renvoie une liste vide sans voix française", () => {
    expect(rankFrenchVoices([voice("Alex", "en-US")])).toEqual([]);
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npm test -- speech`
Expected: FAIL — `rankFrenchVoices is not a function` / erreur d'import.

- [ ] **Step 3: Implémenter le helper**

Ajouter à la fin de `lib/speech.ts` :

```ts
// Marqueurs dans le NOM de la voix (l'API speechSynthesis n'a pas de champ « qualité »).
const VOICE_QUALITY_HINTS = ["natural", "neural", "enhanced", "premium", "google", "siri", "online"];
const VOICE_LOW_HINTS = ["compact", "espeak", "hortense"];

function scoreVoice(v: SpeechSynthesisVoice): number {
  const name = v.name.toLowerCase();
  let score = 0;
  if (VOICE_QUALITY_HINTS.some((h) => name.includes(h))) score += 2;
  if (VOICE_LOW_HINTS.some((h) => name.includes(h))) score -= 2;
  return score;
}

// Classe les voix françaises du navigateur, meilleures d'abord.
// ponytail: heuristique sur le nom faute de champ qualité dans l'API ; suffisant, ajustable.
export function rankFrenchVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices
    .filter((v) => v.lang.toLowerCase().startsWith("fr"))
    .map((v, i) => ({ v, i, score: scoreVoice(v) }))
    .sort((a, b) => b.score - a.score || a.i - b.i) // score décroissant, stable à score égal
    .map((x) => x.v);
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npm test -- speech`
Expected: PASS (tests existants + les 4 de `rankFrenchVoices`).

- [ ] **Step 5: Commit**

```bash
git add lib/speech.ts tests/speech.test.ts
git commit -m "feat: rankFrenchVoices (classe les voix du navigateur par qualité)"
```

---

### Task 2: Brancher `rankFrenchVoices` dans `useSpeech`

**Files:**
- Modify: `lib/useSpeech.ts`

**Interfaces:**
- Consumes: `rankFrenchVoices` (Task 1).
- Produces: la voix par défaut de `useSpeech` est désormais la meilleure voix FR disponible.

*Note : hook 100 % API navigateur → pas de test unitaire (comme le reste de `useSpeech`) ; vérif au build + navigateur.*

- [ ] **Step 1: Importer le helper**

En haut de `lib/useSpeech.ts`, après la ligne `import { useCallback, useEffect, useRef, useState } from "react";`, ajouter :

```ts
import { rankFrenchVoices } from "./speech";
```

- [ ] **Step 2: Utiliser le classement dans `pickVoice`**

Dans `lib/useSpeech.ts`, remplacer :

```ts
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = voices.find((v) => v.lang.startsWith("fr")) ?? voices[0] ?? null;
    };
```

par :

```ts
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = rankFrenchVoices(voices)[0] ?? voices[0] ?? null;
    };
```

- [ ] **Step 3: Vérifier build + suite**

Run: `npm run build && npm test`
Expected: build OK (le hook compile), tous les tests verts.

- [ ] **Step 4: Vérification navigateur (manuelle)**

Lancer `npm run dev`, démarrer un entretien, rejoindre la réunion : la voix du recruteur doit être **plus naturelle** que la précédente sur un appareil récent (Edge « Natural », Chrome/Android « Google français », Safari/iOS Siri). Sur un appareil au choix pauvre, elle reste correcte (repli).

- [ ] **Step 5: Commit**

```bash
git add lib/useSpeech.ts
git commit -m "feat: useSpeech choisit la meilleure voix FR du navigateur"
```

---

## Self-Review

- **Couverture spec :** `rankFrenchVoices` pur + heuristique + tri stable + filtrage FR (T1) ✅ ; câblage `useSpeech` avec repli (T2) ✅ ; filets de sécurité (repli `voices[0]`/`null`, `speechSynthesis` absent inchangé — T2, hérité) ✅ ; tests purs (T1) ✅. Le jury (branche séparée) réutilisera `rankFrenchVoices` à son intégration — hors de ce plan, conforme au spec.
- **Placeholders :** aucun — code réel à chaque step.
- **Cohérence des types :** `rankFrenchVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[]` défini en T1, consommé à l'identique en T2 (`rankFrenchVoices(voices)[0]`).
