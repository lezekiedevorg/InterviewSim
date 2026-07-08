# Entretien en temps réel — barge-in + direct « live » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre l'échange de l'entretien plus vivant (couper la parole de l'IA, moins de blancs, feedback visuel en direct) sans quitter la stack 100 % gratuite du navigateur.

**Architecture:** Tout se joue côté client dans `MeetingRoom.tsx`, qui orchestre déjà streaming LLM + TTS Edge + STT Web Speech + détection de silence. On ajoute (1) un détecteur pur `voiceGate` qui distingue une vraie prise de parole d'un pic d'écho, (2) un hook Web Audio `useMicEnergy` qui mesure le volume du micro et déclenche le barge-in, (3) une pastille d'état « live » dérivée des signaux existants, (4) un endpointing plus court. Aucune modification des deux effets micro existants n'est nécessaire : `cancel()` fait basculer `isSpeaking` à false dans le même rendu que l'ouverture du micro, donc l'effet de coupure forcée laisse passer.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Web Audio API (natif), Web Speech API, Edge TTS. Tests : Vitest.

## Global Constraints

- **Coût : 0 €.** Aucune API realtime payante, aucun service tiers.
- **Zéro nouvelle dépendance.** Web Audio natif uniquement.
- **Data mobile inchangée** : on échange du texte (STT navigateur) + petits blobs TTS, jamais de flux audio.
- **Barge-in OFF par défaut** (cible souvent sans casque → écho imparfait). Toggle explicite.
- **Quand barge-in est OFF, le comportement actuel de l'entretien reste strictement intact.**
- Langue de l'UI et des commentaires : **français** (cohérent avec le reste du code).
- Typecheck : `npx tsc --noEmit`. Tests : `npm test` (vitest run).

---

### Task 1: `voiceGate` — détecteur pur « vraie parole vs écho »

Détecteur sans accès DOM, calqué sur `lib/silenceDetector.ts`. Il reçoit des mesures de volume RMS horodatées et renvoie `true` **une seule fois**, au moment où le volume est resté au-dessus du seuil pendant `sustainMs` (parole soutenue confirmée). Retombe sous le seuil → réarme.

**Files:**
- Create: `lib/voiceGate.ts`
- Test: `tests/voiceGate.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces: `createVoiceGate(rmsThreshold: number, sustainMs: number): { feed(rms: number, now: number): boolean; reset(): void }`

- [ ] **Step 1: Write the failing test**

Create `tests/voiceGate.test.ts` (pas de faux timers : on passe `now` explicitement) :

```ts
import { describe, it, expect } from "vitest";
import { createVoiceGate } from "../lib/voiceGate";

describe("createVoiceGate", () => {
  it("ne déclenche pas sur un pic isolé plus court que sustainMs", () => {
    const g = createVoiceGate(0.06, 150);
    expect(g.feed(0.2, 0)).toBe(false);   // au-dessus du seuil, t=0
    expect(g.feed(0.2, 100)).toBe(false); // 100 ms < 150 ms
    expect(g.feed(0.0, 120)).toBe(false); // retombe sous le seuil → réarme
    expect(g.feed(0.0, 300)).toBe(false);
  });

  it("déclenche une seule fois quand le volume tient au-delà de sustainMs", () => {
    const g = createVoiceGate(0.06, 150);
    expect(g.feed(0.2, 0)).toBe(false);
    expect(g.feed(0.2, 150)).toBe(true);  // franchissement
    expect(g.feed(0.2, 200)).toBe(false); // déjà déclenché, pas de re-tir
    expect(g.feed(0.2, 400)).toBe(false);
  });

  it("réarme après être retombé sous le seuil, puis peut re-déclencher", () => {
    const g = createVoiceGate(0.06, 150);
    g.feed(0.2, 0);
    expect(g.feed(0.2, 150)).toBe(true);
    expect(g.feed(0.0, 160)).toBe(false); // silence → réarme
    expect(g.feed(0.2, 200)).toBe(false); // nouveau départ du compteur
    expect(g.feed(0.2, 350)).toBe(true);  // re-franchissement
  });

  it("reset() efface l'état en cours (pas de tir résiduel)", () => {
    const g = createVoiceGate(0.06, 150);
    g.feed(0.2, 0);
    g.reset();
    expect(g.feed(0.2, 100)).toBe(false); // le compteur est reparti de 100
    expect(g.feed(0.2, 250)).toBe(true);
  });

  it("un volume juste sous le seuil ne compte pas", () => {
    const g = createVoiceGate(0.06, 150);
    expect(g.feed(0.05, 0)).toBe(false);
    expect(g.feed(0.05, 500)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/voiceGate.test.ts`
Expected: FAIL — `createVoiceGate` introuvable (module `lib/voiceGate` inexistant).

- [ ] **Step 3: Write minimal implementation**

Create `lib/voiceGate.ts` :

```ts
// Porte de parole : distingue une vraie prise de parole d'un pic d'écho.
// feed(rms, now) renvoie true UNE fois, quand le volume est resté au-dessus
// de rmsThreshold pendant au moins sustainMs. Retombe sous le seuil → réarme.
// Aucun accès DOM ni timer : testable en passant `now` explicitement.
export function createVoiceGate(
  rmsThreshold: number,
  sustainMs: number
): { feed(rms: number, now: number): boolean; reset(): void } {
  let aboveSince: number | null = null;
  let fired = false;

  function reset(): void {
    aboveSince = null;
    fired = false;
  }

  function feed(rms: number, now: number): boolean {
    if (rms < rmsThreshold) {
      reset(); // silence → on réarme pour la prochaine prise de parole
      return false;
    }
    if (aboveSince === null) aboveSince = now;
    if (!fired && now - aboveSince >= sustainMs) {
      fired = true; // franchissement : un seul true par salve
      return true;
    }
    return false;
  }

  return { feed, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/voiceGate.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/voiceGate.ts tests/voiceGate.test.ts
git commit -m "feat(realtime): voiceGate — détecteur pur vraie parole vs écho"
```

---

### Task 2: `useMicEnergy` — hook Web Audio qui déclenche le barge-in

Hook client qui, quand `enabled`, ouvre un flux micro avec annulation d'écho + suppression de bruit, calcule le volume RMS en continu, et — quand `listening` est vrai — le passe au `voiceGate` ; au franchissement, appelle `onSpeech()`. Le flux et le graphe audio sont tenus tant que `enabled` (pas de ré-acquisition à chaque réplique) ; le `voiceGate` n'est nourri que pendant `listening` et est réarmé dès que `listening` retombe.

Pas de test unitaire automatisé (le hook enveloppe des API navigateur non simulables utilement en jsdom ; vérification manuelle en entretien réel, cf. spec). La vérification de cette tâche est le typecheck.

**Files:**
- Create: `lib/useMicEnergy.ts`
- Test: — (vérification manuelle + `npx tsc --noEmit`)

**Interfaces:**
- Consumes: `createVoiceGate` de `lib/voiceGate` (Task 1).
- Produces:
  ```ts
  useMicEnergy(opts: {
    enabled: boolean;
    listening: boolean;
    onSpeech: () => void;
    thresholdRms?: number; // défaut 0.06
    sustainMs?: number;    // défaut 150
  }): { supported: boolean; error: string | null }
  ```

- [ ] **Step 1: Write the hook**

Create `lib/useMicEnergy.ts` :

```ts
"use client";

import { useEffect, useRef, useState } from "react";
import { createVoiceGate } from "./voiceGate";

// ponytail: seuils de calibration — dépendent du micro/débit réel (à régler à l'usage,
// avant de sortir l'artillerie Silero VAD). 0.06 RMS ≈ voix nette ; 150 ms ≈ salve, pas un pic.
const DEFAULT_THRESHOLD_RMS = 0.06;
const DEFAULT_SUSTAIN_MS = 150;

type Opts = {
  enabled: boolean;
  listening: boolean;
  onSpeech: () => void;
  thresholdRms?: number;
  sustainMs?: number;
};

export function useMicEnergy({
  enabled,
  listening,
  onSpeech,
  thresholdRms = DEFAULT_THRESHOLD_RMS,
  sustainMs = DEFAULT_SUSTAIN_MS,
}: Opts): { supported: boolean; error: string | null } {
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs vers les valeurs courantes : le graphe audio (créé une fois par `enabled`)
  // les lit sans réarmer l'effet à chaque rendu.
  const listeningRef = useRef(listening);
  listeningRef.current = listening;
  const onSpeechRef = useRef(onSpeech);
  onSpeechRef.current = onSpeech;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const AC = window.AudioContext ?? (window as any).webkitAudioContext;
    const hasGUM = !!navigator.mediaDevices?.getUserMedia;
    if (!AC || !hasGUM) {
      setSupported(false);
      return;
    }
    setSupported(true);
    if (!enabled) return;

    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;
    const gate = createVoiceGate(thresholdRms, sustainMs);

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        ctx = new AC();
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const buf = new Uint8Array(analyser.fftSize);

        const tick = () => {
          if (cancelled) return;
          if (listeningRef.current) {
            analyser.getByteTimeDomainData(buf);
            // RMS de l'écart au centre (128) normalisé sur [0,1].
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
              const v = (buf[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / buf.length);
            if (gate.feed(rms, performance.now())) onSpeechRef.current();
          } else {
            gate.reset(); // pas en écoute → on réarme pour la prochaine salve
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setError("Micro refusé — le barge-in est désactivé.");
      }
    })();

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      void ctx?.close();
    };
  }, [enabled, thresholdRms, sustainMs]);

  return { supported, error };
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (aucune erreur liée à `lib/useMicEnergy.ts`).

- [ ] **Step 3: Commit**

```bash
git add lib/useMicEnergy.ts
git commit -m "feat(realtime): useMicEnergy — capteur de volume micro pour le barge-in"
```

---

### Task 3: `MeetingControls` — pastille d'état « live » + bascule barge-in

Ajoute (a) une pastille qui affiche l'état conversationnel courant, (b) une pilule bascule « Couper la parole » avec un hint casque quand elle est active. Les nouvelles props sont **optionnelles** pour que `MeetingRoom` (non encore modifié) continue de compiler ; Task 4 les câblera.

**Files:**
- Modify: `app/components/meeting/MeetingControls.tsx`
- Modify: `app/components/ui/icons.tsx` (ajout d'une icône main levée)
- Test: — (`npx tsc --noEmit`)

**Interfaces:**
- Consumes: rien de nouveau.
- Produces (nouvelles props de `MeetingControls`, toutes optionnelles) :
  ```ts
  liveState?: LiveState;          // "idle" | "thinking" | "speaking" | "listening"
  bargeIn?: boolean;
  onToggleBargeIn?: () => void;
  bargeInSupported?: boolean;
  ```
  + export du type : `export type LiveState = "idle" | "thinking" | "speaking" | "listening";`

- [ ] **Step 1: Ajouter l'icône main levée**

Dans `app/components/ui/icons.tsx`, ajoute après `PlayIcon` (Lucide `hand`, MIT) :

```tsx
export function HandIcon(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2" />
      <path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2" />
      <path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8" />
      <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
    </Svg>
  );
}
```

- [ ] **Step 2: Étendre `MeetingControls` (type, props, pastille + bascule)**

Dans `app/components/meeting/MeetingControls.tsx` :

a) Importer l'icône — remplacer la ligne `SendIcon,` de l'import d'icônes pour ajouter `HandIcon` :

```tsx
  SendIcon,
  HandIcon,
```

b) Juste avant `type Props = {`, ajouter le type exporté :

```tsx
export type LiveState = "idle" | "thinking" | "speaking" | "listening";

const LIVE_LABEL: Record<LiveState, string> = {
  idle: "En pause",
  thinking: "L'IA réfléchit…",
  speaking: "Au tour de l'IA",
  listening: "Je t'écoute",
};
```

c) Dans `type Props = { … }`, ajouter les 4 props optionnelles avant la `}` fermante :

```tsx
  liveState?: LiveState;
  bargeIn?: boolean;
  onToggleBargeIn?: () => void;
  bargeInSupported?: boolean;
```

d) Dans la déstructuration des paramètres de `MeetingControls({ … })`, ajouter avant la `}` :

```tsx
  liveState = "idle",
  bargeIn = false,
  onToggleBargeIn,
  bargeInSupported = false,
```

e) Juste après le `<div className="flex flex-col gap-3">` ouvrant du `return`, insérer la pastille d'état :

```tsx
      <div className="flex items-center justify-center">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200 ${
            liveState === "listening"
              ? "bg-danger-600/15 text-danger-400"
              : liveState === "speaking"
              ? "bg-amber-400/15 text-amber-300"
              : liveState === "thinking"
              ? "bg-amber-400/10 text-amber-400"
              : "bg-night-700 text-faint ring-1 ring-cream/15"
          }`}
          aria-live="polite"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              liveState === "listening"
                ? "animate-pulse bg-danger-400"
                : liveState === "speaking"
                ? "bg-amber-400"
                : liveState === "thinking"
                ? "animate-pulse bg-amber-400"
                : "bg-cream/30"
            }`}
            aria-hidden
          />
          {LIVE_LABEL[liveState]}
        </span>
      </div>
```

f) Dans la rangée de pilules (`<div className="flex flex-wrap items-center justify-center gap-2">`), juste après le bloc `{recognitionSupported && ( … Mains-libres … )}`, insérer la bascule barge-in :

```tsx
        {bargeInSupported && (
          <button
            type="button"
            onClick={onToggleBargeIn}
            aria-pressed={bargeIn}
            aria-label="Couper la parole de l'IA"
            className={`${pill} ${bargeIn ? pillOn : pillOff}`}
          >
            <HandIcon />
            <span className={pillLabel}>Couper la parole</span>
          </button>
        )}
```

g) Juste avant la fermeture `</div>` de la rangée de pilules (après le bouton « Terminer »), rien à faire ; à la place, sous la rangée de pilules (après son `</div>` fermant, avant le `<div className="flex items-end gap-2.5">` du champ texte), ajouter le hint casque :

```tsx
      {bargeIn && (
        <p className="text-center text-[12px] text-faint">
          🎧 Mets un casque pour bien couper la parole (sans casque, l'écho gêne).
        </p>
      )}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. `MeetingRoom` compile encore car les nouvelles props sont optionnelles.

- [ ] **Step 4: Commit**

```bash
git add app/components/meeting/MeetingControls.tsx app/components/ui/icons.tsx
git commit -m "feat(realtime): pastille d'état live + bascule barge-in dans MeetingControls"
```

---

### Task 4: `MeetingRoom` — câblage barge-in, état live, endpointing

Ajoute l'état `bargeIn`, dérive `liveState`, branche `useMicEnergy` (interruption = `cancel()` du TTS puis ouverture du micro), abaisse `SILENCE_MS`, et transmet les nouvelles props à `MeetingControls`. **Aucune modification des deux effets micro existants** : `cancel()` fait passer `isSpeaking` à false dans le même rendu que `rec.start()`, donc l'effet de coupure forcée (l.134-136) ne stoppe pas le micro qu'on vient d'ouvrir.

**Files:**
- Modify: `app/components/meeting/MeetingRoom.tsx`
- Test: — (`npm test` pour non-régression + `npx tsc --noEmit` + vérif manuelle)

**Interfaces:**
- Consumes: `useMicEnergy` (Task 2), `LiveState` + props barge-in de `MeetingControls` (Task 3).
- Produces: rien pour d'autres tâches (dernière tâche).

- [ ] **Step 1: Abaisser le seuil d'endpointing**

Dans `app/components/meeting/MeetingRoom.tsx`, remplacer la constante `SILENCE_MS` :

```tsx
// ponytail: seuils de conversation mains-libres — calibration (débit de parole / pauses réelles).
// 1200 ms : coupe les blancs sans hacher la parole. À régler si ça envoie trop tôt.
const SILENCE_MS = 1200; // silence sans nouveaux mots avant l'envoi automatique
```

- [ ] **Step 2: Importer le hook et le type**

Ajouter en haut, près des autres imports :

```tsx
import { useMicEnergy } from "@/lib/useMicEnergy";
import type { LiveState } from "./MeetingControls";
```

- [ ] **Step 3: État barge-in + dérivation de l'état live + branchement du capteur**

Dans le corps du composant, **après le bloc d'initialisation de `detectorRef`** (donc après que `rec`, `baseTextRef`, `currentAnswerRef` et `cancel` sont tous déclarés — ~ligne 99), et **avant les `useEffect` existants**, ajouter :

```tsx
  const [bargeIn, setBargeIn] = useState(false);

  // Interruption : coupe le TTS immédiatement puis ouvre le micro.
  // cancel() bascule isSpeaking à false dans le même rendu que rec.start(),
  // donc l'effet de coupure forcée (plus bas) laisse le micro ouvert.
  function handleBargeIn() {
    cancel();
    baseTextRef.current = currentAnswerRef.current;
    rec.start();
  }

  // Capteur de volume : actif seulement quand le barge-in est armé et non muet ;
  // ne nourrit la porte de parole que pendant que l'IA parle (isSpeaking).
  const micEnergy = useMicEnergy({
    enabled: bargeIn && joined && !muted && rec.supported,
    listening: isSpeaking,
    onSpeech: handleBargeIn,
  });

  // État conversationnel affiché en direct (dérivé, pas de source nouvelle).
  const liveState: LiveState = isSpeaking
    ? "speaking"
    : streaming
    ? "thinking"
    : rec.listening
    ? "listening"
    : "idle";

  function toggleBargeIn() {
    setBargeIn((b) => !b);
  }
```

> Note : `handleBargeIn` référence `cancel`, `rec`, `baseTextRef`, `currentAnswerRef` déjà définis plus haut dans le composant. `useMicEnergy` gère lui-même la stabilité via des refs internes, donc passer une nouvelle fonction `onSpeech` à chaque rendu ne réarme pas le graphe audio.

- [ ] **Step 4: Transmettre les nouvelles props à `MeetingControls`**

Dans le JSX, dans le `<MeetingControls … />`, ajouter les props (par ex. juste après `onToggleHandsFree={toggleHandsFree}`) :

```tsx
        liveState={liveState}
        bargeIn={bargeIn}
        onToggleBargeIn={toggleBargeIn}
        bargeInSupported={rec.supported && micEnergy.supported}
```

- [ ] **Step 5: Afficher l'erreur micro du capteur (best-effort)**

Dans le bloc d'erreurs existant, remplacer :

```tsx
      {(errorMsg || rec.error) && (
        <p className="rounded-xl border border-danger-400/40 bg-danger-400/10 px-3.5 py-2.5 text-sm text-danger-400">{errorMsg || rec.error}</p>
      )}
```

par (ajoute `micEnergy.error`) :

```tsx
      {(errorMsg || rec.error || micEnergy.error) && (
        <p className="rounded-xl border border-danger-400/40 bg-danger-400/10 px-3.5 py-2.5 text-sm text-danger-400">{errorMsg || rec.error || micEnergy.error}</p>
      )}
```

- [ ] **Step 6: Typecheck + non-régression**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npm test`
Expected: PASS (toute la suite existante + `voiceGate`).

- [ ] **Step 7: Vérification manuelle**

Run: `npm run dev`, ouvrir l'entretien.
- Barge-in **OFF** (défaut) : l'entretien se comporte comme avant (pastille passe *réfléchit → parle → écoute*). Rien ne change dans le flux.
- Barge-in **ON** (avec casque) : pendant que l'IA parle, se mettre à parler coupe l'IA quasi instantanément et ouvre le micro.
- Le hint casque apparaît quand barge-in est ON.

- [ ] **Step 8: Commit**

```bash
git add app/components/meeting/MeetingRoom.tsx
git commit -m "feat(realtime): barge-in activable + pastille d'état + endpointing 1200ms"
```

---

## Notes d'exécution

- **Ordre des tâches** : 1 → 2 → 3 → 4 (Task 4 dépend des trois précédentes ; Tasks 1-3 sont indépendantes entre elles sauf 2 qui consomme 1).
- **Comportement par défaut** : barge-in OFF → l'entretien est identique à aujourd'hui, à deux détails près assumés : la pastille d'état s'affiche, et l'envoi mains-libres se déclenche après 1200 ms au lieu de 2500 ms.
- **Barge-in sans mains-libres** : après une interruption, le micro est en écoute ; l'envoi automatique ne survient que si le mode mains-libres est actif. Sinon l'utilisateur arrête/envoie manuellement. Comportement voulu.
- **Plafond connu** : sans casque, l'écho peut déclencher de faux barge-in malgré le seuil + le sustain. D'où OFF par défaut et le hint casque. Upgrade différé : Silero VAD WASM (hors périmètre).
```
