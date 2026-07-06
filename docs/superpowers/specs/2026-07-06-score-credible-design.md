# Score crédible — grille de notation « marché réel »

**Date** : 2026-07-06
**Statut** : validé par l'utilisateur (brainstorm du 2026-07-06)
**Sous-projet** : B du chantier « entretiens pointus » (A = difficulté de l'entretien, C = jury discipliné — hors périmètre ici, specs à venir)

## Problème

Le score de confiance actuel n'est pas crédible : le prompt de débrief demande « un entier de 0 à 100 » sans aucune grille. Le modèle, naturellement complaisant, note presque tout entre 60 et 80. L'utilisateur ne sait pas où il perd des points, et deux scores ne sont pas comparables. Si le score ment, toute l'app perd sa valeur.

## Décisions actées

- **Affichage** : score global conservé (grande jauge) + détail de 5 critères en mini-barres colorées par bande, chacun avec sa note et une justification citée de l'entretien.
- **Sévérité** : ancrage « marché réel » — 50 = candidat moyen qui ne serait PAS retenu ; 70+ = embauche probable ; 85+ = exceptionnel et rare. La sévérité ne dépend PAS d'un réglage : tous les entretiens restent comparables dans la progression.
- **Mécanique** : un seul appel IA (pas de deux-passes), mais grille + preuves obligatoires + plafonds, et **score global calculé par notre code**, jamais par l'IA.
- **Pas de fine-tuning, pas de modèle par rôle** : le cadrage (prompt + code) fait le travail ; Groq gratuit reste le moteur.

## La grille (source de vérité : `lib/score.ts`)

| id | Critère | Poids | Ce qu'il mesure |
|---|---|---|---|
| `structure` | Structure des réponses | 20 | Réponses organisées (situation → action → résultat), pas de coq-à-l'âne |
| `concret` | Concret & chiffres | 25 | Exemples réels, résultats mesurables, faits vérifiables |
| `adequation` | Adéquation au poste | 20 | Réponses collées au poste/à l'offre, vocabulaire du métier |
| `communication` | Communication | 15 | Clarté, concision, ni laconique ni tunnel |
| `pression` | Réaction sous pression | 20 | Tenue face aux relances, questions pièges, contradictions |

Poids en constante de code, somme = 100 (testé). Score global = somme pondérée arrondie des 5 notes.

## Contrat JSON du débrief (v2)

Le prompt de débrief exige :

```json
{
  "criteres": [
    { "id": "structure", "note": 0-100, "preuve": "citation exacte du candidat", "commentaire": "1 phrase" }
    // … exactement les 5 ids de la grille
  ],
  "pointsForts": ["…"],
  "pointsATravailler": ["…"],
  "reformulations": ["…"],
  "syntheseGenerale": "2-3 phrases"
}
```

`scoreConfiance` disparaît de la sortie IA : il est **calculé côté code** à partir des critères (après plafonds), puis stocké comme avant dans `sessions.score_confiance`.

## Mécanique anti-indulgence

1. **Barème écrit par tranche** dans le prompt, pour chaque critère : à quoi ressemble une réponse à 20, à 50, à 80. L'ancrage marché réel y est explicite (« 50 = ne serait pas retenu »).
2. **Preuve obligatoire** : chaque note doit citer une phrase réelle du candidat. Règle prompt : « pas de note > 55 sans citation précise qui la justifie ».
3. **Plafonds côté code** (`lib/score.ts`, testés) :
   - `preuve` absente ou vide pour un critère → note plafonnée à 40 ;
   - note hors [0, 100] → bornée ;
   - critère manquant dans la réponse IA → note 0 pour ce critère (et le parse le signale).
4. **Température 0** sur l'appel débrief (correcteur froid et régulier) — les autres appels (entretien) ne changent pas.
5. **Le global vient du code** : l'IA ne peut plus « offrir » un 75 incohérent avec son propre détail.

## Garde-fou « entretien trop court »

Moins de **3 réponses du candidat** dans le transcript (constante `MIN_REPONSES = 3`, testée) → l'API `/api/debrief` ne note pas : elle répond `200` avec `{ tooShort: true }` sans appeler le modèle. L'UI affiche un message dédié (« Entretien trop court pour être évalué sérieusement — tiens au moins 3 échanges, puis termine ») avec un bouton « Nouvel entretien ». Rien n'est sauvegardé en base.

## Affichage (débrief, style Studio nuit)

Sous la grande jauge et le verdict : une carte « Détail de la note » avec 5 lignes — libellé, mini-barre horizontale colorée par bande (rouge < 40, ambre < 70, vert ≥ 70, mêmes seuils que `BAND_HEX`), note /100, et la justification (`commentaire`, avec la `preuve` citée en dessous en retrait). Bandes et jauge réutilisent `lib/scoreColor.ts`.

**Compatibilité** : les débriefs déjà enregistrés n'ont pas `criteres` → la carte détail ne s'affiche que si `criteres` existe. Aucune migration de données. `ScoreBadge`, la progression, l'analyse croisée et la carte de partage ne changent pas (ils consomment `scoreConfiance`/`score_confiance` comme avant).

## Types & fichiers touchés

- `lib/score.ts` (nouveau) : grille (ids, libellés, poids), `computeScore(criteres)` avec plafonds, `MIN_REPONSES`, `estTropCourt(transcript)`.
- `lib/types.ts` : `Debrief` gagne `criteres?: CritereNote[]` (optionnel = compat anciens débriefs).
- `lib/prompts.ts` : `buildDebriefPrompt` réécrit (grille, barème par tranche, ancrage, preuve obligatoire, JSON v2).
- `lib/parseDebrief.ts` : valide le JSON v2 (5 critères exigés — il ne parse que les réponses fraîches du modèle ; les anciens débriefs stockés en base ne passent pas par lui).
- `app/api/debrief/route.ts` : garde-fou trop court, température 0, calcul du score via `computeScore`.
- `app/components/Debrief.tsx` : carte « Détail de la note ».
- `app/page.tsx` : cas `tooShort` dans la phase débrief.

## Tests

- `lib/score.ts` : somme des poids = 100 ; calcul pondéré sur exemples ; plafond preuve manquante ; bornage ; critère absent → 0 ; seuil trop court (2 réponses → oui, 3 → non).
- `parseDebrief` : JSON v2 valide ; critère manquant ou id inconnu signalé ; JSON invalide → repli brut comme aujourd'hui.
- Pas de test du prompt lui-même (non déterministe) : la rigueur mesurable est dans le code.

## Hors périmètre (sous-projets suivants)

- **A — Difficulté de l'entretien** : réglage détendu/réaliste/sans pitié, recruteur qui coupe et confronte davantage.
- **C — Jury discipliné** : un appel par juré + routeur de prise de parole.
- Second format de carte de partage (story 1080×1920).
- Changement de modèle payant (à réévaluer seulement si la grille ne suffit pas).
