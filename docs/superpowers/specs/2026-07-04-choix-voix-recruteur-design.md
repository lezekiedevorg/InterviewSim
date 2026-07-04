# Choix de la voix du recruteur — Design

**Date :** 2026-07-04
**Branche cible :** `feat/choix-voix-recruteur`
**État départ :** voix solo figée (`fr-FR-DeniseNeural`), jury à 3 voix fixes (`EDGE_PERSONA_VOICE`), moteur edge-tts avec repli navigateur (`useVoice`).

## Objectif

Laisser l'utilisateur choisir la voix du recruteur avant l'entretien, en solo comme en jury, gratuitement (edge-tts), avec mémorisation du dernier choix.

## Décisions

- **Périmètre :** solo **et** jury.
- **Emplacement :** dans le salon (`MeetingLobby`), avant de rejoindre.
- **Jury :** choix par **packs prédéfinis** (chaque pack = 3 voix distinctes assorties), pas de choix par-persona individuel.
- **Mémoire :** `localStorage` (pas de base, marche sans compte).
- **Aperçu :** bouton ▶ « Écouter » (edge-tts gratuit).

## Composants

### 1. Données — `lib/edgeVoices.ts` (étendu)

- `EDGE_SOLO_VOICES: { id: string; label: string; voice: string }[]` — ~4 voix H/F :
  - `Denise` (femme, défaut) · `Henri` (homme) · `Vivienne` (femme) · `Remy` (homme).
- `EDGE_JURY_PACKS: { id: string; label: string; voices: Record<PersonaId, string> }[]` :
  - `Pack 1` (défaut) = rh Denise / manager Henri / expert Vivienne (= l'actuel `EDGE_PERSONA_VOICE`).
  - `Pack 2` = autre combinaison à 3 voix distinctes.
- `EDGE_VOICE_ALLOWLIST` — **recalculée** = union de `EDGE_SOLO_VOICES` + toutes les voix des packs. La route `/api/tts` valide déjà contre cette liste → **aucun changement serveur**.
- Défauts exportés : `DEFAULT_SOLO_VOICE_ID`, `DEFAULT_JURY_PACK_ID`.

> À vérifier à l'implémentation : chaque nom de voix existe bien dans `msedge-tts` (repli défaut sinon).

### 2. Préférence persistée — `lib/voicePrefs.ts` (nouveau, ~15 lignes)

- `getVoicePref(): { soloId: string; packId: string }` — lit `localStorage` (`interviewsim.voice.solo`, `interviewsim.voice.juryPack`). **Valide** contre `EDGE_SOLO_VOICES` / `EDGE_JURY_PACKS` ; valeur inconnue/absente → défaut.
- `setVoicePref(partial)` — écrit la/les clé(s).
- Sans accès `window` (SSR) → renvoie les défauts sans planter.

### 3. UI — `MeetingLobby.tsx` (étendu)

Nouvelles props : `engine`, `ready`, `jury`, `soloId`, `packId`, `onChangeSolo`, `onChangePack`, `onPreview`.

- **Affiché uniquement si `engine === "edge"`** (repli navigateur → sélecteur masqué, aucune régression).
- Mode solo : `<select>` « Voix du recruteur » = `EDGE_SOLO_VOICES`.
- Mode jury : `<select>` « Voix du jury » = `EDGE_JURY_PACKS`.
- Bouton ▶ « Écouter » : `onPreview()`, **désactivé tant que `!ready`**.

### 4. Câblage — `MeetingRoom.tsx`

- État `soloId` / `packId`, **initialisés depuis `getVoicePref()`** ; chaque changement appelle `setVoicePref()`. L'état vit dans `MeetingRoom` (parent du lobby) → **survit au passage salon → entretien**.
- `voiceOptsFor` (jury) lit les voix depuis le pack sélectionné au lieu de `EDGE_PERSONA_VOICE`.
- Recruteur solo : `edgeVoice` = voix du `soloId` sélectionné au lieu du `EDGE_SOLO_VOICE` figé.
- **Aperçu** : réutilise `speak()` de `useVoice` (la file gère l'enchaînement). Solo = une phrase ; jury = une réplique courte par voix du pack (démontre la distinction). Pas de nouveau chemin audio.

## Flux

1. `MeetingRoom` monte → `useVoice` sonde le moteur (`probing` → `edge`/`browser`), état voix init depuis `localStorage`.
2. Salon : si edge, l'utilisateur choisit + peut écouter ; le choix est persisté immédiatement.
3. Rejoindre → l'entretien fait parler le recruteur avec la voix/pack sélectionné.

## Cas limites

- localStorage inconnu/corrompu → repli défaut.
- Invariant : toute voix proposée (solo + packs) ∈ `EDGE_VOICE_ALLOWLIST` → acceptée par `/api/tts`.
- Repli navigateur → sélecteur masqué, chemin best-voice inchangé.
- Aperçu avant moteur décidé (`!ready`) → bouton désactivé.

## Tests (suivent l'existant, pas de framework nouveau)

- `voicePrefs` : get/set/validation (valeur inconnue → défaut ; SSR sans `window` → défaut).
- Invariant : chaque voix de `EDGE_SOLO_VOICES` et de chaque pack ∈ `EDGE_VOICE_ALLOWLIST`.
- Vérif navigateur : sélection + aperçu + persistance au rechargement, solo et jury.

## Hors périmètre (YAGNI)

- Choix par-persona individuel (packs suffisent).
- Réglage pitch/rate exposé à l'utilisateur.
- Stockage en base (localStorage suffit, marche sans compte).
- Voix côté repli navigateur (moteur best-voice inchangé).
