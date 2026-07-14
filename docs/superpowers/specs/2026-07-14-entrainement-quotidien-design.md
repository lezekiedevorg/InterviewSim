# Spec — Mode « Entraînement » (drills thématiques)

Date : 2026-07-14
Branche cible : à créer (`feat/entrainement-quotidien`)
Statut : design validé, spec figée

## 1. Contexte & objectif

InterviewSim propose aujourd'hui un **entretien complet** (contexte/CV → entretien vocal tour par tour → débrief 5 critères). Inspiration concurrent (persuasiv.ai) : un mode d'**entraînement ciblé** séparé des simulations complètes, qui fait revenir l'utilisateur et fait progresser sur un point précis.

**Objectif N°1 (décidé) : muscler des compétences ciblées** — bosser un thème précis entre deux vrais entretiens, avec une **progression mesurable par thème**. Pas d'abord de la gamification, pas d'abord un hook d'acquisition.

## 2. Parcours utilisateur

1. L'utilisateur ouvre le mode **« Entraînement »** (distinct de « Entretien »).
2. Il **choisit un thème** dans un menu (7 thèmes, §4).
3. Mini-entretien : **3 à 5 questions du seul thème choisi**, en **voix OU texte au choix** (comme l'entretien actuel : mains-libres + repli clavier).
4. À la fin : **mini-rapport** — 1 score /100 sur le thème + 2 points forts + 2 axes à travailler + **une meilleure version d'une de ses réponses** (« réécriture »).
5. Le score alimente une **barre de maîtrise par thème** (moyenne glissante) sur « Ma progression ».

## 3. Non-objectifs / hors périmètre (v1)

- Pas de gamification (streak, XP, question du jour, paliers) — potentiel v2.
- Pas de ciblage auto depuis les points faibles des entretiens passés — v1 = **choix manuel du thème** ; l'auto-ciblage (réutiliser l'analyse cross-sessions) est une évolution ultérieure.
- Pas de nouveau moteur vocal, pas de nouveau fournisseur LLM.
- Pas de CV Builder / analyse CV / export PDF (features concurrent, hors sujet).

## 4. Thèmes — source de vérité

Nouveau module `lib/drillThemes.ts` (calqué sur `lib/difficulte.ts` : tableau typé + helpers). Chaque thème : `id` stable, `label`, `description` (UI), `bloc` (fragment de prompt décrivant les questions à poser).

Les 7 thèmes :
1. `pitch` — **Pitch perso** (« parlez-moi de vous », présentation en 1-2 min).
2. `motivation` — **Motivation & adéquation** (pourquoi ce poste/cette boîte, projection).
3. `comportemental` — **Comportementales (STAR)** (« une fois où… », gestion conflit/échec/réussite).
4. `situation` — **Mises en situation** (cas pratiques, priorisation, décisions).
5. `pieges` — **Questions pièges** (défauts, écarts CV, questions déstabilisantes).
6. `technique` — **Technique métier** (profondeur du savoir-faire propre au poste).
7. `nego` — **Négociation salariale** (prétentions, justification, contre-offre).

Helpers : `drillTheme(id)` (lookup, `undefined` si inconnu), `drillThemeBloc(id)` (fragment ou `""`). Whitelist par `.find` → pas d'injection possible (comme `difficulteBloc`).

## 5. Architecture — réutilisation maximale

Un drill **est un entretien court et thématique**. On réutilise l'existant :

**Réutilisé tel quel :**
- Pipeline voix + chat + mains-libres (`MeetingRoom`, `useVoice`, `/api/tts`, `useSpeechRecognition`), y compris la passe « naturel » (`NATUREL_ORAL`, fillers).
- `askModelStream` (`lib/askModel.ts`, gpt-oss-120b).
- Table Supabase `sessions` + page « Ma progression ».
- Patron du débrief (`buildDebriefPrompt` / `parseDebrief`) → variante allégée.

**Nouveau (petit) :**
1. `lib/drillThemes.ts` — source de vérité (§4).
2. `buildDrillPrompt(theme, ctx)` (`lib/prompts.ts`) — recruteur qui pose **uniquement** des questions du thème, **s'arrête après N questions** puis laisse place au rapport. Réutilise la règle d'or (2-4 phrases, 1 question) + `NATUREL_ORAL`. `N` = 3 à 5 (constante `ponytail:` calibrable).
3. `buildDrillReportPrompt(theme, transcript)` + `parseDrillReport` — mini-rapport JSON (§6).
4. UI :
   - Écran **choix du thème** (grille de 7 cartes, style pilules « Studio nuit »).
   - **Mini-rapport** (composant dédié, plus léger que `Debrief`).
   - Section **« Maîtrise par thème »** sur la progression (barres).
5. `lib/drillMastery.ts` — calcul pur de la maîtrise (§7).

**Cap de questions :** le mode entraînement compte les tours recruteur et déclenche le rapport après N questions (logique côté client, comme le déclenchement du débrief). Le prompt renforce (« pose exactement N questions ») mais le **code fait autorité** sur l'arrêt.

## 6. Mini-rapport — format

Plus léger que le débrief 5 critères (un drill ne mesure qu'un thème). Route dédiée `POST /api/drill-report` (calque de `/api/debrief`, `reasoning_effort: medium`, `temperature` basse pour la régularité). Sortie JSON stricte :

```json
{
  "score": 0-100,          // maîtrise du thème sur CE drill
  "pointsForts": [string, string],
  "aTravailler": [string, string],
  "meilleureReponse": {    // "réécriture" d'UNE réponse faible
    "question": "…",
    "avant": "citation exacte du candidat",
    "apres": "version améliorée"
  }
}
```

Règles de preuve reprises du débrief : `meilleureReponse.avant` = citation **exacte** du candidat ; si aucune réponse exploitable → `meilleureReponse: null` (le drill reste noté mais sans réécriture). `parseDrillReport` calqué sur `parseDebrief` (tolérant, repli lisible sur JSON invalide).

## 7. Progression / maîtrise par thème

- **Persistance** : chaque drill terminé, si l'utilisateur est connecté, enregistre `{ theme, score }`. **Choix de stockage tranché au planning** entre deux options :
  - (a) **réutiliser `sessions`** avec un marqueur dans le `context` jsonb (`context.kind = 'drill'`, `context.theme = <id>`, `score_confiance = <score>`, `debrief` = mini-rapport) — **zéro migration**, mais il faut que le rendu débrief existant n'essaie jamais d'afficher une ligne drill (filtrage strict) ;
  - (b) **table dédiée `drills`** (`user_id`, `theme`, `score`, `report jsonb`) + policy RLS — plus propre, mais migration Supabase.
  Critère : (a) si le filtrage est sûr et simple, sinon (b). Rétro-compat : les lignes sans marqueur = entretiens.
- **Maîtrise d'un thème** = **moyenne glissante des N derniers scores de drill** de ce thème (`drillMastery.ts`, pur + testé ; `N` calibrable, défaut 5). Aucun drill sur un thème → thème « non commencé » (pas de barre).
- **Affichage** : section « Maîtrise par thème » sur « Ma progression » — une barre par thème entamé (couleurs `scoreColor` existantes rouge/ambre/vert), + accès rapide « refaire ce thème ».
- **Sans compte** : un drill se joue **anonymement** (aucune obstruction). La maîtrise/progression n'est **trackée que si connecté** (identique au débrief actuel : sauvegarde best-effort si `auth.getUser()` renvoie un user). Anonyme = mini-rapport affiché, non persisté.

## 8. Modalité voix/texte

Aucune nouveauté : on réutilise le mode réunion existant (mains-libres par défaut, mute = mode texte, repli clavier si Web Speech absent). L'utilisateur bascule comme aujourd'hui. « Au choix » est donc **gratuit** (déjà supporté).

## 9. Étanchéité / non-régression

- L'**entretien complet est strictement inchangé** : nouveaux prompts/route/écrans en parallèle, aucun chemin existant modifié.
- La **courbe de progression d'entretien actuelle doit exclure les drills** (quel que soit le stockage retenu en §7) pour ne pas mélanger drills et entretiens dans le score global. Lignes sans marqueur drill = entretiens (rétro-compat).
- Whitelist thèmes par `.find` → pas d'injection prompt.

## 10. Tests envisagés (TDD)

- `drillThemes` : lookup, bloc, id inconnu → `""`.
- `buildDrillPrompt` : contient le bloc du thème + la règle d'or ; thème inconnu → générique sûr.
- `parseDrillReport` : JSON valide, JSON invalide → repli, `meilleureReponse: null`.
- `drillMastery` : moyenne glissante, fenêtre N, thème vide → non commencé, bornes 0-100.
- Cap de questions (helper pur si extrait) : s'arrête à N.
- Filtrage progression : les lignes `type: 'drill'` n'entrent pas dans la courbe de score d'entretien.

## 11. Découpage pressenti (pour le plan)

1. Source de vérité `drillThemes` + tests.
2. Prompts `buildDrillPrompt` + `buildDrillReportPrompt` + `parseDrillReport` + tests.
3. Route `/api/drill-report`.
4. Cap de questions + flux drill (réutilise MeetingRoom).
5. Écran choix du thème.
6. Mini-rapport (composant).
7. Persistance `sessions` (type/theme) + `drillMastery` + section maîtrise sur progression + filtrage courbe.
8. Vérif navigateur (voix + texte) + revue de branche.

## 12. Décisions actées

- But = compétences ciblées (pas gamification).
- Modalité = voix **ou** texte au choix.
- Ciblage = **choix manuel** du thème (auto-ciblage = v2).
- Drill = **série de 3-5 questions → mini-rapport** (mini-entretien thématique).
- Progression = **% maîtrise par thème**, moyenne glissante, sur compte.
- Drill **jouable sans compte** ; maîtrise trackée seulement si connecté.
- 7 thèmes (négo salaire incluse).
