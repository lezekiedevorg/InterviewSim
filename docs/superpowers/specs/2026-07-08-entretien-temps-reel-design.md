# Entretien en temps réel — barge-in + direct « live »

**Date :** 2026-07-08
**Branche :** `feat/ia-entretien` (ou branche dédiée `feat/entretien-realtime`)

## Objectif

Rendre l'échange de l'entretien plus vivant et interactif, façon appel téléphonique,
**sans quitter la stack 100 % gratuite** (STT navigateur Web Speech, LLM streaming
gpt-oss-120b, TTS Edge). Quatre frustrations à traiter :

1. On ne peut pas couper la parole de l'IA (barge-in).
2. Trop de blancs après avoir parlé.
3. Le ressenti « tour par tour » figé.
4. Pas de feedback visuel du direct (écoute / réfléchit / parle).

## Contraintes (rappel)

- **Coût : 0 €.** Pas d'API realtime payante (OpenAI Realtime / Gemini Live rejetés :
  coût ou quota + audio lourd en data).
- **Data mobile légère.** On continue d'échanger du **texte** (STT dans le navigateur)
  et des **petits blobs TTS**, pas de flux audio bidirectionnel.
- **Cible souvent sans casque** → le barge-in a un plafond d'écho ; il doit être
  **désactivable** et **OFF par défaut**.
- **Zéro nouvelle dépendance.** Web Audio natif suffit.

## Décision sur l'open source

Évalué : pipecat-ai (BSD, vraiment libre), openai/realtime-voice-component (payant),
Barty-Bart/…V2 (OpenAI Realtime + Twilio + Make, payant). **Rejetés** : les deux OpenAI
sont payants ; pipecat est libre en licence mais « local » = héberger l'inférence
(Whisper + Ollama + Piper) sur un serveur → CPU gratuit trop lent, GPU = VPS payant
(même mur NO-GO que le clonage de voix), et il stream de l'audio (lourd en data).
Seule brique empruntable plus tard : **Silero VAD en WASM côté navigateur** pour une
détection de parole plus fine — **différé**, on commence par une porte d'énergie native.

## Architecture

Tout se joue côté client. L'orchestration existe déjà dans `MeetingRoom.tsx`
(streaming, TTS phrase par phrase, STT, détection de silence, mains-libres). On ajoute
4 choses.

### 1. Machine à états « live » (dérivée, pas de nouvel état source)

État conversationnel dérivé des signaux existants :

| État | Condition | Affichage |
|---|---|---|
| **Réfléchit** | `streaming && !isSpeaking` | onde ambre + « réfléchit… » |
| **Parle** | `isSpeaking` | pastille ambre pleine + « au tour de l'IA » |
| **Écoute** | `rec.listening` | pastille rouge pulsée + « je t'écoute » |
| **En pause** | sinon | discret |

Une pastille d'état au-dessus des contrôles. C'est le principal remède *perceptif* aux
blancs : pendant que le modèle réfléchit, l'utilisateur voit que ça travaille.
Marche même sans casque. Rendu dans `MeetingRoom` (au-dessus de `MeetingControls`).

### 2. Barge-in (couper la parole), activable — porte d'énergie

Le piège c'est l'écho : Web Speech capterait la voix de l'IA. Design retenu — **la
reconnaissance ne démarre qu'APRÈS la coupure** :

- Pendant que l'IA parle, Web Speech reste **OFF**.
- En parallèle : capteur d'énergie léger — `getUserMedia({ audio: { echoCancellation: true,
  noiseSuppression: true } })` + `AnalyserNode` (Web Audio natif). Mesure le volume RMS.
- Détection d'une **vraie prise de parole soutenue** (énergie > seuil pendant ~150 ms,
  pas un pic d'écho) → `cancel()` TTS **immédiatement**, puis ouverture de Web Speech.
  L'IA est silencieuse à partir de là → capture propre.
- **Rançon assumée** : le premier mot déclencheur n'est pas transcrit (l'utilisateur
  enchaîne naturellement).

Actif seulement quand `bargeIn && isSpeaking && !muted`. Le flux `getUserMedia` est
acquis à l'activation du barge-in et relâché à sa désactivation / au démontage.

### 3. Endpointing plus court

`SILENCE_MS` : 2500 → **~1200 ms**, en **constante calibrable** (commentaire `ponytail:`,
réglage humain — débit de parole). Pas d'UI, pas d'« adaptatif » spéculatif. Le blanc
résiduel (latence du modèle gratuit) est masqué par la pastille « réfléchit ».

### 4. Contrôles

Dans `MeetingControls` : une pilule bascule **« Couper la parole »** (OFF par défaut) +
la pastille d'état. Quand barge-in ON, hint : « 🎧 mets un casque pour bien couper la
parole ».

## Fichiers

**Nouveaux (2) :**

- `lib/voiceGate.ts` — détecteur **pur, testable**, calqué sur `silenceDetector.ts` :
  `createVoiceGate(seuilRms, sustainMs)` → `{ feed(energie, now): boolean }`. Renvoie
  `true` au franchissement (parole soutenue confirmée), pas sur un pic isolé. Sans accès
  DOM → testable aux faux timers.
- `lib/useMicEnergy.ts` — hook Web Audio : `getUserMedia` + `AnalyserNode`, boucle
  `requestAnimationFrame` qui calcule le RMS et le passe au `voiceGate` ; appelle
  `onSpeech()` au franchissement. Signature ~ `useMicEnergy({ active, onSpeech })`.

**Modifiés (3) :**

- `MeetingRoom.tsx` — flag `bargeIn` (state), dérivation de l'état live, câblage de
  `useMicEnergy`. Conditionne les 2 effets micro existants par `bargeIn` :
  - réouverture auto (l.118) : inchangée hors barge-in ;
  - coupure forcée pendant `isSpeaking` (l.134-136) : ne plus couper « pour toujours »
    quand barge-in permet la reprise (la reprise passe par `onSpeech`).
  Abaisse `SILENCE_MS`. **Barge-in OFF → comportement actuel strictement intact.**
- `MeetingControls.tsx` — pilule bascule + pastille d'état (props : `bargeIn`,
  `onToggleBargeIn`, `liveState`).
- (constante `SILENCE_MS` dans `MeetingRoom`.)

**Zéro dépendance. Zéro coût. Data inchangée.**

## Gestion d'erreurs / cas limites

- **Refus micro** pour le capteur d'énergie → barge-in se désactive silencieusement,
  message doux ; le reste de l'entretien continue (STT et TTS indépendants).
- **`getUserMedia` indisponible / non sécurisé (http)** → pilule barge-in masquée
  ou désactivée, comme `recognitionSupported`.
- **Deux flux micro concurrents** (Web Speech + AnalyserNode) : autorisé par les
  navigateurs sur le même périphérique ; permission déjà accordée via Web Speech → pas
  de 2ᵉ prompt.
- **Faux positif d'écho** (barge-in coupe l'IA à tort) : le seuil + le sustain de 150 ms
  sont les garde-fous, réglables ; sans casque ça reste imparfait, d'où OFF par défaut
  et le hint casque.
- **Démontage pendant l'écoute / la parole** : relâcher le flux d'énergie et annuler
  timers (comme le nettoyage existant du `silenceDetector`).

## Tests

- `voiceGate` : test unitaire pur (faux timers) — pic isolé sous le sustain ⇒ pas de
  déclenchement ; énergie soutenue au-delà du sustain ⇒ un seul `true` au franchissement ;
  retour sous le seuil ⇒ réarmement.
- Le reste (hook Web Audio, câblage React) : vérification manuelle en entretien réel
  (barge-in ON avec casque : couper l'IA marche ; barge-in OFF : rien ne change).

## Hors périmètre (YAGNI / différé)

- Silero VAD WASM (upgrade de la porte d'énergie) — seulement si l'écho gêne trop.
- Endpointing adaptatif, réglages d'utilisateur pour les seuils.
- Vraie API realtime bidirectionnelle (coût + data).

## Chemin d'upgrade v2 — LiveKit (à la reprise VPS)

Le vrai temps réel « ChatGPT Voice » = **LiveKit Agents + WebRTC** (standard industrie) :
audio bidirectionnel instantané, VAD serveur, interruption fiable **même sans casque**,
STT streaming (Whisper via Groq / Deepgram) → LLM → TTS streaming (Kokoro local /
ElevenLabs). Meilleur ressenti possible.

**Pourquoi différé, pas maintenant :** chaque brique réintroduit le coût qu'on fuit —
LiveKit Agents tourne sur un **serveur** + serveur média WebRTC (Cloud = quota serré,
self-host = **VPS 24/7**) ; WebRTC = **audio continu = lourd en data mobile** (l'inverse
de notre contrainte) ; Deepgram/ElevenLabs payants ; Kokoro « local » = on héberge
l'inférence (GPU/CPU = VPS). C'est le **même mur NO-GO CPU gratuit → reprise au VPS** que
le clonage de voix.

**Déclencheur :** à activer en même temps que la reprise VPS / la monétisation (freemium).
Le plan gratuit actuel livre déjà 3 des 4 besoins (pastille live, blancs réduits, barge-in)
à 0 € et sans data ; LiveKit n'apporte de net que le barge-in fiable sans casque + la
robustesse hors Chrome, au prix d'un VPS + data.
