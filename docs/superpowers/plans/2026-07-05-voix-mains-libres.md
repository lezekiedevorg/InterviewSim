# Mode voix mains-libres — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un mode conversation vocale mains-libres (opt-in) : le micro se rouvre seul après la réponse du recruteur, et la réponse du candidat part automatiquement après un silence.

**Architecture:** Un module pur `lib/silenceDetector.ts` encapsule la détection de fin de tour (minuteur de silence, testé avec les faux timers de vitest). `MeetingRoom` le câble via deux effets (réouverture auto du micro avec anti-rebond ; envoi auto sur silence) pilotés par un état `handsFree`, exposé par un bouton à bascule dans `MeetingControls`. Le comportement OFF est strictement l'actuel.

**Tech Stack:** Next.js 16, React 19, TypeScript, vitest. Web Speech API navigateur (déjà en place via `useSpeechRecognition`). Aucune dépendance nouvelle.

## Global Constraints

- Mains-libres uniquement — barge-in (couper le recruteur) HORS périmètre.
- Bouton à bascule opt-in, **OFF par défaut** ; OFF = comportement actuel (push-to-talk + clavier) strictement inchangé.
- `SILENCE_MS = 2500`, `MIC_REOPEN_MS = 400` — constantes calibrables (commentaire `ponytail:`).
- Bouton mains-libres **masqué si `recognitionSupported` est faux**.
- Aucune dépendance nouvelle. Français dans l'UI.
- Tests = vitest pur (le détecteur avec `vi.useFakeTimers`) ; le câblage micro live = vérif navigateur.

---

### Task 1: `lib/silenceDetector.ts` — détecteur de fin de tour (testé)

**Files:**
- Create: `lib/silenceDetector.ts`
- Test: `tests/silenceDetector.test.ts`

**Interfaces:**
- Produces: `createSilenceDetector(delayMs: number, onFire: (text: string) => void): { bump(text: string): void; cancel(): void }`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/silenceDetector.test.ts` :

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSilenceDetector } from "../lib/silenceDetector";

describe("createSilenceDetector", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("déclenche onFire après delayMs sans bump, avec le dernier texte", () => {
    const fire = vi.fn();
    const d = createSilenceDetector(2500, fire);
    d.bump("bonjour");
    vi.advanceTimersByTime(2499);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fire).toHaveBeenCalledWith("bonjour");
  });

  it("un bump avant l'échéance réarme le minuteur (pas de tir prématuré)", () => {
    const fire = vi.fn();
    const d = createSilenceDetector(2500, fire);
    d.bump("bon");
    vi.advanceTimersByTime(2000);
    d.bump("bonjour");
    vi.advanceTimersByTime(2000);
    expect(fire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(fire).toHaveBeenCalledWith("bonjour");
  });

  it("ne tire pas si le dernier texte est vide/espaces", () => {
    const fire = vi.fn();
    const d = createSilenceDetector(2500, fire);
    d.bump("   ");
    vi.advanceTimersByTime(2500);
    expect(fire).not.toHaveBeenCalled();
  });

  it("cancel() empêche le tir", () => {
    const fire = vi.fn();
    const d = createSilenceDetector(2500, fire);
    d.bump("bonjour");
    vi.advanceTimersByTime(1000);
    d.cancel();
    vi.advanceTimersByTime(5000);
    expect(fire).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `npm test -- silenceDetector`
Expected: FAIL (`lib/silenceDetector` introuvable).

- [ ] **Step 3: Créer `lib/silenceDetector.ts`**

```typescript
// Détecteur de fin de tour : déclenche onFire après un silence (aucun bump pendant delayMs),
// à condition que le dernier texte reçu soit non vide. Aucun accès DOM (testable avec faux timers).
export function createSilenceDetector(
  delayMs: number,
  onFire: (text: string) => void
): { bump(text: string): void; cancel(): void } {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastText = "";

  function cancel(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  function bump(text: string): void {
    lastText = text;
    cancel();
    timer = setTimeout(() => {
      timer = null;
      if (lastText.trim() !== "") onFire(lastText);
    }, delayMs);
  }

  return { bump, cancel };
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `npm test -- silenceDetector`
Expected: PASS (4 tests).

- [ ] **Step 5: Vérifier la compilation**

Run: `npx tsc --noEmit`
Expected: aucune erreur.

- [ ] **Step 6: Commit**

```bash
git add lib/silenceDetector.ts tests/silenceDetector.test.ts
git commit -m "feat(voix): détecteur de silence pour la fin de tour mains-libres"
```

---

### Task 2: Câblage mains-libres — `MeetingControls` (bascule) + `MeetingRoom` (auto)

**Files:**
- Modify: `app/components/meeting/MeetingControls.tsx`
- Modify: `app/components/meeting/MeetingRoom.tsx`

**Interfaces:**
- Consumes: `createSilenceDetector` (Task 1) ; `rec` (`useSpeechRecognition`: `{ supported, listening, transcript, start, stop, error }`), `isSpeaking`, `streaming`, `muted`, `joined`, `currentAnswer`, `sendAnswer` (déjà dans `MeetingRoom`).
- Produces: rien pour d'autres tâches (feature terminale).

- [ ] **Step 1: Ajouter la bascule dans `MeetingControls.tsx`**

a) Dans le type `Props` (après `micDisabled: boolean;`), ajouter :

```tsx
  handsFree: boolean;
  onToggleHandsFree: () => void;
```

b) Dans la déstructuration des props (après `micDisabled,`), ajouter :

```tsx
  handsFree,
  onToggleHandsFree,
```

c) Juste après le bloc `{recognitionSupported && ( <button ... 🎤 ... </button> )}` (le bouton micro « 🎤 Parler / J'écoute… »), ajouter un second bouton conditionnel :

```tsx
        {recognitionSupported && (
          <button
            type="button"
            onClick={onToggleHandsFree}
            className={`${pill} ${handsFree ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"}`}
          >
            {handsFree ? "🎙️ Mains-libres activé" : "🎙️ Mains-libres"}
          </button>
        )}
```

- [ ] **Step 2: `MeetingRoom.tsx` — import + constantes**

a) Ajouter l'import (près de `import { useSpeechRecognition } from "@/lib/useSpeechRecognition";`) :

```tsx
import { createSilenceDetector } from "@/lib/silenceDetector";
```

b) Au niveau module, juste avant `type Props = {` , ajouter les constantes de calibration :

```tsx
// ponytail: seuils de conversation mains-libres — boutons de calibration (débit de parole / pauses réelles à régler).
const SILENCE_MS = 2500; // silence sans nouveaux mots avant l'envoi automatique
const MIC_REOPEN_MS = 400; // anti-rebond avant réouverture auto du micro (absorbe les micro-coupures d'isSpeaking entre phrases)
```

- [ ] **Step 3: `MeetingRoom.tsx` — état, détecteur, effets, bascule**

a) Après la ligne `const baseTextRef = useRef("");` (~ligne 76), ajouter l'état mains-libres, les refs de rappel et le détecteur (créé une seule fois) :

```tsx
  const [handsFree, setHandsFree] = useState(false);

  // Refs vers les dernières valeurs/fonctions, pour que le détecteur (créé une fois) et l'effet
  // d'ouverture utilisent toujours la version courante SANS les mettre dans les tableaux de deps
  // (rec est recréé à chaque rendu ; currentAnswer change à chaque mot -> ne doivent pas réarmer les effets).
  const sendRef = useRef(sendAnswer);
  sendRef.current = sendAnswer;
  const recStopRef = useRef(rec.stop);
  recStopRef.current = rec.stop;
  const currentAnswerRef = useRef(currentAnswer);
  currentAnswerRef.current = currentAnswer;
  const detectorRef = useRef<ReturnType<typeof createSilenceDetector> | null>(null);
  if (detectorRef.current === null) {
    detectorRef.current = createSilenceDetector(SILENCE_MS, () => {
      recStopRef.current();
      sendRef.current();
    });
  }

  // Mains-libres : chaque mot reconnu réarme le minuteur de silence ; à échéance -> envoi auto (via detector).
  useEffect(() => {
    const d = detectorRef.current!;
    if (handsFree && rec.listening) d.bump(rec.transcript);
    else d.cancel();
  }, [handsFree, rec.listening, rec.transcript]);

  // Mains-libres : rouvrir le micro tout seul quand le recruteur a fini (anti-rebond contre les micro-coupures d'isSpeaking).
  // Deps = uniquement des primitives + rec.start (stable, useCallback[]) — surtout PAS `rec` ni `currentAnswer`,
  // qui changent d'identité à chaque rendu et réarmeraient le minuteur en boucle (le micro ne s'ouvrirait jamais).
  useEffect(() => {
    if (!(handsFree && joined && !muted && !streaming && !isSpeaking && !rec.listening && rec.supported)) return;
    const t = setTimeout(() => {
      baseTextRef.current = currentAnswerRef.current;
      rec.start();
    }, MIC_REOPEN_MS);
    return () => clearTimeout(t);
  }, [handsFree, joined, muted, streaming, isSpeaking, rec.listening, rec.supported, rec.start]);
```

b) Ajouter le handler de bascule à côté de `toggleMic` (après la fonction `toggleMic`) :

```tsx
  function toggleHandsFree() {
    if (handsFree && rec.listening) rec.stop(); // couper le micro si on désactive en plein tour
    setHandsFree((h) => !h);
  }
```

- [ ] **Step 4: `MeetingRoom.tsx` — passer les props à `MeetingControls`**

Dans le JSX `<MeetingControls ... />`, après la prop `micDisabled={streaming || isSpeaking}`, ajouter :

```tsx
        handsFree={handsFree}
        onToggleHandsFree={toggleHandsFree}
```

- [ ] **Step 5: Vérifier compilation + tests**

Run: `npm test && npx tsc --noEmit`
Expected: tous les tests PASS (dont les 4 de `silenceDetector`), zéro erreur TypeScript.

- [ ] **Step 6: Vérification navigateur (micro live)**

Run: `npm run dev`, faire un entretien en mode réunion, rejoindre, cliquer « 🎙️ Mains-libres ».
Vérifier :
- Après que le recruteur a fini de parler, le micro s'ouvre seul (« 🎤 J'écoute… », indicateur pulsant).
- Parler puis se taire ~2,5 s → la réponse part toute seule ; le recruteur répond ; le micro se rouvre. Boucle fluide sans bouton.
- Se taire sans rien dire → pas d'envoi vide, le micro reste ouvert.
- Cliquer « 🎙️ Mains-libres » pour désactiver en plein tour → le micro se coupe, retour au push-to-talk manuel.
- Mode OFF : le comportement est exactement l'actuel (bouton « 🎤 Parler », envoi manuel).
- (Firefox/Safari sans reconnaissance) : le bouton mains-libres est absent.

- [ ] **Step 7: Commit**

```bash
git add app/components/meeting/MeetingControls.tsx app/components/meeting/MeetingRoom.tsx
git commit -m "feat(voix): mode mains-libres (micro auto + envoi sur silence), bascule opt-in"
```

---

## Self-Review

**Spec coverage :**
- `silenceDetector` (bump/cancel/seuil, non-vide) → Task 1. ✅
- Flux mains-libres (micro auto après recruteur, envoi sur silence) → Task 2 step 3 (2 effets). ✅
- Bascule opt-in, masquée si non supporté → Task 2 steps 1 & 4. ✅
- OFF = inchangé (les nouveaux effets ne font rien si `handsFree` false ; force-stop et mergeTranscript existants intacts) → Task 2. ✅
- Constantes calibrables `SILENCE_MS`/`MIC_REOPEN_MS` → Task 2 step 2. ✅
- Cas limites (texte vide, bascule OFF en plein tour, anti-rebond annulé si isSpeaking/streaming reviennent) → détecteur (garde non-vide) + `toggleHandsFree` + cleanup `clearTimeout`. ✅

**Placeholders :** aucun — code complet à chaque étape.

**Type consistency :** `createSilenceDetector(delayMs, onFire)` et `{ bump, cancel }` cohérents entre Task 1 et Task 2. `rec.stop`/`rec.start`/`rec.transcript`/`rec.listening`/`rec.supported` correspondent au retour de `useSpeechRecognition`. Props `handsFree`/`onToggleHandsFree` cohérentes entre `MeetingRoom` et `MeetingControls`.
