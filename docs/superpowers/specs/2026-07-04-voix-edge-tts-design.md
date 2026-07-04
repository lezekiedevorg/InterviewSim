# Voix naturelles gratuites via edge-tts (design)

Date : 2026-07-04
Branche : `feat/voix-edge-tts` (depuis `main`)
Prolonge : la synthèse vocale de l'entretien (solo + jury). Complète, en la
dépassant, la feature « meilleure voix du navigateur ».

## Objectif

Remplacer la voix `speechSynthesis` du navigateur (naturelle seulement sur les
appareils récents, sinon robotique) par de **vraies voix neuronales** de
Microsoft, **gratuites et sans carte**, via `edge-tts`. La voix devient
**naturelle et consistante quel que soit l'appareil**, avec un **repli** sur la
voix navigateur si le service edge n'est pas joignable.

## Contexte

- `edge-tts` (service TTS gratuit de Microsoft Edge, non-officiel, **sans clé**)
  expose des voix neuronales. Le repo `openai-edge-tts` l'emballe en API ; côté
  Node il existe des libs équivalentes (`msedge-tts`).
- **Dé-risque fait (2026-07-04)** : `msedge-tts` a généré ~29 Ko de MP3 français
  (`fr-FR-DeniseNeural`) en ~1,1 s depuis un contexte Node. Lib + protocole +
  token OK, voix FR OK, latence ~1 s/phrase.
- **Risque résiduel** : ça tournait depuis une IP résidentielle ; les IP de
  datacenter (Vercel) sont **parfois bloquées** par Microsoft. Couvert par le
  repli (voir plus bas) → aucune régression même si edge est injoignable.

## Décisions

- **Architecture A** : lib Node (`msedge-tts`) dans une **route Next `/api/tts`**,
  pas de backend Python séparé (rien de plus à héberger, déployé avec l'app).
- **Activé par défaut + filet** : tout le monde a les voix edge ; si edge échoue
  (IP bloquée, erreur, trop lent), repli automatique sur la voix navigateur
  (best-voice déjà en prod). Pas de réglage utilisateur.
- **Sélection du moteur : une seule fois** à l'entrée en réunion (probe). Le
  moteur **principal** choisi vaut pour toute la session (pas de bascule
  permanente en cours de route). Seule exception : si une phrase edge échoue
  ponctuellement, elle peut être lue en secours par la voix navigateur, sans
  changer le moteur principal.
- Nouvelle dépendance **`msedge-tts`** assumée (cœur de la feature ; le protocole
  Edge + token n'est pas réimplémentable en quelques lignes).
- **Pas d'accent africain** (les voix FR edge sont métropolitaines/belges/
  canadiennes) → l'accent africain reste pour le **clonage v2**.

## Architecture

### 1. `app/api/tts/route.ts` (nouveau) — `POST`

- `export const runtime = "nodejs"` (WebSocket sortant + lib Node ; pas Edge runtime).
- Body `{ text: string; voice: string }`.
- Valide : `text` non vide et borné (ex. ≤ 800 caractères, une phrase) ; `voice`
  parmi une liste blanche de voix FR connues (évite d'accepter n'importe quoi).
- Synthétise via `msedge-tts` → renvoie l'audio **MP3** (`Content-Type: audio/mpeg`).
- Timeout court (ex. 8 s) ; toute erreur → statut d'échec (`502`/`500`). Le client
  interprète tout échec comme « edge indisponible » et bascule.

### 2. `lib/edgeVoices.ts` (nouveau, pur) — table de voix

```ts
export const EDGE_SOLO_VOICE = "fr-FR-DeniseNeural";

// persona (lib/jury) → voix edge distincte
export const EDGE_PERSONA_VOICE: Record<PersonaId, string> = {
  rh: "fr-FR-DeniseNeural",
  manager: "fr-FR-HenriNeural",
  expert: "fr-FR-VivienneMultilingualNeural",
};

export const EDGE_VOICE_ALLOWLIST: string[]; // = les voix ci-dessus, pour la route
```

(Noms de voix indicatifs, ajustables au plan/essai.)

### 3. Sélection du moteur + pipeline audio — hook `useVoice` (nouveau)

Un hook unique qui expose la **même interface** que `useSpeech` aujourd'hui
(`supported`, `speak(text, opts?)`, `cancel`, `muted`, `toggleMute`,
`isSpeaking`, `voices`) pour que `MeetingRoom` change à peine.

- **Probe au montage** : un petit appel `/api/tts` (texte court). Succès → moteur
  = `edge` ; échec/timeout → moteur = `browser`. Le moteur ne change plus ensuite.
- **`speak(text, opts?)`** :
  - moteur `edge` : `fetch('/api/tts', { text, voice: opts.voice ?? EDGE_SOLO_VOICE })`
    → l'audio (blob) entre dans une **file** ; on joue via un élément `Audio`,
    une piste à la fois, dans l'ordre d'appel. `isSpeaking` vrai pendant la lecture.
  - moteur `browser` : délègue au chemin actuel (`speechSynthesis`, best-voice +
    `opts.pitch/rate/voice`), inchangé.
- **`cancel` / mute** : arrête la lecture en cours + vide la file (edge) ; ou
  `speechSynthesis.cancel()` (browser).
- `opts` porte, selon le moteur : `voice` (nom de voix edge) **ou**
  `{ pitch, rate, voice: SpeechSynthesisVoice }` (browser). `MeetingRoom` fournit
  les deux à partir du persona courant ; le hook prend ce qui correspond au moteur.

Le `nextSpeakableChunk` (découpe phrase par phrase) est réutilisé tel quel.

### 4. `app/components/meeting/MeetingRoom.tsx` (léger)

- Remplace `useSpeech()` par `useVoice()` (même interface).
- Pour le persona courant (jury), passe **à la fois** la voix edge (`EDGE_PERSONA_VOICE[id]`)
  et les paramètres navigateur (pitch/rate/voix classée) dans `opts` ; le hook
  utilise l'un ou l'autre selon le moteur actif.
- Toute la logique tuile/persona/`parseSpeaker`/préfixe-non-prononcé **ne change pas**.

## Flux de données

```
Entrée réunion → useVoice probe /api/tts
   succès → moteur edge ; échec → moteur navigateur (best-voice)
Recruteur parle (stream) → nextSpeakableChunk(phrase)
   edge:    speak(phrase, {voice}) → POST /api/tts → MP3 → file audio → lecture ordonnée
   browser: speak(phrase, {pitch,rate,voice}) → speechSynthesis (inchangé)
```

## Gestion des erreurs / repli

| Cas | Comportement |
|-----|--------------|
| Probe edge échoue (IP bloquée, réseau) | Session en voix navigateur (best-voice). Aucune régression. |
| `/api/tts` échoue en cours (edge choisi) | La phrase est **lue par la voix navigateur** en secours ; on continue. |
| `speechSynthesis` absent ET edge KO | Pas de voix, transcription lisible (comme aujourd'hui). |
| Texte vide / trop long / voix hors liste | `400` ; côté client on saute (aucun audio). |
| Microsoft coupe le service un jour | Probe échoue → repli navigateur. Le produit continue de parler. |

## Tradeoffs assumés

- **Data mobile** : l'audio se télécharge à chaque entretien (~quelques centaines
  de Ko), bien moins qu'un modèle local (dizaines de Mo), mais réel pour le public
  CI sur data limitée.
- **IP Vercel** : à confirmer sur un **preview Vercel** ; couvert par le repli.
- **Non-officiel** : couvert par le repli.
- **Latence** : ~1 s avant la 1re phrase (génération serveur).

## Tests

- `tests/edgeVoices.test.ts` (nouveau, pur) : `EDGE_PERSONA_VOICE` a une voix
  distincte par persona ; l'allowlist contient bien ces voix.
- Route `/api/tts`, hook `useVoice` (probe, file audio, repli) : **vérif
  navigateur** (audio réel) + **preview Vercel** pour valider l'IP datacenter.

## Fichiers touchés

- `app/api/tts/route.ts` — **nouveau** (synthèse edge → MP3)
- `lib/edgeVoices.ts` — **nouveau** (voix solo + par persona + allowlist)
- `lib/useVoice.ts` — **nouveau** (probe + file audio edge + repli navigateur, interface de `useSpeech`)
- `app/components/meeting/MeetingRoom.tsx` — utilise `useVoice`, fournit voix edge + navigateur par persona
- `tests/edgeVoices.test.ts` — **nouveau**
- `package.json` — +`msedge-tts`
