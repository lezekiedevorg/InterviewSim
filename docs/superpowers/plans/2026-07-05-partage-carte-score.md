# Partage — Carte image du score — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'utilisateur de partager le résultat d'un entretien sous forme d'une carte image PNG (WhatsApp/statut), générée côté client, sans backend ni donnée sensible.

**Architecture:** Un module `lib/shareCard.ts` génère une carte 1080×1080 au Canvas (PNG) et la partage via l'API Web Share (repli téléchargement). Un composant client `ShareScoreButton` déclenche le tout, câblé à deux endroits (fin d'entretien + progression). Le composant `Debrief` reste inchangé.

**Tech Stack:** Next.js 16, React 19, TypeScript, vitest. Canvas 2D natif + Web Share API (aucune dépendance).

## Global Constraints

- Aucune nouvelle dépendance (Canvas + Web Share natifs).
- Aucune donnée sensible sur la carte : ni CV, ni feedback détaillé. Seulement score, poste, encouragement, wordmark + CTA.
- CTA URL exactement : `interview-sim-red.vercel.app`.
- Français dans toute l'UI et les libellés.
- Tests = vitest sur logique pure uniquement (pas de jsdom). Canvas + Web Share = vérif navigateur.
- Le composant `Debrief` (`app/components/Debrief.tsx`) ne doit PAS être modifié — le bouton est autonome, posé à côté.

---

### Task 1: `lib/shareCard.ts` — génération + partage de la carte

**Files:**
- Create: `lib/shareCard.ts`
- Test: `tests/shareCard.test.ts`

**Interfaces:**
- Produces:
  - `encouragement(score: number): string` (pur, testé)
  - `renderScoreCard(input: { poste: string; score: number }): Promise<Blob>` (Canvas, navigateur)
  - `shareScoreCard(blob: Blob): Promise<void>` (Web Share + repli téléchargement, navigateur)

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/shareCard.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { encouragement } from "../lib/shareCard";

describe("encouragement", () => {
  it("≥80 → excellent (bornes 80 et 100)", () => {
    expect(encouragement(100)).toBe("Excellent, continue !");
    expect(encouragement(80)).toBe("Excellent, continue !");
  });
  it("60–79 → bien joué (bornes 60 et 79)", () => {
    expect(encouragement(79)).toBe("Bien joué 👏");
    expect(encouragement(60)).toBe("Bien joué 👏");
  });
  it("40–59 → en bonne voie (bornes 40 et 59)", () => {
    expect(encouragement(59)).toBe("En bonne voie 🚀");
    expect(encouragement(40)).toBe("En bonne voie 🚀");
  });
  it("<40 → chaque essai compte (bornes 39 et 0)", () => {
    expect(encouragement(39)).toBe("Chaque essai compte 💪");
    expect(encouragement(0)).toBe("Chaque essai compte 💪");
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `npm test -- shareCard`
Expected: FAIL (`lib/shareCard` introuvable).

- [ ] **Step 3: Créer `lib/shareCard.ts`**

```typescript
// Carte image partageable du score d'un entretien (Canvas 2D, aucune dépendance).

const APP_URL = "interview-sim-red.vercel.app";
const SIZE = 1080;

// Phrase d'encouragement selon la tranche de score. Fonction pure (testée).
export function encouragement(score: number): string {
  if (score >= 80) return "Excellent, continue !";
  if (score >= 60) return "Bien joué 👏";
  if (score >= 40) return "En bonne voie 🚀";
  return "Chaque essai compte 💪";
}

// Tronque un texte pour tenir sur une ligne du canvas (ellipse si trop long).
function fitOneLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

// Dessine la carte 1080x1080 et renvoie un PNG. Rejette si le contexte 2D ou toBlob échoue.
export function renderScoreCard(input: { poste: string; score: number }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas 2d indisponible"));

  // Fond dégradé émeraude (charte brand).
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, "#065f46"); // emerald-800
  grad.addColorStop(1, "#059669"); // emerald-600
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.textAlign = "center";

  // Label
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 48px sans-serif";
  ctx.fillText("Score de confiance", SIZE / 2, 360);

  // Score géant
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 300px sans-serif";
  ctx.fillText(`${input.score}`, SIZE / 2, 620);
  ctx.font = "700 72px sans-serif";
  ctx.fillText("/ 100", SIZE / 2, 700);

  // Poste (une ligne, tronqué)
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "600 52px sans-serif";
  ctx.fillText(fitOneLine(ctx, input.poste, SIZE - 160), SIZE / 2, 800);

  // Encouragement
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "500 44px sans-serif";
  ctx.fillText(encouragement(input.score), SIZE / 2, 880);

  // Wordmark + CTA
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 56px sans-serif";
  ctx.fillText("InterviewSim", SIZE / 2, 980);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "500 36px sans-serif";
  ctx.fillText(`Entraîne-toi gratuitement · ${APP_URL}`, SIZE / 2, 1030);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob null"))), "image/png");
  });
}

// Partage natif (WhatsApp…) avec repli téléchargement. Annulation utilisateur = silencieuse.
export async function shareScoreCard(blob: Blob): Promise<void> {
  const file = new File([blob], "interviewsim-score.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({
        files: [file],
        title: "Mon score InterviewSim",
        text: "J'ai passé un entretien blanc sur InterviewSim 💪",
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // annulation = pas une erreur
      throw e;
    }
    return;
  }
  // Repli : téléchargement du PNG.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "interviewsim-score.png";
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `npm test -- shareCard`
Expected: PASS (4 tests). Le module s'importe sans jsdom : `document`/`navigator` ne sont référencés que dans les corps de fonction, pas au niveau module.

- [ ] **Step 5: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add lib/shareCard.ts tests/shareCard.test.ts
git commit -m "feat(partage): génération carte image du score + partage Web Share (repli download)"
```

---

### Task 2: `ShareScoreButton` + câblage (fin d'entretien + progression)

**Files:**
- Create: `app/components/ShareScoreButton.tsx`
- Modify: `app/page.tsx` (phase debrief, ~ligne 273)
- Modify: `app/progression/page.tsx` (session dépliée, ~ligne 156-160)

**Interfaces:**
- Consumes: `renderScoreCard`, `shareScoreCard` (Task 1).
- Produces: `ShareScoreButton({ poste, score }: { poste: string; score: number })` (composant client).

- [ ] **Step 1: Créer `app/components/ShareScoreButton.tsx`**

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/app/components/ui/Button";
import { renderScoreCard, shareScoreCard } from "@/lib/shareCard";

export function ShareScoreButton({ poste, score }: { poste: string; score: number }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    setBusy(true);
    setError(null);
    try {
      const blob = await renderScoreCard({ poste, score });
      await shareScoreCard(blob);
    } catch {
      setError("Le partage n'a pas fonctionné, réessaie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <Button variant="secondary" onClick={onClick} disabled={busy}>
        {busy ? "…" : "📲 Partager mon score"}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Câbler dans `app/page.tsx` (fin d'entretien)**

a) Ajouter l'import à côté des autres imports de composants (près de `import { Debrief as DebriefComponent }` — repérer la ligne existante qui importe `DebriefComponent`) :

```tsx
import { ShareScoreButton } from "@/app/components/ShareScoreButton";
```

b) Dans la phase `debrief`, juste après la ligne `{debrief && <DebriefComponent data={debrief} />}` (~ligne 273), ajouter :

```tsx
          {debrief && <ShareScoreButton poste={context.poste} score={debrief.scoreConfiance} />}
```

- [ ] **Step 3: Câbler dans `app/progression/page.tsx` (session dépliée)**

a) Ajouter l'import près de `import { Debrief } from "@/app/components/Debrief";` :

```tsx
import { ShareScoreButton } from "@/app/components/ShareScoreButton";
```

b) Dans le bloc de session dépliée, remplacer :

```tsx
            {openId === r.id && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Debrief data={r.debrief} />
              </div>
            )}
```

par :

```tsx
            {openId === r.id && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Debrief data={r.debrief} />
                <div className="mt-4">
                  <ShareScoreButton poste={r.poste} score={r.debrief.scoreConfiance} />
                </div>
              </div>
            )}
```

- [ ] **Step 4: Vérifier compilation + tests**

Run: `npm test && npx tsc --noEmit`
Expected: tests PASS (dont les 4 de `shareCard`), zéro erreur TypeScript.

- [ ] **Step 5: Vérification navigateur**

Run: `npm run dev`.
- Finir un entretien → sous le débrief, le bouton « 📲 Partager mon score » apparaît. Clic → sur desktop, un PNG `interviewsim-score.png` se télécharge ; ouvrir l'image : fond émeraude, gros score, « /100 », le poste, la phrase d'encouragement, « InterviewSim » + « Entraîne-toi gratuitement · interview-sim-red.vercel.app ».
- Aller sur « Ma progression », déplier une session → le même bouton apparaît sous le débrief et produit la carte avec le bon poste/score.
- (Mobile/optionnel) sur un navigateur mobile, le clic ouvre la feuille de partage native (WhatsApp…).

- [ ] **Step 6: Commit**

```bash
git add app/components/ShareScoreButton.tsx app/page.tsx app/progression/page.tsx
git commit -m "feat(partage): bouton Partager mon score (fin d'entretien + progression)"
```

---

## Self-Review

**Spec coverage :**
- `encouragement` (4 tranches) → Task 1. ✅
- `renderScoreCard` (Canvas 1080², score/poste/encouragement/wordmark/CTA, sans donnée sensible) → Task 1. ✅
- `shareScoreCard` (Web Share + fichier, repli download, AbortError silencieux) → Task 1. ✅
- `ShareScoreButton` (busy, erreur) → Task 2 step 1. ✅
- Câblage fin d'entretien + progression, `Debrief` inchangé → Task 2 steps 2-3. ✅
- Cas limites (2D/toBlob null → reject → message ; poste long → `fitOneLine`) → Task 1. ✅
- CTA URL exacte, pas de dépendance, français → respectés dans le code. ✅

**Placeholders :** aucun — code complet à chaque étape.

**Type consistency :** `renderScoreCard`/`shareScoreCard`/`encouragement` et les props `{ poste, score }` cohérents entre Task 1 et Task 2. `debrief.scoreConfiance` (page.tsx) et `r.debrief.scoreConfiance` (progression, type `SavedSession`) existent bien dans le type `Debrief`.
