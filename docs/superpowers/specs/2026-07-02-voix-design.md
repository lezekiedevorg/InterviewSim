# Mode réunion vocal (v1) — Design

**Date :** 2026-07-02
**Sous-projet :** Mode réunion vocal
**Branche :** `feat/voix`

## Objectif

Rendre l'entretien immersif : le candidat vit une vraie visio façon Meet/Teams où le
recruteur IA **parle à voix haute**, plutôt qu'un chat texte. Pour la cible prioritaire
(étudiants qui n'ont jamais passé d'entretien), s'entraîner dans des conditions proches du réel
— voix, posture, gestion du stress — a une vraie valeur pédagogique.

Contrainte directrice : **gratuit d'abord**. La voix utilise la **Web Speech API native du
navigateur** (`speechSynthesis`), sans service payant ni dépendance npm.

## Décisions actées (brainstorm)

- **Écran réunion unique** : le mode réunion **remplace** l'écran de chat de la phase `chat`.
  Il contient déjà le « mode texte » (couper le son + ouvrir la transcription = entretien
  silencieux), donc pas de second écran à maintenir.
- **Sens unique en v1** : le recruteur parle, le candidat **répond au clavier**. Le
  bidirectionnel (réponse à la voix) est reporté (voir « Versions supérieures »).
- **Tuile candidat** : avatar/initiales par défaut, **webcam activable** à la demande
  (`getUserMedia`, 100 % local, rien n'est envoyé).
- **Voix phrase par phrase** : dès qu'une phrase du recruteur est complète dans le flux, on la
  fait parler ; les phrases suivantes s'enfilent dans `speechSynthesis`. Démarrage rapide,
  ressenti « live ».
- **Salon avant l'appel** : un écran « Prêt ? [Rejoindre l'entretien] ». Le clic « Rejoindre »
  débloque l'audio (les navigateurs bloquent l'autoplay sans geste utilisateur).

## Architecture & flux

La phase `chat` de `app/page.tsx` ne rend plus les bulles directement : elle rend
`<MeetingRoom>` en lui passant l'état et les fonctions **existants** (`history`, `streaming`,
`currentAnswer`, `setCurrentAnswer`, `sendAnswer`, `finishInterview`, `errorMsg`). **Aucune
logique de streaming / d'état ne change** — seule la présentation change, plus l'ajout de la
voix.

Sous-flux de la phase `chat` :
1. `MeetingLobby` — « Prêt pour ton entretien ? [Rejoindre l'entretien] ».
2. Au clic « Rejoindre » : on marque l'audio débloqué, on entre dans `MeetingRoom`, et la
   première réplique du recruteur (déjà en cours de streaming) est lue à voix haute.

## Composants & hook

Tous sous `app/components/meeting/`, sauf la logique pure et le hook sous `lib/`.

- **`lib/speech.ts`** — helper **pur** `nextSpeakableChunk(fullText: string, spokenLen: number): { chunk: string; spokenLen: number }`. Extrait la prochaine phrase complète à partir de `spokenLen` (coupe sur `.?!…` et retours ligne), renvoie la phrase et le nouvel offset. Si aucune phrase complète n'est disponible, renvoie `{ chunk: "", spokenLen }` inchangé. Testable en isolation.
- **`lib/useSpeech.ts`** — hook encapsulant `window.speechSynthesis`. Expose :
  - `supported: boolean` (présence de `speechSynthesis`)
  - `speak(text: string): void` (crée une `SpeechSynthesisUtterance`, voix FR si dispo sinon défaut, `lang="fr-FR"`, l'enfile)
  - `cancel(): void`
  - `muted: boolean`, `toggleMute(): void` (couper = `cancel()` + ne plus enfiler)
  - `isSpeaking: boolean` (piloté par les events `start`/`end` des utterances)
- **`MeetingRoom`** — layout façon Meet : grande tuile recruteur, petite tuile candidat, barre de contrôles, panneau transcription optionnel. Observe le texte du recruteur en streaming ; à chaque mise à jour, appelle `nextSpeakableChunk` en boucle et `speak()` chaque nouvelle phrase (sauf si `muted`).
- **`RecruiterTile`** — initiales « RH » + halo/onde animés quand `isSpeaking`.
- **`UserTile`** — avatar/initiales par défaut ; si webcam active, `<video>` local du flux.
- **`MeetingControls`** — couper le son 🔇, transcription/sous-titres 💬, caméra 📷, champ réponse (clavier) + Envoyer, « Terminer l'entretien » ☎️.
- **`TranscriptPanel`** — réutilise le rendu des bulles recruteur/candidat existant ; affiché à la demande.

## Data flow (voix)

1. `streamRecruiter` (inchangé) accumule le texte du recruteur dans `history` au fil du flux.
2. `MeetingRoom` observe le dernier message recruteur en cours ; via `nextSpeakableChunk`, il
   détecte les phrases nouvellement complètes et appelle `speak()` sur chacune (offset mémorisé
   par message pour ne jamais relire).
3. `speechSynthesis` joue les phrases dans l'ordre d'enfilage. `isSpeaking` anime la tuile.
4. Couper le son → `cancel()` + arrêt de l'enfilage. Rétablir → reprend au message suivant.
5. Réponse candidate : champ clavier existant (`currentAnswer` / `sendAnswer`), inchangé.

## Webcam (local, optionnel)

Bouton caméra → `navigator.mediaDevices.getUserMedia({ video: true })` → flux affiché dans
`UserTile` via `<video autoPlay muted playsInline>`. **100 % local, aucun envoi.** Couper la
caméra arrête les tracks (`stream.getTracks().forEach(t => t.stop())`).

## Gestion d'erreurs / dégradation

- `speechSynthesis` absent (vieux navigateur) → `supported=false` : pas de voix, la
  transcription reste utilisable, avis discret « voix non supportée sur ce navigateur ».
- Aucune voix FR installée → voix par défaut (`lang="fr-FR"` quand même).
- Autoplay bloqué → réglé par le geste « Rejoindre ».
- `getUserMedia` refusé / indisponible → on garde l'avatar + message « caméra indisponible »,
  aucun crash.
- Phrases courtes (via le découpage) → évite le bug connu de troncature des longues
  `SpeechSynthesisUtterance` sur certains navigateurs.
- Nettoyage : `cancel()` de la voix et arrêt des tracks caméra quand on quitte la phase `chat`
  (fin d'entretien / démontage).

## Tests

- **Unitaire (Vitest, logique pure)** : `lib/speech.ts` — `nextSpeakableChunk` :
  - découpe une phrase complète et avance l'offset ;
  - ne renvoie rien tant que la phrase en cours est incomplète (pas de fin de flux) ;
  - ne relit jamais une phrase déjà émise ;
  - gère plusieurs phrases d'un coup et la ponctuation `.?!…`.
- **Navigateur (vérification manuelle)** : lobby → Rejoindre → le recruteur parle + tuile
  animée ; couper le son ; ouvrir la transcription ; activer/couper la caméra ; répondre au
  clavier ; terminer → débrief. (Les hooks/composants à API navigateur ne se testent pas en
  unitaire — cohérent avec le projet, pas d'infra de test de composants.)

## Reporté aux versions supérieures (roadmap, pas abandonné)

- **Bidirectionnel** : réponse à la voix via `SpeechRecognition` (mains-libres) — v2.
- **Choix de la voix** dans l'UI (débit, timbre), voix premium payante optionnelle.
- **Enregistrement de l'appel** / relecture.
- Plusieurs personas simultanés (jury) en visio.

## Fichiers touchés

- `lib/speech.ts` (nouveau) + `tests/speech.test.ts` (nouveau)
- `lib/useSpeech.ts` (nouveau)
- `app/components/meeting/MeetingLobby.tsx`, `MeetingRoom.tsx`, `RecruiterTile.tsx`,
  `UserTile.tsx`, `MeetingControls.tsx`, `TranscriptPanel.tsx` (nouveaux)
- `app/page.tsx` (phase `chat` rend `<MeetingLobby>` puis `<MeetingRoom>`)
