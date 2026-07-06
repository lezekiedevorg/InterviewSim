# Mode voix mains-libres (conversation auto) — Design

**Date :** 2026-07-05
**Branche cible :** `feat/voix-mains-libres`
**État départ :** voix v2 push-to-talk (mi-duplex, tour par tour). `useSpeechRecognition` (`fr-FR`, `continuous`, `interimResults`) expose `{ supported, listening, transcript, start, stop, error }`. `MeetingRoom` : le micro est force-stoppé pendant `streaming || isSpeaking` ; le texte reconnu remplit le champ via `mergeTranscript` ; l'envoi est **explicite** (Entrée/bouton `sendAnswer`). Le recruteur parle via `useVoice` (`isSpeaking`).

## Objectif

Rendre la conversation vocale **mains-libres** : après la réponse du recruteur, le micro s'ouvre seul ; quand le candidat se tait, sa réponse part automatiquement ; le recruteur répond ; et ainsi de suite. Sans bouton par tour. **Barge-in exclu** (v2 séparée).

## Décisions

- **Périmètre :** mains-libres uniquement. Couper le recruteur en parlant (barge-in) = hors périmètre.
- **Activation :** bouton à bascule opt-in dans la réunion, **OFF par défaut**. OFF = comportement actuel (push-to-talk + clavier) strictement inchangé.
- **Fin de tour :** silence temporisé (~2,5 s sans nouveaux mots), seuil = constante calibrable.
- **Gratuit :** Web Speech API navigateur, aucune dépendance.

## Flux mains-libres (mode ON, salon rejoint)

1. Le recruteur parle (TTS) ; micro coupé (effet force-stop existant).
2. Dès qu'il a fini (`isSpeaking` false, stabilisé par anti-rebond), le micro **s'ouvre seul** (indicateur « 🎤 À toi… »).
3. Le candidat parle ; le texte reconnu remplit le champ (`mergeTranscript`, déjà en place).
4. **Silence** (plus de nouveaux mots pendant `delayMs`) **et** texte non vide → **envoi auto** (`rec.stop()` puis `sendAnswer()`).
5. Micro coupé, le recruteur répond → retour à l'étape 1.

Envoi manuel (Entrée/bouton) et clavier restent disponibles. Micro non supporté → bouton mains-libres masqué, rien ne change.

## Composants

### 1. `lib/silenceDetector.ts` (nouveau) — cœur temporisé, testé

```
createSilenceDetector(delayMs: number, onFire: (text: string) => void): {
  bump(text: string): void;  // (ré)arme le minuteur ; après delayMs sans bump, si text.trim() non vide → onFire(text)
  cancel(): void;            // annule tout minuteur en cours
}
```

- Aucun accès DOM → testable avec `vi.useFakeTimers()`.
- Le dernier `text` passé à `bump` est celui transmis à `onFire`.
- `bump` avec texte vide : (ré)arme quand même le minuteur mais ne déclenchera pas tant que le texte reste vide au moment du tir (garde `text.trim()` dans le callback interne).

### 2. `MeetingRoom.tsx` (modifié) — câblage

- État `handsFree: boolean` (défaut `false`).
- **Effet « ouvrir le micro »** : si `handsFree && joined && !muted && !streaming && !isSpeaking && !rec.listening && rec.supported`, démarrer un anti-rebond (~400 ms) ; s'il tient (conditions toujours vraies), `baseTextRef.current = currentAnswer` puis `rec.start()`. L'anti-rebond absorbe les micro-coupures d'`isSpeaking` entre phrases du recruteur. Nettoyer le timer si les conditions changent.
- **Détecteur de silence** : `useRef` créé une fois via `createSilenceDetector(SILENCE_MS, onFire)` où `onFire` (via ref vers les dernières valeurs) fait `rec.stop()` puis `sendAnswer()`. Effet : quand `handsFree && rec.listening`, à chaque changement de `rec.transcript`, `detector.bump(currentAnswer)` ; sinon `detector.cancel()`.
- L'effet **force-stop** existant (`(streaming || isSpeaking) && rec.listening → rec.stop()`) est conservé tel quel.
- `SILENCE_MS = 2500` — constante en tête de fichier, commentaire `ponytail:` (bouton de calibration : débit de parole / pauses réelles à régler).

### 3. `MeetingControls.tsx` (modifié) — bouton à bascule

- Nouvelles props `handsFree: boolean`, `onToggleHandsFree: () => void`, `recognitionSupported: boolean` (déjà passée pour le micro).
- Bouton « 🎙️ Mains-libres » (état actif/inactif visible), **rendu seulement si `recognitionSupported`**. Placé près du bouton micro existant.

## Cas limites

- Silence mais texte vide → pas d'envoi (garde `text.trim()`), micro reste ouvert.
- Pause de réflexion > seuil → envoi prématuré possible : atténué par 2,5 s + calibration. Acceptable au MVP.
- Bascule OFF en plein tour → `detector.cancel()` + micro coupé (l'effet d'ouverture ne le rouvre pas, `handsFree` false).
- Envoi manuel en mains-libres → OK ; le micro se rouvre après la réponse du recruteur.
- Permission micro demandée à la 1re ouverture auto (comme le push-to-talk).
- Anti-rebond : si `isSpeaking`/`streaming` repasse à true avant la fin du timer, annuler l'ouverture.

## Tests

- **Pur (vitest + `vi.useFakeTimers`)** — `silenceDetector` :
  - déclenche `onFire(text)` après `delayMs` sans `bump` ;
  - un `bump` avant l'échéance **réarme** (pas de tir prématuré) ;
  - texte vide → pas de tir ;
  - `cancel()` empêche le tir ;
  - `onFire` reçoit le dernier `text` passé à `bump`.
- **Vérif navigateur (micro live)** : boucle complète recruteur → micro auto → parole → silence → envoi auto → recruteur ; bascule ON/OFF ; OFF = comportement inchangé ; micro non supporté = bouton absent.

## Hors périmètre (YAGNI)

- Barge-in / couper le recruteur (v2 séparée).
- Détection de tour par modèle (le silence temporisé suffit).
- Réglage du seuil dans l'UI (constante calibrable en code).
- Annulation d'un envoi auto par décompte visible (pas au MVP).
