# Voix v2 — réponse en push-to-talk (design)

Date : 2026-07-03
Branche : `feat/voix-v2`
Suite de : Voix v1 (mode réunion vocal, le recruteur parle). Voir `2026-07-02-voix-design.md`.

## Objectif

Permettre au candidat de **répondre à la voix** pendant l'entretien, au lieu de
taper. La reconnaissance vocale ne fait que **remplir le champ de réponse
existant** : le flux d'envoi de v1 reste identique.

## Périmètre

**Dans ce spec :** répondre à la voix (push-to-talk).

**Hors périmètre (plus tard, chacun son cycle) :**
- Choix de la voix du recruteur dans l'UI.
- Enregistrement de l'appel.
- Barge-in (couper le recruteur en parlant).

## Décisions

- **Modèle d'interaction : push-to-talk.** Le micro remplit le `textarea` ;
  l'envoi reste **explicite** (Entrée / bouton « Envoyer »). Pas d'envoi auto.
- **Déclenchement : toggle.** Clic pour activer l'écoute, clic pour l'arrêter
  (pas de maintien). Robuste sur mobile et desktop.
- **Résultats en direct.** Le texte reconnu s'affiche au fil de la parole dans
  le `textarea` (`interimResults`).
- **Micro bloqué pendant que le recruteur parle.** Le bouton micro est
  désactivé tant que `isSpeaking` (évite de capter la voix synthétique via les
  haut-parleurs). On ne coupe pas la parole au recruteur.
- **Langue : `fr-FR`** (aligné sur la voix du recruteur).
- **Fallback :** navigateur sans `SpeechRecognition` (Firefox, Safari desktop)
  → pas de bouton micro, la frappe clavier reste (filet déjà présent en v1).

## Architecture

### 1. `lib/useSpeechRecognition.ts` (nouveau)

Hook miroir de `useSpeech`, une seule responsabilité : la reconnaissance.

- Wrappe `window.SpeechRecognition ?? window.webkitSpeechRecognition`.
- Config : `lang = "fr-FR"`, `interimResults = true`, `continuous = true`
  (le toggle garde l'écoute à travers les pauses jusqu'au clic d'arrêt).
- Expose :
  ```ts
  {
    supported: boolean;
    listening: boolean;
    transcript: string;   // final + intermédiaire agrégé, remis à "" à start()
    start: () => void;
    stop: () => void;
    error: string | null; // message FR prêt à afficher, null si OK
  }
  ```
- Gestion d'erreurs via `recognition.onerror` :
  - `not-allowed` / `service-not-allowed` → « Micro refusé — autorise l'accès au
    micro dans le navigateur. »
  - `no-speech` → message doux (« Je n'ai rien entendu, réessaie. »), non bloquant.
- Nettoie l'instance au démontage (`stop()` + retrait des handlers), comme
  `useSpeech` fait `cancel()`.

### 2. `lib/speech.ts` — `mergeTranscript(base, transcript)` (nouveau)

Helper **pur** : combine le texte déjà présent dans le champ (tapé avant de
lancer le micro) avec le texte reconnu.

- `mergeTranscript("", "bonjour")` → `"bonjour"`
- `mergeTranscript("Bonjour,", "je suis dev")` → `"Bonjour, je suis dev"`
  (une seule espace de jointure, pas d'espace en tête si `base` vide, gère
  `base` finissant déjà par une espace).

### 3. `app/components/meeting/MeetingRoom.tsx`

- Instancie `useSpeechRecognition`.
- Au **démarrage** de l'écoute : mémorise `baseText = currentAnswer` (ref).
- Pendant l'écoute (`transcript` change) :
  `setCurrentAnswer(mergeTranscript(baseText, transcript))`.
- À l'**arrêt** : le texte final reste dans le champ ; l'utilisateur relit,
  corrige, envoie.
- Passe à `MeetingControls` : `recognitionSupported`, `listening`,
  `onToggleMic`, et le blocage `micDisabled = streaming || isSpeaking`.
- `error` de reconnaissance affiché dans le même bandeau que `errorMsg`.

### 4. `app/components/meeting/MeetingControls.tsx`

- Nouveau pill 🎤, **affiché seulement si `recognitionSupported`**.
- `disabled` si `streaming || isSpeaking`.
- État visuel « en écoute » (ex. rouge pulsé) quand `listening`.
- `textarea` et bouton « Envoyer » inchangés.

## Flux de données

```
[clic micro] → start()  → baseText = currentAnswer
   parole → transcript ↑ → setCurrentAnswer(mergeTranscript(baseText, transcript))  (live dans le textarea)
[clic micro] → stop()   → texte final figé dans le champ
   [Entrée / Envoyer]   → sendAnswer()  (flux v1 inchangé)
```

Le recruteur parle (`isSpeaking = true`) → bouton micro désactivé.

## Gestion des erreurs

| Cas | Comportement |
|-----|--------------|
| `SpeechRecognition` absent | Pas de bouton micro ; frappe clavier. |
| Permission micro refusée | Bandeau « Micro refusé — autorise l'accès… », `listening = false`. |
| Aucune parole détectée | Message doux, non bloquant, l'utilisateur peut retenter ou taper. |
| Recruteur parle | Bouton micro désactivé. |

## Tests

- `tests/speech.test.ts` : cas de `mergeTranscript` (base vide, base avec/ sans
  espace finale, transcript vide). C'est la seule logique pure ajoutée.
- Le hook `useSpeechRecognition` repose sur l'API navigateur → **vérification
  navigateur manuelle** (comme `useSpeech` en v1) : activer le micro, parler,
  voir le texte en direct, arrêter, envoyer ; vérifier le blocage pendant que
  le recruteur parle et le fallback clavier.

## Fichiers touchés

- `lib/useSpeechRecognition.ts` — **nouveau**
- `lib/speech.ts` — +`mergeTranscript`
- `app/components/meeting/MeetingRoom.tsx` — câblage micro
- `app/components/meeting/MeetingControls.tsx` — bouton micro
- `tests/speech.test.ts` — +tests `mergeTranscript`
