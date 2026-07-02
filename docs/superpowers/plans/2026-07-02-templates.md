# Templates de scénarios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre de lancer un entretien sans CV en partant d'un scénario prêt à l'emploi qui pré-remplit le formulaire.

**Architecture:** Catalogue statique de templates en TypeScript. Une galerie de cartes au-dessus du formulaire pré-remplit le contexte au clic (jamais de CV). Le CV devient optionnel côté validation, et le prompt recruteur s'adapte à un candidat débutant sans CV.

**Tech Stack:** Next.js (App Router, client component), TypeScript, Tailwind CSS v3, Vitest (tests de logique pure). Modèle via Groq (inchangé).

## Global Constraints

- **Gratuit d'abord** : aucune nouvelle dépendance npm.
- **Style** : Tailwind, accent émeraude (`brand-*`), composants existants (`Card`, `Button`, `Field`).
- **Langue** : toute l'UI et les libellés en français.
- **Next.js modifié** : ce projet suit des conventions Next spécifiques — lire `node_modules/next/dist/docs/` avant d'écrire du code Next spécifique (ici on ne touche qu'un client component React existant, pas de nouvelle API Next).
- **Tests** : Vitest sur la logique pure uniquement (pas d'infra de test de composants ; les composants/pages se vérifient dans le navigateur).
- **CV** : le champ `cv` de `InterviewContext` reste de type `string` ; « pas de CV » = chaîne vide.

---

### Task 1: Modèle de données + catalogue de templates

**Files:**
- Create: `lib/templates.ts`
- Test: `tests/templates.test.ts`

**Interfaces:**
- Produces: `type Template = { id: string; emoji: string; titre: string; sousTitre: string; context: { poste: string; domaine?: string; niveau?: string; langue?: string } }` et `export const TEMPLATES: Template[]`.

- [ ] **Step 1: Write the failing test**

Create `tests/templates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { TEMPLATES } from "../lib/templates";

describe("TEMPLATES", () => {
  it("contient au moins 6 scénarios", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(6);
  });

  it("a des id uniques", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a un poste non vide pour chaque template", () => {
    for (const t of TEMPLATES) {
      expect(t.context.poste.trim().length).toBeGreaterThan(0);
    }
  });

  it("a un titre et un emoji pour chaque template", () => {
    for (const t of TEMPLATES) {
      expect(t.emoji.length).toBeGreaterThan(0);
      expect(t.titre.trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/templates.test.ts`
Expected: FAIL — `Cannot find module '../lib/templates'`.

- [ ] **Step 3: Write minimal implementation**

Create `lib/templates.ts`:

```ts
export type Template = {
  id: string;
  emoji: string;
  titre: string;
  sousTitre: string;
  context: {
    poste: string;
    domaine?: string;
    niveau?: string;
    langue?: string;
  };
};

export const TEMPLATES: Template[] = [
  {
    id: "stage-marketing",
    emoji: "🎓",
    titre: "Stage marketing",
    sousTitre: "Débutant · sans expérience requise",
    context: { poste: "Stagiaire marketing", domaine: "Marketing digital", niveau: "Débutant", langue: "français" },
  },
  {
    id: "premier-emploi-dev",
    emoji: "💻",
    titre: "Premier emploi — Dev junior",
    sousTitre: "Débutant · première embauche",
    context: { poste: "Développeur junior", domaine: "Développement web", niveau: "Débutant", langue: "français" },
  },
  {
    id: "job-etudiant-vente",
    emoji: "🛍️",
    titre: "Job étudiant — Vente",
    sousTitre: "Débutant · temps partiel",
    context: { poste: "Vendeur en boutique", domaine: "Commerce / retail", niveau: "Débutant", langue: "français" },
  },
  {
    id: "relation-client",
    emoji: "📞",
    titre: "Relation client",
    sousTitre: "Débutant · centre d'appel",
    context: { poste: "Téléconseiller", domaine: "Relation client", niveau: "Débutant", langue: "français" },
  },
  {
    id: "stage-administratif",
    emoji: "📊",
    titre: "Stage administratif",
    sousTitre: "Débutant · assistanat",
    context: { poste: "Assistant administratif", domaine: "Administration", niveau: "Débutant", langue: "français" },
  },
  {
    id: "stage-banque",
    emoji: "🏦",
    titre: "Stage banque / finance",
    sousTitre: "Débutant · secteur bancaire",
    context: { poste: "Stagiaire en banque", domaine: "Banque / finance", niveau: "Débutant", langue: "français" },
  },
  {
    id: "job-etudiant-restauration",
    emoji: "🍽️",
    titre: "Job étudiant — Restauration",
    sousTitre: "Débutant · service",
    context: { poste: "Serveur", domaine: "Restauration", niveau: "Débutant", langue: "français" },
  },
  {
    id: "animateur",
    emoji: "🧑‍🏫",
    titre: "Animateur / encadrant",
    sousTitre: "Débutant · jeunesse",
    context: { poste: "Animateur", domaine: "Animation / éducation", niveau: "Débutant", langue: "français" },
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/templates.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/templates.ts tests/templates.test.ts
git commit -m "feat: catalogue statique de templates de scénarios"
```

---

### Task 2: Rendre le CV optionnel à la validation

**Files:**
- Modify: `lib/validate.ts`
- Test: `tests/validate.test.ts` (mise à jour)

**Interfaces:**
- Produces: `validateContext(ctx: Partial<InterviewContext>): string[]` — ne renvoie plus d'erreur pour un CV vide ; seul `poste` est requis.

- [ ] **Step 1: Update the tests to the new behavior (failing)**

Replace the whole body of `tests/validate.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import { validateContext } from "../lib/validate";

describe("validateContext", () => {
  it("accepte un contexte avec poste et cv", () => {
    expect(validateContext({ poste: "Dev", cv: "mon cv" })).toEqual([]);
  });

  it("accepte un contexte sans CV (CV optionnel)", () => {
    expect(validateContext({ poste: "Dev", cv: "" })).toEqual([]);
  });

  it("rejette un poste manquant", () => {
    expect(validateContext({ poste: "", cv: "mon cv" })).toContain(
      "Le poste visé est obligatoire."
    );
  });

  it("ne renvoie que l'erreur poste quand tout est vide", () => {
    expect(validateContext({})).toEqual(["Le poste visé est obligatoire."]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/validate.test.ts`
Expected: FAIL — le test « sans CV » reçoit `["Le CV est obligatoire."]`, et « tout vide » reçoit 2 erreurs.

- [ ] **Step 3: Write minimal implementation**

Replace the whole body of `lib/validate.ts` with:

```ts
import type { InterviewContext } from "./types";

export function validateContext(ctx: Partial<InterviewContext>): string[] {
  const errors: string[] = [];
  if (!ctx.poste || ctx.poste.trim() === "") {
    errors.push("Le poste visé est obligatoire.");
  }
  return errors;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/validate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/validate.ts tests/validate.test.ts
git commit -m "feat: CV optionnel, seul le poste reste requis"
```

---

### Task 3: Prompt recruteur adapté quand il n'y a pas de CV

**Files:**
- Modify: `lib/prompts.ts`
- Test: `tests/prompts.test.ts` (ajouts)

**Interfaces:**
- Consumes: `buildRecruiterPrompt(ctx: InterviewContext): string` (existant).
- Produces: même signature. La ligne « CV du candidat » n'apparaît que si `ctx.cv` est non vide. Le prompt contient toujours la consigne débutant `n'invente PAS de parcours`.

- [ ] **Step 1: Write the failing tests**

Add these tests inside the existing `describe("buildRecruiterPrompt", ...)` block in `tests/prompts.test.ts` (after the existing `it(...)` cases):

```ts
  it("inclut la ligne CV quand un CV est fourni", () => {
    expect(buildRecruiterPrompt(ctx)).toContain("CV du candidat");
  });

  it("omet la ligne CV quand aucun CV n'est fourni", () => {
    const sansCv: InterviewContext = { poste: "Vendeur", cv: "" };
    expect(buildRecruiterPrompt(sansCv)).not.toContain("CV du candidat");
  });

  it("donne la consigne débutant (ne pas inventer de parcours)", () => {
    const sansCv: InterviewContext = { poste: "Vendeur", cv: "" };
    expect(buildRecruiterPrompt(sansCv)).toContain("n'invente PAS de parcours");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/prompts.test.ts`
Expected: FAIL — « omet la ligne CV » échoue (la ligne est toujours présente) et « consigne débutant » échoue (texte absent).

- [ ] **Step 3: Write minimal implementation**

In `lib/prompts.ts`, in `contextLines`, replace this line:

```ts
  parts.push(`CV du candidat :\n${ctx.cv}`);
```

with:

```ts
  if (ctx.cv && ctx.cv.trim() !== "") parts.push(`CV du candidat :\n${ctx.cv}`);
```

Then, in `buildRecruiterPrompt`, add this bullet to the `Règles :` list (right after the calibration rule about `Niveau`):

```
- Si aucun CV n'est fourni, considère un candidat qui parle en son nom : n'invente PAS de parcours ni d'expérience à sa place, et pose des questions d'entrée adaptées à un débutant.
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/prompts.test.ts`
Expected: PASS (tous les tests, anciens + 3 nouveaux).

- [ ] **Step 5: Commit**

```bash
git add lib/prompts.ts tests/prompts.test.ts
git commit -m "feat: prompt recruteur adapté à un candidat sans CV"
```

---

### Task 4: Composant galerie de templates

**Files:**
- Create: `app/components/TemplateGallery.tsx`

**Interfaces:**
- Consumes: `TEMPLATES`, `Template` de `lib/templates.ts`.
- Produces: `TemplateGallery({ onPick, selectedId }: { onPick: (t: Template) => void; selectedId?: string | null })`.

> Pas de test unitaire : le projet n'a pas d'infra de test de composants (YAGNI, pas de nouvelle dépendance). Vérification = `npx tsc --noEmit` + contrôle navigateur en Task 5.

- [ ] **Step 1: Write the component**

Create `app/components/TemplateGallery.tsx`:

```tsx
import type { Template } from "@/lib/templates";
import { TEMPLATES } from "@/lib/templates";

export function TemplateGallery({
  onPick,
  selectedId,
}: {
  onPick: (t: Template) => void;
  selectedId?: string | null;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-center text-sm font-medium text-slate-500">
        Pas d&apos;idée ? Pars d&apos;un scénario
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft ${
              selectedId === t.id
                ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                : "border-slate-200 bg-white"
            }`}
          >
            <span className="text-xl" aria-hidden>{t.emoji}</span>
            <span className="text-sm font-semibold text-slate-900">{t.titre}</span>
            <span className="text-xs text-slate-500">{t.sousTitre}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 3: Commit**

```bash
git add app/components/TemplateGallery.tsx
git commit -m "feat: composant galerie de templates"
```

---

### Task 5: Intégrer la galerie dans la page d'accueil

**Files:**
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `TemplateGallery`, `Template`, `TEMPLATES`.

> Vérification finale dans le navigateur (le projet ne teste pas les pages en unitaire).

- [ ] **Step 1: Add imports**

In `app/page.tsx`, add near the other imports:

```tsx
import { TemplateGallery } from "@/app/components/TemplateGallery";
import type { Template } from "@/lib/templates";
```

- [ ] **Step 2: Add state + handler**

Inside `Home()`, after the `const [saveMsg, ...]` state declaration, add:

```tsx
  const [templateId, setTemplateId] = useState<string | null>(null);

  function pickTemplate(t: Template) {
    setContext({
      poste: t.context.poste,
      domaine: t.context.domaine,
      niveau: t.context.niveau,
      langue: t.context.langue,
      cv: "",
    });
    setTemplateId(t.id);
  }
```

- [ ] **Step 3: Render the gallery above the form**

In the `phase === "form"` block, between the hero `<div className="mb-8 text-center">…</div>` and the `<Card>`, insert:

```tsx
          <TemplateGallery onPick={pickTemplate} selectedId={templateId} />
```

- [ ] **Step 4: Type-check and run the unit suite**

Run: `npx tsc --noEmit && npx vitest run`
Expected: aucune erreur de type ; tous les tests passent.

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev` (si pas déjà lancé), ouvrir `http://localhost:3000`.
Vérifier :
1. La galerie de scénarios s'affiche au-dessus du formulaire.
2. Cliquer « 🎓 Stage marketing » → le formulaire se pré-remplit (poste = « Stagiaire marketing », niveau = « Débutant »), CV vide, la carte est surlignée.
3. Le bouton « Démarrer l'entretien » est actif **sans CV**.
4. Cliquer « Démarrer » → l'entretien se lance ; le recruteur pose une question d'entrée sans inventer d'expérience.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx
git commit -m "feat: galerie de templates sur la page d'accueil"
```

---

## Notes d'exécution

- Ordre : Task 1 → 5 (les tâches 1-3 sont indépendantes ; 4 dépend de 1 ; 5 dépend de 1 et 4).
- Après la Task 5, l'ensemble est vérifié en réel dans le navigateur (parcours template → entretien sans CV → débrief).
