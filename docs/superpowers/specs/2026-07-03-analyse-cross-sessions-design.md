# Analyse cross-sessions — points faibles récurrents (design)

Date : 2026-07-03
Branche : `feat/analyse-cross-sessions`
Prolonge : la page « Ma progression » (comptes + progression).

## Objectif

Sur « Ma progression », permettre au candidat de générer, à la demande, une
**synthèse de ses points faibles récurrents** sur l'ensemble de ses entretiens
passés, plus un **plan d'action** ciblé. Répond à « sur quoi je dois bosser en
priorité ? ».

## Décisions

- **Détection : synthèse par l'IA.** Les débriefs sont du texte libre ; deux
  entretiens ne formulent jamais un point faible à l'identique. On envoie les
  points à travailler + synthèses de plusieurs entretiens à Groq, qui dégage
  les thèmes récurrents. (Pas de catégories figées / tags — écartés : vieillissent
  mal, demandent une classification. Pourront venir plus tard si on veut des
  stats chiffrées.)
- **À la demande, non stocké.** Un bouton déclenche un appel Groq live et
  affiche le résultat. Aucune migration Supabase, aucune persistance. (La mise
  en cache pourra venir si le coût/latence devient un problème réel.)
- **Contenu : points faibles récurrents + plan d'action.** (La tendance de
  progression est déjà couverte par la sparkline de scores — pas de doublon.)
- **Seuil : 3 entretiens minimum.** En dessous, pas de récurrence
  significative → message d'invite, bouton masqué.
- **Entrée envoyée à Groq :** `poste` + `pointsATravailler` + `syntheseGenerale`
  de chaque session, plafonné aux **10 entretiens les plus récents**. **Ni CV
  ni transcript** (tokens maîtrisés, données minimisées).

## Architecture

Calque le flux `/api/debrief` existant (prompt → `askModelText` → parse → JSON).

### Flux

1. La page « Ma progression » charge déjà toutes les sessions (Supabase, RLS).
2. Au clic sur le bouton, le client réduit les **10 sessions les plus récentes**
   à `{ poste, pointsATravailler, syntheseGenerale }` et les POST à `/api/analyse`.
3. La route construit le prompt, appelle Groq, parse, renvoie `{ analysis }`.
4. Le client affiche la synthèse sous le bouton.

### Types (`lib/types.ts`)

```ts
export type CrossAnalysis = {
  pointsRecurrents: string[]; // chaque item : "**Thème** : explication courte"
  planAction: string[];       // 2-3 actions concrètes
};

export type SessionSummary = {
  poste: string;
  pointsATravailler: string[];
  syntheseGenerale: string;
};
```

### `lib/prompts.ts` — `buildCrossAnalysisPrompt(sessions: SessionSummary[]): string`

- Rôle « coach en recrutement ».
- Liste les entretiens (poste + points à travailler + synthèse de chacun).
- Consigne : dégager **3 à 5 thèmes récurrents** (ce qui revient d'un entretien
  à l'autre, pas les points isolés) + un **plan d'action** de 2-3 actions.
- Réponse **UNIQUEMENT** en JSON valide, sans texte autour :
  ```json
  { "pointsRecurrents": [liste de chaînes], "planAction": [liste de chaînes] }
  ```
- Ne reçoit que les 10 sessions déjà plafonnées par l'appelant (le prompt les
  liste toutes ; le cap vit côté client + est ré-appliqué défensivement, voir route).

### `lib/parseCrossAnalysis.ts` — `parseCrossAnalysis(raw: string): CrossAnalysis | null`

Calque exact de `parseDebrief` :
- retire un éventuel bloc markdown ```` ```json … ``` ````,
- `JSON.parse` dans un try/catch → `null` si échec,
- valide que `pointsRecurrents` et `planAction` sont des tableaux,
- renvoie l'objet typé ou `null`.

### `app/api/analyse/route.ts` — `POST`

Miroir de `/api/debrief` :
- parse le body `{ sessions: SessionSummary[] }` ; `400` si JSON invalide.
- si `sessions` absent/vide ou longueur < 3 → `400` « Au moins 3 entretiens
  sont nécessaires. » (garde-fou serveur, le client masque déjà le bouton).
- plafonne défensivement à 10 (`sessions.slice(0, 10)`).
- `buildCrossAnalysisPrompt` → `askModelText(prompt, seed)` avec seed
  `[{ role: "candidate", text: "Génère l'analyse de mes points faibles récurrents." }]`
  (Groq/Gemini exige ≥1 message user, comme le débrief).
- re-essai unique si `parseCrossAnalysis` renvoie `null` ; sinon fallback `{ raw }`.
- `catch` : `isRateLimitError` → `429` « L'IA est momentanément surchargée… » ;
  sinon `500` « Une erreur est survenue. ».

### `app/components/CrossAnalysis.tsx`

Présentation, style du `Debrief` existant : deux sections
(« Points faibles récurrents », « Plan d'action »), chacune une liste. Reçoit
`data: CrossAnalysis`.

### `app/progression/page.tsx`

- Bouton « 🔍 Analyser mes points faibles récurrents » rendu **seulement si
  `sessions.length >= 3`** ; sinon une ligne d'invite (« Fais au moins 3
  entretiens pour débloquer l'analyse. »).
- État : `analysis: CrossAnalysis | null`, `loading`, `error`.
- Au clic : POST vers `/api/analyse` avec les 10 dernières sessions réduites ;
  spinner pendant `loading` ; bandeau rouge si erreur ; `<CrossAnalysis>` sinon.

## Gestion des erreurs

| Cas | Comportement |
|-----|--------------|
| Body invalide | `400` « Requête invalide. » |
| < 3 sessions (serveur) | `400` avec message ; le client masque déjà le bouton. |
| JSON LLM malformé | 1 re-essai, puis fallback `{ raw }` → le client montre une erreur douce. |
| Rate limit Groq | `429` message « surchargée ». |
| Autre | `500` générique. Bandeau rouge côté client. |

## Confidentialité

Aucun CV ni transcript n'est envoyé à Groq — uniquement poste + points à
travailler + synthèse. Les sessions restent protégées par la RLS Supabase au
chargement (inchangé).

## Tests

- `tests/prompts.test.ts` (ajout) : `buildCrossAnalysisPrompt` inclut poste +
  points à travailler + synthèse de chaque session fournie, et demande le JSON à
  2 champs.
- `tests/parseCrossAnalysis.test.ts` (nouveau) : JSON valide → objet ; markdown
  fence toléré ; JSON malformé → `null` ; champ manquant / mauvais type → `null`
  (calque `tests/parseDebrief.test.ts`).
- Route + UI : **vérif navigateur manuelle** (nécessite Groq live, un compte
  connecté, et ≥ 3 entretiens enregistrés).

## Fichiers touchés

- `lib/types.ts` — +`CrossAnalysis`, +`SessionSummary`
- `lib/prompts.ts` — +`buildCrossAnalysisPrompt`
- `lib/parseCrossAnalysis.ts` — **nouveau**
- `app/api/analyse/route.ts` — **nouveau**
- `app/components/CrossAnalysis.tsx` — **nouveau**
- `app/progression/page.tsx` — bouton + états + rendu
- `tests/parseCrossAnalysis.test.ts` — **nouveau**
- `tests/prompts.test.ts` — +tests `buildCrossAnalysisPrompt`
