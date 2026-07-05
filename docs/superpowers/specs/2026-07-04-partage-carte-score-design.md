# Partage entre pairs — Carte image du score — Design

**Date :** 2026-07-04
**Branche cible :** `feat/partage-carte-score`
**État départ :** entretiens stockés dans Supabase (`sessions` : poste, context, debrief, score, RLS stricte). Débrief affiché après l'entretien (`app/page.tsx`, phase `debrief`) et par session dans `app/progression/page.tsx`. Composant `Debrief` reçoit `data: Debrief` (dont `scoreConfiance`), pas le poste.

## Objectif

Permettre à l'utilisateur de partager le résultat d'un entretien à ses pairs sous forme d'une **carte image** (idéale WhatsApp/statut), sans backend, sans stockage, sans donnée sensible. Croissance par bouche-à-oreille pour le public cible (étudiants CI, mobile/data limitée).

## Décisions

- **Format :** carte **image PNG** générée côté client (pas de lien public, pas de migration DB).
- **Contenu :** minimal + motivant. Aucun CV, aucun feedback détaillé.
- **Partage :** API Web Share avec fichier (WhatsApp sur mobile), repli téléchargement.
- **CTA URL :** `interview-sim-red.vercel.app`.

## Composants

### 1. `lib/shareCard.ts`

**`encouragement(score: number): string`** — pur, testé. Phrase selon la tranche :
- `score >= 80` → « Excellent, continue ! »
- `score >= 60` → « Bien joué 👏 »
- `score >= 40` → « En bonne voie 🚀 »
- sinon → « Chaque essai compte 💪 »

**`renderScoreCard(input: { poste: string; score: number }): Promise<Blob>`** — dessine une carte carrée **1080×1080** via un `<canvas>` hors écran (`document.createElement("canvas")`), 2D, PNG via `canvas.toBlob`. Contenu :
- fond dégradé émeraude (charte `brand`),
- gros **score** « NN/100 » + label « Score de confiance »,
- intitulé du **poste**,
- la phrase `encouragement(score)`,
- wordmark **InterviewSim** + CTA « Entraîne-toi gratuitement · interview-sim-red.vercel.app ».
Rejette si le contexte 2D est indisponible ou `toBlob` renvoie null.

**`shareScoreCard(blob: Blob): Promise<void>`** — partage/téléchargement :
- construit `new File([blob], "interviewsim-score.png", { type: "image/png" })`,
- si `navigator.canShare?.({ files: [file] })` → `await navigator.share({ files: [file], title, text })`,
- sinon → repli téléchargement (`URL.createObjectURL` + `<a download>` cliqué puis révoqué),
- `AbortError` (annulation utilisateur) → ignoré silencieusement ; toute autre erreur est relancée pour l'UI.

### 2. `app/components/ShareScoreButton.tsx`

- `"use client"`, props `{ poste: string; score: number }`.
- Bouton `variant="secondary"` : **« 📲 Partager mon score »**. État `busy` (désactivé + libellé « … ») pendant `renderScoreCard` → `shareScoreCard`.
- Erreur (hors annulation) → message rouge sous le bouton (« Le partage n'a pas fonctionné, réessaie. »). Pas de crash.

### 3. Câblage (2 emplacements, mêmes props, composant `Debrief` inchangé)

- `app/page.tsx`, phase `debrief` : sous `<DebriefComponent>`, `<ShareScoreButton poste={context.poste} score={debrief.scoreConfiance} />`.
- `app/progression/page.tsx`, dans chaque session dépliée : à côté du `<Debrief>`, `<ShareScoreButton poste={r.poste} score={r.debrief.scoreConfiance} />`.

## Flux

1. L'utilisateur finit un entretien (ou ouvre une session dans « Ma progression »).
2. Clic « 📲 Partager mon score » → `renderScoreCard({ poste, score })` produit un PNG.
3. `shareScoreCard(blob)` → feuille de partage native (WhatsApp…) sur mobile, ou téléchargement sur desktop.

## Cas limites

- `navigator.share`/`canShare` absents ou fichier non partageable → repli téléchargement.
- Annulation utilisateur (`AbortError`) → silencieuse, aucun message d'erreur.
- Contexte 2D indisponible / `toBlob` null → `renderScoreCard` rejette → message d'erreur du bouton.
- Poste très long → tronqué au dessin (une ligne, ellipse) pour ne pas déborder la carte.

## Tests

- **Pur (vitest)** : `encouragement` — les 4 tranches + bornes exactes (80, 60, 40, 39, 0, 100).
- **Vérif navigateur** (Canvas + Web Share, cohérent avec le repo) : la carte se génère et s'affiche correcte (score, poste, encouragement, CTA) ; sur mobile la feuille de partage s'ouvre ; sur desktop le PNG se télécharge.

## Hors périmètre (YAGNI)

- Pas de page publique partagée, pas de token, pas de stockage, pas de migration DB.
- Pas de point fort / feedback sur la carte (minimal décidé).
- Pas de personnalisation visuelle par l'utilisateur.
- Pas de génération côté serveur (le Canvas client suffit, zéro coût).
