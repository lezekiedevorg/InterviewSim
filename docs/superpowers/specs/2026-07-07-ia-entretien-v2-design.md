# IA d'entretien v2 — gpt-oss-120b + règle d'or « une seule question » — Design

**Date** : 2026-07-07
**Statut** : validé (approche B du brainstorm « l'IA derrière les entretiens »)
**Branche** : `feat/ia-entretien` (depuis `feat/score-credible`)

## Problème

Le recruteur (llama-3.3-70b-versatile via Groq) empile plusieurs questions par réplique et se montre verbeux — l'utilisateur ne sait plus à quoi répondre. Constat mesuré : sur une sonde identique, TOUS les modèles testés empilent 2+ questions quand la consigne « une question à la fois » reste enfouie au milieu de dix règles ; et llama-3.3-70b (fin 2024) plafonne en finesse de jeu de rôle. L'utilisateur veut « miser sur la qualité » : un entretien fluide, un recruteur qui joue son rôle sans limites.

## Faits établis (banc d'essai du 2026-07-07, clé Groq du projet)

- `openai/gpt-oss-120b` : disponible sur la clé actuelle, TTFT 0,78 s en streaming avec `reasoning_effort: "low"` (compatible voix), 200K tokens/jour gratuits (2× llama-3.3-70b). Sa réflexion voyage dans un champ séparé (`reasoning`) que le parseur actuel (`delta.content` / `message.content`) ignore déjà — aucun brouillon ne peut fuiter dans les réponses.
- `qwen/qwen3.6-27b` : DISQUALIFIÉ — émet son raisonnement `<think>` dans le contenu (serait prononcé par la voix).
- `meta-llama/llama-4-scout` : flagorneur, pas mieux que l'actuel.
- Quotas gratuits Groq (constatés) : llama-3.3-70b = 100K tokens/jour ; gpt-oss-120b = 200K tokens/jour, 1K requêtes/jour.

## Décisions

1. **Modèle unique `openai/gpt-oss-120b` pour tout** (recruteur, jury, débrief, analyse), dans `lib/askModel.ts` (seul fichier qui parle à Groq). Retour arrière = une ligne.
2. **Effort de réflexion par usage** : `reasoning_effort: "low"` en streaming (l'entretien — latence voix), `"medium"` en non-streaming (débrief + analyse — la rigueur prime, personne n'attend). La distinction stream/non-stream suffit : aucun changement de signature.
3. **Règle d'or dans les prompts recruteur ET jury**, placée EN TÊTE (juste après la consigne de langue, avant le contexte) : chaque réplique = 2 à 4 phrases orales MAXIMUM, UNE SEULE question (un seul « ? ») ; si plusieurs points méritent d'être creusés, choisir le plus important, les autres attendent les tours suivants. La règle domine TOUT, y compris le bloc « Attitude imposée » de la difficulté (sans-pitié challenge toujours, mais une question à la fois). La règle existante « Pose une question à la fois » dans les listes de règles est conservée (renforcement, inoffensif).
4. **Le prompt débrief ne change pas** (ni son contenu, ni ses températures 0 / retry 0.2).
5. **Effet de bord assumé** : changer de correcteur peut décaler légèrement la sévérité des notes ; les ancrages du barème (50 = pas retenu, preuves citées, plafonds) restent la boussole. Si le nouveau correcteur déçoit au test réel, on repasse le débrief seul sur llama-3.3-70b (le « modèle par usage » le permet en une ligne) — décision à prendre sur preuve, pas par avance.

## Hors périmètre

- Multi-fournisseurs (Gemini/Mistral/Cerebras en secours de quota) — sous-projet ultérieur (« tenir la charge »).
- Toute modification du barème, des seuils ou du calcul de score.
- Le paramètre `reasoning_effort` n'est envoyé QUE si le modèle est un gpt-oss (garde par préfixe `openai/gpt-oss`) : la décision 5 prévoit un repli possible du débrief sur llama, qui pourrait rejeter ce paramètre.

## Validation

1. Tests unitaires : la règle d'or présente dans recruteur + jury (et sa dominance sur l'attitude), prompts débrief inchangés, corps d'appel Groq contient le bon modèle et le bon `reasoning_effort` par mode.
2. Non-régression : toute la suite existante passe (y compris non-régression octet pour octet de la difficulté — la règle d'or est insérée AVANT le point d'insertion de l'attitude, indépendamment).
3. Réel : un entretien complet (voix ou texte) — chaque réplique du recruteur contient exactement un « ? » et 2-4 phrases ; un débrief réel — score cohérent avec la prestation, preuves = citations exactes.
4. Le juge final est l'utilisateur : entretien avant/après, fluidité et finesse du jeu de rôle.
