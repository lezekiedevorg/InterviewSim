# Difficulté de l'entretien — Détendu / Réaliste / Sans pitié

**Date** : 2026-07-07
**Statut** : validé par l'utilisateur (brainstorm du 2026-07-07)
**Sous-projet** : A du chantier « entretiens pointus » (B = score crédible, livré ; C = jury discipliné, à venir)
**Branche** : `feat/score-credible` (à la demande de l'utilisateur, même branche que B)

## Problème

Le recruteur IA a un seul comportement. Un grand débutant stressé et un candidat qui prépare un entretien difficile ont besoin de deux choses opposées : être mis en confiance, ou être bousculé comme dans la vraie vie. Sans réglage, l'entretien est trop dur pour l'un et trop mou pour l'autre.

## Décisions actées

- **3 niveaux** : `detendu`, `realiste` (défaut), `sans-pitie`.
- **Choix dans le formulaire d'accueil** : 3 pilules sous un label « Difficulté », au-dessus de la case « Mode jury », « Réaliste » pré-sélectionné, avec une ligne de description qui suit la sélection.
- **La difficulté change le comportement du recruteur, JAMAIS la notation** : le prompt du correcteur (débrief) ne reçoit pas le niveau — tous les scores restent comparables (décision du sous-projet B).
- **Vaut aussi pour le mode jury** : les trois jurés adoptent le niveau choisi.
- **Traçabilité** : le niveau est sauvegardé avec la session et affiché en petit dans « Ma progression ».

## Les niveaux (source de vérité : `lib/difficulte.ts`)

| id | Libellé | Description UI (1 ligne) |
|---|---|---|
| `detendu` | Détendu | Recruteur bienveillant qui te met en confiance — idéal pour un premier essai. |
| `realiste` | Réaliste | Un vrai entretien professionnel : relances, écarts CV/offre confrontés. |
| `sans-pitie` | Sans pitié | Recruteur pressé qui coupe et challenge tout — comme un vrai mauvais jour. |

Chaque niveau porte un **bloc de consignes** injecté dans les prompts recruteur et jury :

- **`detendu`** : ton chaleureux ; rassure et encourage (« prenez votre temps ») ; si le candidat sèche, reformule la question plus simplement ; une seule relance douce par réponse vague ; AUCUNE question piège (la phase « questions pièges » du déroulé devient des questions de projection simples) ; ne confronte pas les incohérences, note-les pour le débrief.
- **`realiste`** : bloc vide — le prompt actuel EST le niveau réaliste (aucune consigne ajoutée, comportement inchangé).
- **`sans-pitie`** : recruteur pressé et exigeant ; si une réponse dépasse ~30 secondes de parlé ou tourne en rond, coupe poliment mais fermement (« Venons-en au fait. ») ; challenge chaque affirmation chiffrée (« Comment le mesurez-vous ? ») ; confronte IMMÉDIATEMENT toute incohérence ou contradiction ; questions pièges dès le milieu de l'entretien ; jamais de compliment ni d'encouragement pendant l'entretien ; enchaîne sec après les réponses, sans transition aimable.

## Plomberie

- `lib/types.ts` : `InterviewContext` gagne `difficulte?: DifficulteId` (`"detendu" | "realiste" | "sans-pitie"`). Optionnel = compat totale : anciens appels/sessions sans le champ → `realiste`.
- `lib/difficulte.ts` (nouveau) : `DIFFICULTES` (id, label, description, bloc), `difficulteBloc(id?)` qui renvoie le bloc du niveau (défaut `realiste`, id inconnu → `realiste`).
- `lib/prompts.ts` : `buildRecruiterPrompt` et `buildJuryPrompt` injectent le bloc (section « Attitude » insérée dans les règles). Bloc vide (réaliste) → RIEN n'est inséré, pas même un titre de section : le prompt réaliste reste octet pour octet celui d'aujourd'hui. `buildDebriefPrompt` NE CHANGE PAS.
- `app/page.tsx` : état `difficulte` (défaut `realiste`), pilules dans le formulaire, envoyé dans `context` (déjà transmis tel quel à `/api/interview`), ajouté à la whitelist `context` de l'insert Supabase.
- `app/progression/page.tsx` : si `context.difficulte` existe et ≠ `realiste`, afficher le libellé en petit à côté de la date de la session.
- Aucune migration base (le champ vit dans le jsonb `context` existant).

## UI (formulaire, style Studio nuit)

Sous le volet « Personnaliser », au-dessus de « Mode jury » :
- Label `DIFFICULTÉ` (11px, bold, uppercase, tracking 0.14em, text-faint).
- 3 pilules sur une ligne (flex, wrap sur mobile) : active = `bg-amber-400 text-amber-ink`, inactive = `bg-night-700 text-muted ring-1 ring-cream/15`, min-height tactile 44px.
- Sous les pilules, la description du niveau sélectionné (13px, text-muted) — elle change avec la sélection.

## Tests

- `lib/difficulte.ts` : 3 niveaux exactement, ids uniques ; `difficulteBloc()` sans argument → bloc réaliste (vide) ; `difficulteBloc("sans-pitie")` → contient « Venons-en au fait » ; id inconnu → réaliste.
- `lib/prompts.ts` : recruteur ET jury avec `difficulte: "sans-pitie"` contiennent le bloc ; avec `detendu` contiennent le bloc détendu ; sans difficulté → identiques à avant (non-régression) ; le prompt débrief ne contient JAMAIS le mot « difficulté » ni un bloc de niveau.

## Hors périmètre

- **C — Jury discipliné** (un appel par juré + routeur) : spec suivante.
- Minuterie réelle / interruption pendant que le candidat tape (le « coupe » est un comportement de réponse, pas un vrai barge-in — le barge-in vocal est un autre chantier de la roadmap).
- Difficulté liée à la notation (rejetée au sous-projet B).
