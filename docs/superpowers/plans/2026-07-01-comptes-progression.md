# Comptes + Suivi de progression — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter au MVP InterviewSim des comptes optionnels (Supabase Auth email/mot de passe), la sauvegarde des entretiens, une page « Ma progression », et un habillage visuel cohérent (Tailwind, direction « Confiance calme », accent émeraude) — sans casser le parcours anonyme.

**Architecture:** L'app Next.js existante gagne : un client Supabase (navigateur + serveur via `@supabase/ssr`), un `middleware.ts` de rafraîchissement de session, des écrans d'auth (`/login`, `/reset`), une page `/progression`, un header d'état de connexion. Les sessions terminées par un utilisateur connecté sont insérées directement par le client navigateur Supabase (RLS garantit l'isolation). Tout est stylé en Tailwind, y compris l'écran d'accueil existant.

**Tech Stack:** Next.js (App Router, TS), `@supabase/supabase-js` + `@supabase/ssr`, Supabase (Postgres + Auth), Brevo (SMTP, config manuelle), Tailwind CSS, `next/font`, Vitest.

## Global Constraints

- Auth via Supabase ; on ne code jamais la sécurité soi-même. Provider email + mot de passe.
- Persistance : table `sessions` (Postgres/Supabase). Colonnes exactes : `id uuid pk default gen_random_uuid()`, `user_id uuid references auth.users not null`, `created_at timestamptz default now()`, `poste text`, `context jsonb`, `debrief jsonb`, `score_confiance int`.
- **RLS obligatoire** : chaque utilisateur ne lit/écrit QUE ses lignes (`user_id = auth.uid()`).
- **On ne stocke PAS** le CV brut ni le transcript complet. Uniquement : `poste`, `context` (poste/entreprise/domaine/niveau/langue), `debrief`, `score_confiance`.
- Comptes **optionnels** : le parcours anonyme (entretien → débrief, rien gardé) doit rester identique et non régressé.
- Sauvegarde **best-effort** : un échec d'insertion n'empêche jamais l'affichage du débrief.
- Variables d'env publiques : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. `GEMINI_API_KEY` reste serveur. Pas de clé service-role.
- Tests automatiques = logique pure seulement (deltas, courbe, tri, extraction score, mapping erreurs auth). Auth/DB/visuel vérifiés manuellement.
- Front : Tailwind, direction « Confiance calme », accent **émeraude/teal** (`emerald`/`teal` de Tailwind). Mobile-first. Badge de score : rouge (<40) → ambre (40-69) → vert (≥70). Restyler l'écran d'accueil existant.
- Messages et UI en français.
- Branche de travail : `feat/comptes-progression`.

---

## File Structure

| Fichier | Responsabilité |
|---|---|
| `lib/progression.ts` | Helpers purs : delta vs précédente, points de la courbe SVG, tri par date. |
| `lib/authErrors.ts` | Mapping message d'erreur Supabase → message FR. Pur. |
| `lib/scoreColor.ts` | Pur : score → catégorie de couleur ("rouge"/"ambre"/"vert"). |
| `lib/supabase/client.ts` | Client Supabase navigateur. |
| `lib/supabase/server.ts` | Client Supabase serveur (cookies). |
| `middleware.ts` | Rafraîchit la session Supabase à la navigation. |
| `supabase/schema.sql` | Table `sessions` + policies RLS (exécuté manuellement dans Supabase). |
| `app/globals.css` | Directives Tailwind + design tokens (variables CSS). |
| `tailwind.config.ts` | Config Tailwind (thème, couleurs, polices). |
| `app/components/ui/Button.tsx` | Bouton stylé (variants primaire/secondaire). |
| `app/components/ui/Card.tsx` | Carte arrondie à ombre légère. |
| `app/components/ui/Field.tsx` | Label + input stylés. |
| `app/components/ui/ScoreBadge.tsx` | Badge de score coloré. |
| `app/components/Header.tsx` | En-tête : état de connexion + liens. |
| `app/components/Debrief.tsx` | Rendu d'un objet Débrief (réutilisé accueil + progression). |
| `app/login/page.tsx` | Connexion / inscription (un écran, deux modes) + lien mot de passe oublié. |
| `app/reset/page.tsx` | Saisie d'un nouveau mot de passe. |
| `app/progression/page.tsx` | Liste + courbe + delta + débrief déplié. |
| `tests/progression.test.ts` | Tests de `lib/progression.ts`. |
| `tests/authErrors.test.ts` | Tests de `lib/authErrors.ts`. |
| `tests/scoreColor.test.ts` | Tests de `lib/scoreColor.ts`. |

---

## Task 1: Installer et configurer Tailwind + design tokens

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.mjs`
- Modify: `app/globals.css`, `app/layout.tsx`, `package.json`

**Interfaces:**
- Consumes: rien.
- Produces: Tailwind opérationnel ; classes utilitaires disponibles ; polices `next/font` (`Sora` pour les titres, `Inter` non — utiliser une police de corps propre : on prend `Plus Jakarta Sans`) chargées ; tokens de couleur émeraude accessibles.

- [ ] **Step 1: Installer Tailwind**

Run :
```bash
cd "C:/Users/Ezekiel Kouassi/Documents/perso/InterviewSim"
npm install -D tailwindcss postcss autoprefixer
```
Expected: les trois paquets en devDependencies.

- [ ] **Step 2: Créer `postcss.config.mjs`**

Create `postcss.config.mjs` :
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 3: Créer `tailwind.config.ts`**

Create `tailwind.config.ts` :
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: Remplacer `app/globals.css`**

Replace `app/globals.css` (tout le contenu) :
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg: #f8faf9;
  --text: #0f172a;
}

body {
  background-color: var(--bg);
  color: var(--text);
  font-family: var(--font-body), system-ui, sans-serif;
}
```

- [ ] **Step 5: Charger les polices via `next/font` dans `app/layout.tsx`**

Replace `app/layout.tsx` :
```tsx
import type { Metadata } from "next";
import { Sora, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const heading = Sora({ subsets: ["latin"], variable: "--font-heading" });
const body = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "InterviewSim",
  description: "Entraîne-toi à tes entretiens avec une IA.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${heading.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: Vérifier build**

Run: `npm run build`
Expected: succès. (Tailwind compile ; page `/` toujours rendue.)

- [ ] **Step 7: Vérifier les tests existants**

Run: `npm test`
Expected: 19 tests PASS (aucune régression).

- [ ] **Step 8: Commit**

```bash
git add tailwind.config.ts postcss.config.mjs app/globals.css app/layout.tsx package.json package-lock.json
git commit -m "chore: setup Tailwind + design tokens (Confiance calme, emerald)"
```

---

## Task 2: Composants UI de base (Button, Card, Field, ScoreBadge)

**Files:**
- Create: `app/components/ui/Button.tsx`, `app/components/ui/Card.tsx`, `app/components/ui/Field.tsx`, `app/components/ui/ScoreBadge.tsx`, `lib/scoreColor.ts`
- Test: `tests/scoreColor.test.ts`

**Interfaces:**
- Consumes: Tailwind (Task 1).
- Produces :
  - `scoreColor(score: number): "rouge" | "ambre" | "vert"` (`lib/scoreColor.ts`)
  - `<Button variant?: "primary" | "secondary" | "ghost" ...props>` (default "primary")
  - `<Card className? ...props>` — conteneur arrondi ombré
  - `<Field label: string; value: string; onChange: (v: string) => void; type?: string; textarea?: boolean; rows?: number>`
  - `<ScoreBadge score: number>` — pastille colorée selon `scoreColor`

- [ ] **Step 1: Écrire le test de `scoreColor`**

Create `tests/scoreColor.test.ts` :
```typescript
import { describe, it, expect } from "vitest";
import { scoreColor } from "../lib/scoreColor";

describe("scoreColor", () => {
  it("rouge sous 40", () => {
    expect(scoreColor(0)).toBe("rouge");
    expect(scoreColor(39)).toBe("rouge");
  });
  it("ambre de 40 à 69", () => {
    expect(scoreColor(40)).toBe("ambre");
    expect(scoreColor(69)).toBe("ambre");
  });
  it("vert à partir de 70", () => {
    expect(scoreColor(70)).toBe("vert");
    expect(scoreColor(100)).toBe("vert");
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test`
Expected: FAIL ("Cannot find module '../lib/scoreColor'").

- [ ] **Step 3: Implémenter `lib/scoreColor.ts`**

Create `lib/scoreColor.ts` :
```typescript
export function scoreColor(score: number): "rouge" | "ambre" | "vert" {
  if (score < 40) return "rouge";
  if (score < 70) return "ambre";
  return "vert";
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Créer `app/components/ui/Button.tsx`**

Create `app/components/ui/Button.tsx` :
```tsx
import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const styles: Record<string, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-500",
  secondary:
    "bg-white text-brand-700 border border-brand-600 hover:bg-brand-50 disabled:opacity-50",
  ghost: "bg-transparent text-slate-600 hover:text-slate-900",
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 6: Créer `app/components/ui/Card.tsx`**

Create `app/components/ui/Card.tsx` :
```tsx
import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
      {...props}
    />
  );
}
```

- [ ] **Step 7: Créer `app/components/ui/Field.tsx`**

Create `app/components/ui/Field.tsx` :
```tsx
type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  rows?: number;
  placeholder?: string;
};

export function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  rows = 4,
  placeholder,
}: Props) {
  const shared =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {textarea ? (
        <textarea
          className={shared}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={shared}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </label>
  );
}
```

- [ ] **Step 8: Créer `app/components/ui/ScoreBadge.tsx`**

Create `app/components/ui/ScoreBadge.tsx` :
```tsx
import { scoreColor } from "@/lib/scoreColor";

const classes: Record<string, string> = {
  rouge: "bg-red-100 text-red-700",
  ambre: "bg-amber-100 text-amber-700",
  vert: "bg-emerald-100 text-emerald-700",
};

export function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-semibold ${classes[scoreColor(score)]}`}
    >
      {score}/100
    </span>
  );
}
```

- [ ] **Step 9: Vérifier build + tests**

Run: `npx tsc --noEmit && npm test`
Expected: tsc zéro erreur ; tests PASS (scoreColor inclus).

- [ ] **Step 10: Commit**

```bash
git add app/components/ui lib/scoreColor.ts tests/scoreColor.test.ts
git commit -m "feat: base UI components (Button, Card, Field, ScoreBadge) + scoreColor"
```

---

## Task 3: Extraire le composant Debrief et restyler l'écran d'accueil

**Files:**
- Create: `app/components/Debrief.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `Button`, `Card`, `Field`, `ScoreBadge` (Task 2), types `Debrief` (existant `lib/types.ts`).
- Produces: `<Debrief data: DebriefType>` — rendu réutilisable du débrief (score, synthèse, listes). Consommé ici et par `/progression` (Task 8).

> **Note :** `app/page.tsx` existe déjà (formulaire → chat → débrief, en styles inline). Cette tâche : (1) extrait le rendu du débrief structuré dans `app/components/Debrief.tsx`, (2) remplace tous les styles inline par des classes Tailwind + les composants UI, mobile-first, direction « Confiance calme ». La LOGIQUE (état des phases, streaming, appels API) ne change pas — seul le style et l'extraction du composant Debrief changent. Garde `"use client"`.

- [ ] **Step 1: Créer `app/components/Debrief.tsx`**

Create `app/components/Debrief.tsx` :
```tsx
import type { Debrief as DebriefType } from "@/lib/types";
import { Card } from "@/app/components/ui/Card";
import { ScoreBadge } from "@/app/components/ui/ScoreBadge";

export function Debrief({ data }: { data: DebriefType }) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold">Débrief</h2>
          <ScoreBadge score={data.scoreConfiance} />
        </div>
        <p className="text-sm text-slate-600">{data.syntheseGenerale}</p>
      </Card>
      <Card>
        <h3 className="mb-2 font-heading font-semibold text-emerald-700">Points forts</h3>
        <ul className="list-disc pl-5 text-sm text-slate-700">
          {data.pointsForts.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </Card>
      <Card>
        <h3 className="mb-2 font-heading font-semibold text-amber-700">À travailler</h3>
        <ul className="list-disc pl-5 text-sm text-slate-700">
          {data.pointsATravailler.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </Card>
      <Card>
        <h3 className="mb-2 font-heading font-semibold text-slate-800">Reformulations suggérées</h3>
        <ul className="flex flex-col gap-2 text-sm text-slate-700">
          {data.reformulations.map((x, i) => <li key={i} className="rounded-lg bg-slate-50 p-2">{x}</li>)}
        </ul>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Restyler `app/page.tsx`**

Modify `app/page.tsx` : garder toute la logique existante (`"use client"`, les states `phase/context/history/currentAnswer/streaming/errorMsg/debrief/debriefRaw`, `streamRecruiter`, `startInterview`, `sendAnswer`, `finishInterview`). Remplacer le JSX de rendu par une version Tailwind qui :
- enveloppe tout dans `<main className="mx-auto max-w-2xl px-4 py-8">` avec un titre `<h1 className="font-heading text-2xl font-bold text-slate-900">InterviewSim</h1>`.
- **Phase form** : utilise `<Field>` pour chaque champ (poste, entreprise, domaine, niveau, langue en `type="text"` ; cv et offre en `textarea`), un `<Button disabled={formErrors.length > 0} onClick={startInterview}>Démarrer l'entretien</Button>`, et affiche `formErrors.join(" ")` en `text-red-600` si présent.
- **Phase chat** : les messages en bulles — recruteur `self-start bg-slate-100`, candidat `self-end bg-brand-50` — dans un conteneur `flex flex-col gap-3`. Un `<textarea>` (via `<Field textarea>` ou brut) pour la réponse, un `<Button>Envoyer</Button>` (disabled si `streaming` ou réponse vide) et un `<Button variant="secondary">Terminer l'entretien</Button>`. Erreur en `text-red-600`.
- **Phase debrief** : `<Debrief data={debrief} />` si `debrief` ; sinon `<pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm">{debriefRaw}</pre>` si `debriefRaw` ; sur erreur, le message + `<Button onClick={finishInterview}>Réessayer</Button>` ; sinon « Génération du débrief… ».

Conserve EXACTEMENT les mêmes noms de handlers et la même logique d'état. Retire les fonctions `Field`/`Area` inline de l'ancien fichier (remplacées par le composant `Field`).

- [ ] **Step 3: Vérifier build + tests + tsc**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc OK ; 19 tests PASS ; build OK.

- [ ] **Step 4: Vérification visuelle rapide**

Run: `npm run dev`, ouvrir http://localhost:3000. Confirmer : le formulaire s'affiche en cartes/champs Tailwind, responsive (rétrécir la fenêtre), bouton émeraude. (Pas besoin de clé Gemini pour voir le formulaire ; la logique d'entretien est inchangée.)

- [ ] **Step 5: Commit**

```bash
git add app/components/Debrief.tsx app/page.tsx
git commit -m "feat: restyle home flow with Tailwind + extract Debrief component"
```

---

## Task 4: Schéma Supabase (table sessions + RLS)

**Files:**
- Create: `supabase/schema.sql`, `.env.local.example` (modif)

**Interfaces:**
- Consumes: rien (SQL exécuté manuellement).
- Produces: la table `sessions` et ses policies, prêtes à être appliquées dans Supabase ; les variables d'env documentées.

> **Note :** ce fichier SQL est destiné à être **exécuté manuellement** dans l'éditeur SQL de Supabase (documenté au Task 10). Cette tâche crée le fichier et met à jour `.env.local.example` ; il n'y a pas de test automatique (c'est du SQL déclaratif).

- [ ] **Step 1: Créer `supabase/schema.sql`**

Create `supabase/schema.sql` :
```sql
-- Table des sessions d'entretien sauvegardées
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  poste text not null,
  context jsonb not null,
  debrief jsonb not null,
  score_confiance int not null
);

-- Index pour lister les sessions d'un utilisateur par date
create index if not exists sessions_user_created_idx
  on public.sessions (user_id, created_at desc);

-- Row-Level Security : chacun ne voit/écrit que ses lignes
alter table public.sessions enable row level security;

create policy "select_own_sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "insert_own_sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "delete_own_sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);
```

- [ ] **Step 2: Mettre à jour `.env.local.example`**

Modify `.env.local.example` — ajouter (garder `GEMINI_API_KEY`) :
```
GEMINI_API_KEY=ta-cle-gemini
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ta-cle-anon-publique
```

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql .env.local.example
git commit -m "feat: sessions table schema + RLS policies; env template"
```

---

## Task 5: Clients Supabase + middleware de session

**Files:**
- Create: `lib/supabase/client.ts`, `lib/supabase/server.ts`, `middleware.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Produces:
  - `createBrowserSupabase()` → client Supabase navigateur (`lib/supabase/client.ts`)
  - `createServerSupabase()` → client Supabase serveur lisant/écrivant les cookies (`lib/supabase/server.ts`), async
  - `middleware.ts` exportant `middleware` + `config` (rafraîchit la session)

> **Note pour l'implémenteur :** utiliser `@supabase/ssr` (API `createBrowserClient` / `createServerClient`). Vérifier la signature exacte de la version installée (gestion des cookies : `getAll`/`setAll`). Le code ci-dessous suit l'API `@supabase/ssr` courante ; ajuster si la version installée diffère, en gardant les noms de fonctions exportées.

- [ ] **Step 1: Installer les paquets Supabase**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Créer `lib/supabase/client.ts`**

Create `lib/supabase/client.ts` :
```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Créer `lib/supabase/server.ts`**

Create `lib/supabase/server.ts` :
```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // appelé depuis un Server Component sans réponse mutable — ignoré (le middleware gère le refresh)
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4: Créer `middleware.ts`**

Create `middleware.ts` (à la racine du projet) :
```typescript
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 5: Vérifier tsc + build**

Run: `npx tsc --noEmit && npm run build`
Expected: zéro erreur. (Le build peut fonctionner même sans vraies variables d'env — les clients ne sont pas instanciés au build.)

- [ ] **Step 6: Commit**

```bash
git add lib/supabase middleware.ts package.json package-lock.json
git commit -m "feat: Supabase browser/server clients + session middleware"
```

---

## Task 6: Mapping des erreurs d'auth (logique pure)

**Files:**
- Create: `lib/authErrors.ts`
- Test: `tests/authErrors.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `authErrorMessage(raw: string): string` — traduit un message d'erreur Supabase en message FR ; renvoie un message générique si non reconnu.

- [ ] **Step 1: Écrire le test**

Create `tests/authErrors.test.ts` :
```typescript
import { describe, it, expect } from "vitest";
import { authErrorMessage } from "../lib/authErrors";

describe("authErrorMessage", () => {
  it("identifiants invalides", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe(
      "Email ou mot de passe incorrect.",
    );
  });
  it("email déjà utilisé", () => {
    expect(authErrorMessage("User already registered")).toBe(
      "Cet email est déjà utilisé.",
    );
  });
  it("email non confirmé", () => {
    expect(authErrorMessage("Email not confirmed")).toBe(
      "Confirme ton email avant de te connecter (vérifie ta boîte mail).",
    );
  });
  it("message inconnu -> générique", () => {
    expect(authErrorMessage("some random error")).toBe(
      "Une erreur est survenue. Réessaie.",
    );
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test`
Expected: FAIL ("Cannot find module '../lib/authErrors'").

- [ ] **Step 3: Implémenter `lib/authErrors.ts`**

Create `lib/authErrors.ts` :
```typescript
export function authErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("already registered")) return "Cet email est déjà utilisé.";
  if (m.includes("email not confirmed"))
    return "Confirme ton email avant de te connecter (vérifie ta boîte mail).";
  if (m.includes("password") && m.includes("at least"))
    return "Le mot de passe est trop court (au moins 6 caractères).";
  return "Une erreur est survenue. Réessaie.";
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/authErrors.ts tests/authErrors.test.ts
git commit -m "feat: auth error message mapping (FR)"
```

---

## Task 7: Écrans d'auth (login/inscription + reset) et header

**Files:**
- Create: `app/login/page.tsx`, `app/reset/page.tsx`, `app/components/Header.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabase` (Task 5), `authErrorMessage` (Task 6), `Button`/`Field`/`Card` (Task 2).
- Produces: pages `/login` et `/reset` ; `<Header />` monté dans le layout.

> **Note :** pas de test automatique (dépend de Supabase/navigateur) — vérifié manuellement au Task 10. Toutes les pages sont des composants client (`"use client"`).

- [ ] **Step 1: Créer `app/components/Header.tsx`**

Create `app/components/Header.tsx` :
```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function Header() {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserSupabase();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-heading text-lg font-bold text-brand-700">
          InterviewSim
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {email ? (
            <>
              <Link href="/progression" className="text-slate-600 hover:text-slate-900">
                Ma progression
              </Link>
              <span className="hidden text-slate-400 sm:inline">{email}</span>
              <button onClick={signOut} className="text-slate-600 hover:text-slate-900">
                Se déconnecter
              </button>
            </>
          ) : (
            <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
              Se connecter
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Monter le header dans `app/layout.tsx`**

Modify `app/layout.tsx` : importer `Header` et l'insérer en haut de `<body>` :
```tsx
import { Header } from "@/app/components/Header";
// ...
      <body>
        <Header />
        {children}
      </body>
```

- [ ] **Step 3: Créer `app/login/page.tsx`**

Create `app/login/page.tsx` :
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/authErrors";
import { Card } from "@/app/components/ui/Card";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserSupabase();

  async function submit() {
    setMsg(null);
    setInfo(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return setMsg(authErrorMessage(error.message));
      setInfo("Compte créé ! Vérifie ta boîte mail pour confirmer ton email, puis connecte-toi.");
      setMode("login");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setMsg(authErrorMessage(error.message));
      router.push("/progression");
    }
  }

  async function forgot() {
    setMsg(null);
    setInfo(null);
    if (!email) return setMsg("Entre ton email d'abord.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset`,
    });
    if (error) return setMsg(authErrorMessage(error.message));
    setInfo("Si un compte existe, un email de réinitialisation vient d'être envoyé.");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <h1 className="mb-4 font-heading text-xl font-bold">
          {mode === "login" ? "Se connecter" : "Créer un compte"}
        </h1>
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Mot de passe" type="password" value={password} onChange={setPassword} />
        {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
        {info && <p className="mb-2 text-sm text-emerald-700">{info}</p>}
        <Button className="w-full" onClick={submit}>
          {mode === "login" ? "Se connecter" : "Créer mon compte"}
        </Button>
        <div className="mt-3 flex justify-between text-sm">
          <button
            className="text-slate-600 hover:text-slate-900"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Créer un compte" : "J'ai déjà un compte"}
          </button>
          {mode === "login" && (
            <button className="text-slate-600 hover:text-slate-900" onClick={forgot}>
              Mot de passe oublié ?
            </button>
          )}
        </div>
      </Card>
    </main>
  );
}
```

- [ ] **Step 4: Créer `app/reset/page.tsx`**

Create `app/reset/page.tsx` :
```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { authErrorMessage } from "@/lib/authErrors";
import { Card } from "@/app/components/ui/Card";
import { Field } from "@/app/components/ui/Field";
import { Button } from "@/app/components/ui/Button";

export default function ResetPage() {
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createBrowserSupabase();

  async function submit() {
    setMsg(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return setMsg(authErrorMessage(error.message));
    router.push("/progression");
  }

  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Card>
        <h1 className="mb-4 font-heading text-xl font-bold">Nouveau mot de passe</h1>
        <Field label="Nouveau mot de passe" type="password" value={password} onChange={setPassword} />
        {msg && <p className="mb-2 text-sm text-red-600">{msg}</p>}
        <Button className="w-full" onClick={submit}>Enregistrer</Button>
      </Card>
    </main>
  );
}
```

- [ ] **Step 5: Vérifier tsc + build + tests**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc OK ; tests PASS ; build OK, routes `/login` et `/reset` listées.

- [ ] **Step 6: Commit**

```bash
git add app/login app/reset app/components/Header.tsx app/layout.tsx
git commit -m "feat: auth screens (login/signup, reset) + header"
```

---

## Task 8: Helpers de progression (logique pure)

**Files:**
- Create: `lib/progression.ts`
- Test: `tests/progression.test.ts`

**Interfaces:**
- Consumes: type `Debrief` (existant).
- Produces:
  - Type `SavedSession = { id: string; created_at: string; poste: string; context: Record<string, unknown>; debrief: Debrief; score_confiance: number }`
  - `sortByDateDesc(sessions: SavedSession[]): SavedSession[]` — plus récentes d'abord (ne mute pas l'entrée)
  - `withDeltas(sessionsDescendants: SavedSession[]): Array<SavedSession & { delta: number | null }>` — delta = score − score de la session chronologiquement précédente ; `null` pour la toute première (la plus ancienne)
  - `sparklinePoints(scoresChronologiques: number[], width: number, height: number): string` — chaîne `"x,y x,y …"` pour une `<polyline points>` SVG, scores tracés de gauche (ancien) à droite (récent), score 0→bas, 100→haut

- [ ] **Step 1: Écrire les tests**

Create `tests/progression.test.ts` :
```typescript
import { describe, it, expect } from "vitest";
import { sortByDateDesc, withDeltas, sparklinePoints, type SavedSession } from "../lib/progression";

function s(id: string, date: string, score: number): SavedSession {
  return {
    id,
    created_at: date,
    poste: "Dev",
    context: {},
    debrief: {
      pointsForts: [],
      pointsATravailler: [],
      reformulations: [],
      scoreConfiance: score,
      syntheseGenerale: "",
    },
    score_confiance: score,
  };
}

describe("sortByDateDesc", () => {
  it("trie les plus récentes d'abord sans muter l'entrée", () => {
    const input = [s("a", "2026-01-01T00:00:00Z", 50), s("b", "2026-03-01T00:00:00Z", 60)];
    const out = sortByDateDesc(input);
    expect(out.map((x) => x.id)).toEqual(["b", "a"]);
    expect(input.map((x) => x.id)).toEqual(["a", "b"]); // pas muté
  });
});

describe("withDeltas", () => {
  it("delta vs la session chronologiquement précédente; null pour la plus ancienne", () => {
    // ordre décroissant (récent -> ancien)
    const desc = [
      s("c", "2026-03-01T00:00:00Z", 72),
      s("b", "2026-02-01T00:00:00Z", 64),
      s("a", "2026-01-01T00:00:00Z", 50),
    ];
    const out = withDeltas(desc);
    expect(out.find((x) => x.id === "c")!.delta).toBe(8); // 72 - 64
    expect(out.find((x) => x.id === "b")!.delta).toBe(14); // 64 - 50
    expect(out.find((x) => x.id === "a")!.delta).toBeNull(); // plus ancienne
  });
});

describe("sparklinePoints", () => {
  it("mappe les scores en points SVG (0 en bas, 100 en haut)", () => {
    const pts = sparklinePoints([0, 100], 100, 40);
    // 2 points, x de 0 à 100 ; score 0 -> y=40 (bas), score 100 -> y=0 (haut)
    expect(pts).toBe("0,40 100,0");
  });
  it("gère un seul score", () => {
    expect(sparklinePoints([50], 100, 40)).toBe("0,20");
  });
  it("gère une liste vide", () => {
    expect(sparklinePoints([], 100, 40)).toBe("");
  });
});
```

- [ ] **Step 2: Lancer pour vérifier l'échec**

Run: `npm test`
Expected: FAIL ("Cannot find module '../lib/progression'").

- [ ] **Step 3: Implémenter `lib/progression.ts`**

Create `lib/progression.ts` :
```typescript
import type { Debrief } from "./types";

export type SavedSession = {
  id: string;
  created_at: string;
  poste: string;
  context: Record<string, unknown>;
  debrief: Debrief;
  score_confiance: number;
};

export function sortByDateDesc(sessions: SavedSession[]): SavedSession[] {
  return [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function withDeltas(
  sessionsDescendants: SavedSession[],
): Array<SavedSession & { delta: number | null }> {
  return sessionsDescendants.map((session, i) => {
    const previous = sessionsDescendants[i + 1]; // la suivante dans l'ordre décroissant = plus ancienne
    return {
      ...session,
      delta: previous ? session.score_confiance - previous.score_confiance : null,
    };
  });
}

export function sparklinePoints(
  scoresChronologiques: number[],
  width: number,
  height: number,
): string {
  const n = scoresChronologiques.length;
  if (n === 0) return "";
  return scoresChronologiques
    .map((score, i) => {
      const x = n === 1 ? 0 : (i / (n - 1)) * width;
      const y = height - (score / 100) * height;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
```

- [ ] **Step 4: Lancer pour vérifier le succès**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/progression.ts tests/progression.test.ts
git commit -m "feat: progression helpers (sort, deltas, sparkline)"
```

---

## Task 9: Sauvegarde au débrief + page « Ma progression »

**Files:**
- Create: `app/progression/page.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `createBrowserSupabase` (Task 5), `withDeltas`/`sortByDateDesc`/`sparklinePoints`/`SavedSession` (Task 8), `Debrief` composant (Task 3), `Card`/`Button`/`ScoreBadge` (Task 2).
- Produces: la page `/progression` ; la sauvegarde best-effort dans `app/page.tsx`.

> **Note :** pas de test automatique (dépend de Supabase) — vérifié manuellement au Task 10.

- [ ] **Step 1: Sauvegarde best-effort dans `app/page.tsx`**

Modify `app/page.tsx` — dans `finishInterview`, APRÈS avoir obtenu `data.debrief` (donc quand un débrief structuré existe), tenter la sauvegarde si l'utilisateur est connecté. Ajouter un state `saveMsg` et l'affichage dans la phase debrief. Code à insérer (après `if (data.debrief) setDebrief(data.debrief);`) :
```tsx
// sauvegarde best-effort si connecté (n'affecte jamais l'affichage du débrief)
if (data.debrief) {
  try {
    const supabase = createBrowserSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { error } = await supabase.from("sessions").insert({
        user_id: userData.user.id,
        poste: context.poste,
        context: {
          poste: context.poste,
          entreprise: context.entreprise,
          domaine: context.domaine,
          niveau: context.niveau,
          langue: context.langue,
        },
        debrief: data.debrief,
        score_confiance: data.debrief.scoreConfiance,
      });
      if (error) setSaveMsg("Impossible d'enregistrer cette session.");
      else setSaveMsg("Session enregistrée dans ta progression.");
    }
  } catch {
    setSaveMsg("Impossible d'enregistrer cette session.");
  }
}
```
Ajouter en haut du composant : `const [saveMsg, setSaveMsg] = useState<string | null>(null);`, l'import `import { createBrowserSupabase } from "@/lib/supabase/client";`, réinitialiser `setSaveMsg(null)` au début de `finishInterview`, et afficher dans la phase debrief : `{saveMsg && <p className="text-sm text-slate-500">{saveMsg}</p>}`.

- [ ] **Step 2: Créer `app/progression/page.tsx`**

Create `app/progression/page.tsx` :
```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase/client";
import {
  sortByDateDesc,
  withDeltas,
  sparklinePoints,
  type SavedSession,
} from "@/lib/progression";
import { Card } from "@/app/components/ui/Card";
import { ScoreBadge } from "@/app/components/ui/ScoreBadge";
import { Debrief } from "@/app/components/Debrief";

export default function ProgressionPage() {
  const [sessions, setSessions] = useState<SavedSession[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabase();
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("sessions")
        .select("id, created_at, poste, context, debrief, score_confiance")
        .order("created_at", { ascending: false });
      setSessions((data as SavedSession[]) ?? []);
    })();
  }, [router]);

  if (sessions === null) {
    return <main className="mx-auto max-w-2xl px-4 py-10 text-slate-500">Chargement…</main>;
  }

  if (sessions.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-2 font-heading text-2xl font-bold">Ma progression</h1>
        <p className="text-slate-600">
          Aucun entretien enregistré pour l'instant. Fais un entretien, puis reviens ici !
        </p>
      </main>
    );
  }

  const desc = sortByDateDesc(sessions);
  const rows = withDeltas(desc);
  const chrono = [...desc].reverse().map((s) => s.score_confiance);
  const points = sparklinePoints(chrono, 300, 60);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-4 font-heading text-2xl font-bold">Ma progression</h1>

      <Card className="mb-6">
        <h2 className="mb-3 font-heading font-semibold">Évolution du score</h2>
        <svg viewBox="0 0 300 60" className="h-16 w-full">
          <polyline
            points={points}
            fill="none"
            stroke="#059669"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Card>

      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <Card key={r.id}>
            <button
              className="flex w-full items-center justify-between text-left"
              onClick={() => setOpenId(openId === r.id ? null : r.id)}
            >
              <div>
                <p className="font-medium text-slate-900">{r.poste}</p>
                <p className="text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {r.delta !== null && (
                  <span
                    className={`text-sm font-medium ${r.delta >= 0 ? "text-emerald-600" : "text-red-600"}`}
                  >
                    {r.delta >= 0 ? `+${r.delta}` : r.delta}
                  </span>
                )}
                <ScoreBadge score={r.score_confiance} />
              </div>
            </button>
            {openId === r.id && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <Debrief data={r.debrief} />
              </div>
            )}
          </Card>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Vérifier tsc + build + tests**

Run: `npx tsc --noEmit && npm test && npm run build`
Expected: tsc OK ; tests PASS ; build OK, route `/progression` listée.

- [ ] **Step 4: Commit**

```bash
git add app/progression/page.tsx app/page.tsx
git commit -m "feat: save session on debrief + progression page (chart, deltas, debrief)"
```

---

## Task 10: Configuration Supabase/Brevo + vérification manuelle de bout en bout

**Files:** aucun (config externe + test manuel).

**Interfaces:**
- Consumes: tout le système + un projet Supabase réel + un compte Brevo + une clé Gemini.
- Produces: confirmation que l'auth, la sauvegarde, la progression et le RLS fonctionnent en réel.

> C'est ici qu'on valide ce qui ne peut pas l'être en tests automatiques.

- [ ] **Step 1: Créer le projet Supabase**

Sur https://supabase.com : créer un projet (gratuit). Récupérer, dans Project Settings → API : l'URL du projet et la clé `anon` publique.

- [ ] **Step 2: Appliquer le schéma**

Dans Supabase → SQL Editor : coller et exécuter le contenu de `supabase/schema.sql`. Vérifier dans Table Editor que la table `sessions` existe et que RLS est activé.

- [ ] **Step 3: Configurer Brevo comme SMTP**

Créer un compte Brevo (gratuit). Dans Brevo → SMTP & API : récupérer les identifiants SMTP (serveur, port, login, clé SMTP). Dans Supabase → Authentication → Emails/SMTP : activer « Custom SMTP », coller les identifiants Brevo, renseigner un email expéditeur (vérifié côté Brevo). Dans Authentication → Providers : confirmer que « Confirm email » est activé. Dans Authentication → URL Configuration : régler Site URL sur `http://localhost:3000` et ajouter `http://localhost:3000/reset` aux Redirect URLs.

- [ ] **Step 4: Renseigner `.env.local`**

Créer/mettre à jour `.env.local` (jamais commité) :
```
GEMINI_API_KEY=<ta cle gemini>
NEXT_PUBLIC_SUPABASE_URL=<url supabase>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<cle anon>
```

- [ ] **Step 5: Lancer et tester le parcours complet**

Run: `npm run dev`, ouvrir http://localhost:3000. Vérifier :
1. **Anonyme non régressé** : sans se connecter, faire un entretien → débrief s'affiche, rien n'est enregistré (message de sauvegarde absent).
2. **Inscription** : `/login` → Créer un compte → email de confirmation reçu (via Brevo) → cliquer le lien.
3. **Connexion** : se connecter → redirection vers `/progression` (vide au départ).
4. **Sauvegarde** : faire un entretien complet connecté → au débrief, « Session enregistrée dans ta progression. »
5. **Progression** : `/progression` montre la session (poste, date, score), la courbe ; cliquer déplie le débrief. Faire un 2ᵉ entretien → un delta apparaît.
6. **RLS** : se déconnecter, créer un 2ᵉ compte, aller sur `/progression` → il ne voit PAS les sessions du 1ᵉʳ compte.
7. **Mot de passe oublié** : `/login` → « Mot de passe oublié » → email reçu → lien → `/reset` → nouveau mot de passe → connexion OK.
8. **Responsive** : rétrécir la fenêtre / mode mobile — formulaire, chat, progression restent lisibles.

- [ ] **Step 6: Lancer la suite de tests automatisés une dernière fois**

Run: `npm test`
Expected: tous les tests PASS.

---

## Self-Review (auteur du plan)

**Couverture de la spec :**
- Comptes optionnels + parcours anonyme non régressé → Task 3 (restyle sans toucher la logique), Task 9 (sauvegarde seulement si connecté), Task 10 step 5.1.
- Supabase (Postgres + Auth) → Tasks 4, 5, 10.
- Email + mot de passe, inscription/connexion/confirmation/reset → Task 7, Task 10 (confirmation email via config).
- Brevo SMTP → Task 10 step 3.
- Table `sessions` + colonnes exactes + RLS → Task 4.
- Ne pas stocker CV/transcript → Task 9 step 1 (context sans cv, pas de transcript).
- Sauvegarde best-effort → Task 9 step 1.
- Page progression : liste + courbe + delta + débrief déplié → Tasks 8 + 9.
- Front Tailwind « Confiance calme » émeraude + restyle accueil → Tasks 1, 2, 3, et styles dans 7 et 9.
- Badge score rouge/ambre/vert → Task 2 (`scoreColor` + `ScoreBadge`).
- Variables d'env publiques, pas de service-role → Tasks 4, 5.
- Tests purs uniquement → Tasks 2, 6, 8 ; auth/DB/visuel manuels → Task 10.

**Placeholders :** aucun « TODO/TBD ». Les « Notes pour l'implémenteur » (API exacte de `@supabase/ssr`, restyle de `page.tsx` en conservant la logique) sont des points de vérification légitimes ; le code complet est fourni partout où c'est du code neuf.

**Cohérence des types :** `SavedSession` (Task 8) est réutilisé tel quel en Task 9. `createBrowserSupabase`/`createServerSupabase` (Task 5) consommés en Tasks 7, 9, Header. `scoreColor` (Task 2) utilisé par `ScoreBadge` (Task 2) et cohérent avec le badge. `authErrorMessage` (Task 6) utilisé en Task 7. Le composant `Debrief` (Task 3) réutilisé en Task 9. Colonnes de `sessions` (Task 4) identiques à l'insert (Task 9 step 1) et au select (Task 9 step 2).
