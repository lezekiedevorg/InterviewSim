# Voix naturelles via edge-tts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire lire les réponses du recruteur (solo + jury) par de vraies voix neuronales gratuites (edge-tts), avec repli automatique sur la voix du navigateur si edge est injoignable.

**Architecture:** Une route Next `/api/tts` synthétise l'audio via `msedge-tts` (Node). Un hook `useVoice` (même interface que `useSpeech`) teste edge une fois au montage, puis soit joue l'audio edge dans une file, soit délègue au navigateur. `MeetingRoom` échange `useSpeech` contre `useVoice` et fournit une voix edge par persona.

**Tech Stack:** Next.js App Router (route handler runtime Node), TypeScript, `msedge-tts` (Web Speech API en repli), vitest.

**Spec:** `docs/superpowers/specs/2026-07-04-voix-edge-tts-design.md`

## Global Constraints

- **Copie UI en français.** Composants navigateur `"use client"`.
- **Nouvelle dépendance assumée : `msedge-tts`** (cœur de la feature).
- **Repli obligatoire = aucune régression** : si edge échoue (probe KO, `/api/tts` en erreur), on utilise la voix navigateur existante (best-voice). Une phrase edge qui échoue en cours est **sautée** (pas de mélange de moteurs).
- La route valide : `text` non vide et ≤ 800 caractères ; `voice` **dans l'allowlist**. Runtime **Node** (`export const runtime = "nodejs"`).
- `PersonaId` vient de `lib/jury` (déjà sur `main`). Voix par défaut solo = `EDGE_SOLO_VOICE`.
- Tests via **vitest** (`npm test`), descriptions en français.
- ⚠️ **Next.js modifié** (voir `AGENTS.md`) : avant d'écrire la route et de toucher `next.config.ts`, **lire le guide Next local** (`node_modules/next/dist/docs/`) pour confirmer le nom exact de l'option qui marque un paquet comme « externe au bundle serveur » (pour que `msedge-tts` / `ws` ne soient pas bundlés).

---

### Task 1: `lib/edgeVoices.ts` — table de voix (pure)

**Files:**
- Create: `lib/edgeVoices.ts`
- Test: `tests/edgeVoices.test.ts`

**Interfaces:**
- Consumes: `PersonaId` (`@/lib/jury`).
- Produces:
  - `EDGE_SOLO_VOICE: string`
  - `EDGE_PERSONA_VOICE: Record<PersonaId, string>`
  - `EDGE_VOICE_ALLOWLIST: string[]`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `tests/edgeVoices.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { EDGE_SOLO_VOICE, EDGE_PERSONA_VOICE, EDGE_VOICE_ALLOWLIST } from "../lib/edgeVoices";

describe("edgeVoices", () => {
  it("a une voix par défaut pour le solo", () => {
    expect(typeof EDGE_SOLO_VOICE).toBe("string");
    expect(EDGE_SOLO_VOICE.length).toBeGreaterThan(0);
  });

  it("associe une voix DISTINCTE à chaque persona", () => {
    const voix = Object.values(EDGE_PERSONA_VOICE);
    expect(voix).toHaveLength(3);
    expect(new Set(voix).size).toBe(3); // toutes distinctes
  });

  it("l'allowlist contient la voix solo et les 3 voix de personas", () => {
    expect(EDGE_VOICE_ALLOWLIST).toContain(EDGE_SOLO_VOICE);
    for (const v of Object.values(EDGE_PERSONA_VOICE)) {
      expect(EDGE_VOICE_ALLOWLIST).toContain(v);
    }
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npm test -- edgeVoices`
Expected: FAIL — module `../lib/edgeVoices` introuvable.

- [ ] **Step 3: Implémenter `lib/edgeVoices.ts`**

```ts
import type { PersonaId } from "./jury";

// Voix neuronales françaises d'edge-tts (Microsoft). Toutes gratuites, sans clé.
export const EDGE_SOLO_VOICE = "fr-FR-DeniseNeural";

export const EDGE_PERSONA_VOICE: Record<PersonaId, string> = {
  rh: "fr-FR-DeniseNeural",
  manager: "fr-FR-HenriNeural",
  expert: "fr-FR-VivienneMultilingualNeural",
};

// Liste blanche des voix acceptées par /api/tts (évite d'accepter n'importe quoi).
export const EDGE_VOICE_ALLOWLIST: string[] = Array.from(
  new Set([EDGE_SOLO_VOICE, ...Object.values(EDGE_PERSONA_VOICE)])
);
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npm test -- edgeVoices`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/edgeVoices.ts tests/edgeVoices.test.ts
git commit -m "feat: table de voix edge-tts (solo + par persona + allowlist)"
```

---

### Task 2: Route `POST /api/tts` (+ dépendance `msedge-tts`)

**Files:**
- Create: `app/api/tts/route.ts`
- Modify: `next.config.ts` (marquer `msedge-tts` comme externe au bundle serveur)
- Modify: `package.json` / `package-lock.json` (via `npm install`)

**Interfaces:**
- Consumes: `EDGE_VOICE_ALLOWLIST` (Task 1), `msedge-tts`.
- Produces: `POST /api/tts` — body `{ text: string; voice: string }` → réponse audio `audio/mpeg` (200) ou erreur (`400`/`502`).

*Note : route à I/O externe → pas de test unitaire ; vérif au build + navigateur + preview Vercel en Task 4.*

- [ ] **Step 1: Installer la dépendance**

Run: `npm install msedge-tts`
Expected: ajoutée à `package.json`.

- [ ] **Step 2: Marquer `msedge-tts` externe au bundle serveur**

Lire d'abord `node_modules/next/dist/docs/` pour confirmer le nom exact de l'option (Next 16). Ouvrir `next.config.ts` et ajouter `msedge-tts` à la liste des paquets externes serveur (clé `serverExternalPackages` en Next 15/16 ; si cette version l'appelle autrement, utiliser le nom confirmé par le guide local). Exemple de forme attendue :

```ts
// next.config.ts (ajout dans l'objet config)
serverExternalPackages: ["msedge-tts"],
```

- [ ] **Step 3: Créer la route**

Créer `app/api/tts/route.ts` :

```ts
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { EDGE_VOICE_ALLOWLIST } from "@/lib/edgeVoices";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  let body: { text?: string; voice?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Requête invalide.", { status: 400 });
  }

  const text = (body.text ?? "").trim();
  const voice = body.voice ?? "";
  if (!text || text.length > 800) return new Response("Texte invalide.", { status: 400 });
  if (!EDGE_VOICE_ALLOWLIST.includes(voice)) return new Response("Voix inconnue.", { status: 400 });

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    const chunks: Buffer[] = [];
    const collect = new Promise<void>((resolve, reject) => {
      audioStream.on("data", (c: Buffer) => chunks.push(c));
      audioStream.on("end", () => resolve());
      audioStream.on("error", reject);
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 8000)
    );
    await Promise.race([collect, timeout]);

    const audio = Buffer.concat(chunks);
    if (audio.length === 0) return new Response("Synthèse vide.", { status: 502 });
    return new Response(new Uint8Array(audio), {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("Synthèse indisponible.", { status: 502 });
  }
}
```

- [ ] **Step 4: Vérifier le build**

Run: `npm run build`
Expected: build OK, la route `/api/tts` apparaît dans la liste. Si le build échoue en tentant de bundler `msedge-tts`/`ws`, revoir Step 2 (option d'externalisation).

- [ ] **Step 5: Vérifier la synthèse localement (fumée)**

Lancer `npm run dev`, puis dans un terminal :

Run:
```bash
curl -s -X POST http://localhost:3000/api/tts -H "Content-Type: application/json" -d '{"text":"Bonjour, ceci est un test.","voice":"fr-FR-DeniseNeural"}' -o /tmp/tts.mp3 && wc -c /tmp/tts.mp3
```
Expected: un fichier `> 0` octet (audio MP3). (Ce test confirme la route depuis ta machine ; l'IP Vercel sera vérifiée en Task 4 via un preview.)

- [ ] **Step 6: Commit**

```bash
git add app/api/tts/route.ts next.config.ts package.json package-lock.json
git commit -m "feat: route /api/tts (synthèse edge-tts -> MP3)"
```

---

### Task 3: Hook `useVoice` (probe + file audio edge + repli navigateur)

**Files:**
- Create: `lib/useVoice.ts`

**Interfaces:**
- Consumes: `useSpeech` (`@/lib/useSpeech`, chemin navigateur existant), `EDGE_SOLO_VOICE` (Task 1), route `/api/tts` (Task 2).
- Produces: `useVoice()` renvoyant la même forme que `useSpeech` — `{ supported, speak, cancel, muted, toggleMute, isSpeaking, voices }` — avec `speak(text: string, opts?: SpeakOpts)` et
  `type SpeakOpts = { edgeVoice?: string; pitch?: number; rate?: number; voice?: SpeechSynthesisVoice }`.

*Note : hook 100 % navigateur/fetch/audio → pas de test unitaire (comme `useSpeech`) ; vérif navigateur en Task 4.*

- [ ] **Step 1: Créer le hook**

Créer `lib/useVoice.ts` :

```ts
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSpeech } from "./useSpeech";
import { EDGE_SOLO_VOICE } from "./edgeVoices";

export type SpeakOpts = {
  edgeVoice?: string;
  pitch?: number;
  rate?: number;
  voice?: SpeechSynthesisVoice;
};

type Engine = "probing" | "edge" | "browser";

export function useVoice() {
  const browser = useSpeech(); // chemin navigateur (best-voice), inchangé
  const [engine, setEngine] = useState<Engine>("probing");
  const [edgeSpeaking, setEdgeSpeaking] = useState(false);

  const queueRef = useRef<{ text: string; voice: string }[]>([]);
  const playingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);
  const mutedRef = useRef(false);

  // mutedRef suit l'état de sourdine du navigateur (source unique).
  useEffect(() => {
    mutedRef.current = browser.muted;
  }, [browser.muted]);

  // Test edge une seule fois : succès -> moteur edge ; sinon navigateur.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: "Bonjour.", voice: EDGE_SOLO_VOICE }),
        });
        if (!cancelled) setEngine(res.ok ? "edge" : "browser");
      } catch {
        if (!cancelled) setEngine("browser");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stopEdge = useCallback(() => {
    queueRef.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    const r = resolveRef.current;
    resolveRef.current = null;
    r?.(); // débloque la lecture en cours (la boucle verra la file vide et sortira)
    setEdgeSpeaking(false);
  }, []);

  // Coupe l'audio edge dès que le navigateur passe en sourdine.
  useEffect(() => {
    if (browser.muted) stopEdge();
  }, [browser.muted, stopEdge]);

  const pump = useCallback(async () => {
    if (playingRef.current) return;
    playingRef.current = true;
    setEdgeSpeaking(true);
    try {
      while (queueRef.current.length > 0 && !mutedRef.current) {
        const item = queueRef.current.shift()!;
        try {
          const res = await fetch("/api/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(item),
          });
          if (!res.ok) throw new Error("tts");
          const url = URL.createObjectURL(await res.blob());
          await new Promise<void>((resolve) => {
            resolveRef.current = resolve;
            const audio = new Audio(url);
            audioRef.current = audio;
            const done = () => {
              resolveRef.current = null;
              URL.revokeObjectURL(url);
              resolve();
            };
            audio.onended = done;
            audio.onerror = done;
            audio.play().catch(done);
          });
          audioRef.current = null;
        } catch {
          // ponytail: échec ponctuel edge -> on saute cette phrase (transcription reste lisible)
        }
      }
    } finally {
      playingRef.current = false;
      setEdgeSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    (text: string, opts?: SpeakOpts) => {
      if (browser.muted || !text.trim()) return;
      if (engine === "edge") {
        queueRef.current.push({ text, voice: opts?.edgeVoice ?? EDGE_SOLO_VOICE });
        void pump();
      } else {
        browser.speak(
          text,
          opts ? { pitch: opts.pitch, rate: opts.rate, voice: opts.voice } : undefined
        );
      }
    },
    [engine, browser, pump]
  );

  const cancel = useCallback(() => {
    stopEdge();
    browser.cancel();
  }, [stopEdge, browser]);

  // Nettoyage au démontage.
  useEffect(() => () => stopEdge(), [stopEdge]);

  return {
    supported: engine === "browser" ? browser.supported : true,
    speak,
    cancel,
    muted: browser.muted,
    toggleMute: browser.toggleMute,
    isSpeaking: engine === "edge" ? edgeSpeaking : browser.isSpeaking,
    voices: browser.voices,
  };
}
```

- [ ] **Step 2: Vérifier le build + suite**

Run: `npm run build && npm test`
Expected: build OK (le hook compile ; pas encore utilisé dans l'UI), tous les tests verts.

- [ ] **Step 3: Commit**

```bash
git add lib/useVoice.ts
git commit -m "feat: hook useVoice (edge-tts + repli navigateur)"
```

---

### Task 4: Brancher `useVoice` dans `MeetingRoom`

**Files:**
- Modify: `app/components/meeting/MeetingRoom.tsx`

**Interfaces:**
- Consumes: `useVoice` (Task 3), `EDGE_PERSONA_VOICE` (Task 1).
- Produces: la voix de l'entretien passe par edge-tts (repli navigateur), en solo et en jury.

- [ ] **Step 1: Remplacer l'import et le hook**

Dans `app/components/meeting/MeetingRoom.tsx` :

Remplacer :

```ts
import { useSpeech } from "@/lib/useSpeech";
```

par :

```ts
import { useVoice } from "@/lib/useVoice";
import { EDGE_PERSONA_VOICE } from "@/lib/edgeVoices";
```

Remplacer :

```ts
  const { supported, speak, cancel, muted, toggleMute, isSpeaking, voices } = useSpeech();
```

par :

```ts
  const { supported, speak, cancel, muted, toggleMute, isSpeaking, voices } = useVoice();
```

- [ ] **Step 2: Ajouter la voix edge par persona dans `voiceOptsFor`**

Dans `app/components/meeting/MeetingRoom.tsx`, remplacer :

```ts
    const p = PERSONAS[idx];
    const voice = voices.length ? voices[idx % voices.length] : undefined;
    return { pitch: p.pitch, rate: p.rate, voice };
```

par :

```ts
    const p = PERSONAS[idx];
    const voice = voices.length ? voices[idx % voices.length] : undefined;
    return { pitch: p.pitch, rate: p.rate, voice, edgeVoice: EDGE_PERSONA_VOICE[id] };
```

(En solo, `opts` reste `undefined` → `useVoice` utilise `EDGE_SOLO_VOICE` en edge, la meilleure voix navigateur en repli.)

- [ ] **Step 3: Vérifier build + suite**

Run: `npm run build && npm test`
Expected: build OK, tous les tests verts (aucun cassé).

- [ ] **Step 4: Vérification navigateur (locale, Chrome/Edge)**

`npm run dev`, entretien solo puis jury :
1. La voix du recruteur est **naturelle** (edge) et non robotique.
2. Jury : les 3 personas ont des **voix edge distinctes** ; seul le persona courant est animé ; le préfixe `Nom :` n'est pas prononcé.
3. Mute coupe l'audio immédiatement ; « Terminer » stoppe la voix.
4. Simuler un échec edge (couper le réseau après chargement de la page, ou renommer temporairement la route) → la voix **retombe sur le navigateur** sans planter.

- [ ] **Step 5: Vérification preview Vercel (IP datacenter)**

Pousser la branche et ouvrir le **preview Vercel** ; faire un entretien et confirmer que la voix edge fonctionne **depuis l'IP de Vercel** (c'est le risque résiduel). Si l'audio ne vient pas mais que la transcription et la voix navigateur marchent → l'IP Vercel est bloquée : le repli assure qu'il n'y a pas de régression, et on décidera (backend séparé option B) séparément.

- [ ] **Step 6: Commit**

```bash
git add app/components/meeting/MeetingRoom.tsx
git commit -m "feat: MeetingRoom utilise useVoice (voix edge + repli)"
```

---

## Self-Review

- **Couverture spec :** route `/api/tts` + msedge-tts + validation + runtime Node (T2) ✅ ; table de voix solo/persona/allowlist (T1) ✅ ; hook `useVoice` probe-une-fois + file audio edge + repli navigateur + mute/cancel (T3) ✅ ; intégration MeetingRoom + voix edge par persona, logique jury inchangée (T4) ✅ ; repli = aucune régression (T3 engine=browser, T4 solo/ jury) ✅ ; phrase edge en échec sautée (T3 `catch` du pump) ✅ ; tests purs edgeVoices (T1) + vérif navigateur/preview (T4) ✅. Toutes les sections du spec sont couvertes.
- **Placeholders :** aucun code manquant. Le nom d'option Next (`serverExternalPackages`) est à confirmer dans le guide local (imposé par `AGENTS.md`), pas un placeholder.
- **Cohérence des types :** `SpeakOpts { edgeVoice?, pitch?, rate?, voice? }` défini en T3, produit par `voiceOptsFor` en T4 (mêmes champs) ; `EDGE_SOLO_VOICE`/`EDGE_PERSONA_VOICE`/`EDGE_VOICE_ALLOWLIST` définis en T1, consommés en T2 (allowlist), T3 (solo), T4 (persona) ; `useVoice` renvoie la même forme que `useSpeech`, donc la déstructuration de `MeetingRoom` est inchangée.
