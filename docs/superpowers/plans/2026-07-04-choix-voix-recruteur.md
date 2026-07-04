# Choix de la voix du recruteur — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permettre à l'utilisateur de choisir la voix du recruteur (solo) ou un pack de voix (jury) dans le salon, avec aperçu audio et mémorisation entre sessions.

**Architecture:** On étend `lib/edgeVoices.ts` avec une liste de voix solo et des packs jury (+ helpers de lookup et allowlist recalculée). Un nouveau `lib/voicePrefs.ts` lit/écrit le choix en `localStorage` avec validation. `MeetingRoom` détient l'état (init depuis localStorage) et le passe à `MeetingLobby` qui affiche les sélecteurs + bouton d'aperçu, uniquement quand le moteur edge est actif.

**Tech Stack:** Next.js 16, React 19, TypeScript, vitest, edge-tts via `msedge-tts` (route `/api/tts` existante, inchangée).

## Global Constraints

- Gratuit, sans clé ni carte : uniquement edge-tts (déjà en place) + `localStorage`. Pas de nouvelle dépendance, pas de base.
- Français dans toute l'UI et les libellés.
- Tests = vitest sur logique pure uniquement (pas de jsdom, pas de nouveau framework). Composants React vérifiés au navigateur.
- Aucune régression sur le repli navigateur (moteur best-voice) : le sélecteur n'apparaît **que si `engine === "edge"`**.
- Conserver les exports existants `EDGE_SOLO_VOICE` et `EDGE_PERSONA_VOICE` (utilisés ailleurs comme défauts + par le test existant).

---

### Task 1: Étendre `lib/edgeVoices.ts` (voix solo, packs jury, lookups, allowlist)

**Files:**
- Modify: `lib/edgeVoices.ts`
- Test: `tests/edgeVoices.test.ts`

**Interfaces:**
- Consumes: `PersonaId` de `lib/jury.ts`.
- Produces:
  - `type SoloVoice = { id: string; label: string; voice: string }`
  - `EDGE_SOLO_VOICES: SoloVoice[]`
  - `DEFAULT_SOLO_VOICE_ID: string` (= `"denise"`)
  - `type JuryPack = { id: string; label: string; voices: Record<PersonaId, string> }`
  - `EDGE_JURY_PACKS: JuryPack[]`
  - `DEFAULT_JURY_PACK_ID: string` (= `"pack1"`)
  - `soloVoiceById(id: string): string`
  - `juryVoicesByPack(id: string): Record<PersonaId, string>`
  - `EDGE_VOICE_ALLOWLIST: string[]` (union, recalculée)

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `tests/edgeVoices.test.ts` (garder les 3 tests existants) :

```typescript
import {
  EDGE_SOLO_VOICES,
  EDGE_JURY_PACKS,
  DEFAULT_SOLO_VOICE_ID,
  DEFAULT_JURY_PACK_ID,
  soloVoiceById,
  juryVoicesByPack,
} from "../lib/edgeVoices";

describe("edgeVoices — choix utilisateur", () => {
  it("propose au moins 2 voix solo, toutes dans l'allowlist", () => {
    expect(EDGE_SOLO_VOICES.length).toBeGreaterThanOrEqual(2);
    for (const v of EDGE_SOLO_VOICES) expect(EDGE_VOICE_ALLOWLIST).toContain(v.voice);
  });

  it("chaque pack jury a 3 voix DISTINCTES, toutes dans l'allowlist", () => {
    expect(EDGE_JURY_PACKS.length).toBeGreaterThanOrEqual(2);
    for (const p of EDGE_JURY_PACKS) {
      const voix = Object.values(p.voices);
      expect(voix).toHaveLength(3);
      expect(new Set(voix).size).toBe(3);
      for (const v of voix) expect(EDGE_VOICE_ALLOWLIST).toContain(v);
    }
  });

  it("les défauts pointent vers une entrée existante", () => {
    expect(EDGE_SOLO_VOICES.some((v) => v.id === DEFAULT_SOLO_VOICE_ID)).toBe(true);
    expect(EDGE_JURY_PACKS.some((p) => p.id === DEFAULT_JURY_PACK_ID)).toBe(true);
  });

  it("lookup par id, repli défaut si inconnu", () => {
    expect(soloVoiceById("henri")).toBe("fr-FR-HenriNeural");
    expect(soloVoiceById("inconnu")).toBe(EDGE_SOLO_VOICE);
    expect(juryVoicesByPack("inconnu")).toEqual(EDGE_PERSONA_VOICE);
  });
});
```

Note : `EDGE_VOICE_ALLOWLIST`, `EDGE_SOLO_VOICE`, `EDGE_PERSONA_VOICE` sont déjà importés en haut du fichier de test existant.

- [ ] **Step 2: Lancer les tests, vérifier l'échec**

Run: `npm test -- edgeVoices`
Expected: FAIL (`EDGE_SOLO_VOICES` etc. non exportés).

- [ ] **Step 3: Étendre `lib/edgeVoices.ts`**

Remplacer tout le contenu par :

```typescript
import type { PersonaId } from "./jury";

// Voix neuronales françaises d'edge-tts (Microsoft). Toutes gratuites, sans clé.
export const EDGE_SOLO_VOICE = "fr-FR-DeniseNeural"; // défaut historique

export const EDGE_PERSONA_VOICE: Record<PersonaId, string> = {
  rh: "fr-FR-DeniseNeural",
  manager: "fr-FR-HenriNeural",
  expert: "fr-FR-VivienneMultilingualNeural",
};

// Voix solo proposées à l'utilisateur : id stable (localStorage), libellé UI, voix edge.
export type SoloVoice = { id: string; label: string; voice: string };
export const EDGE_SOLO_VOICES: SoloVoice[] = [
  { id: "denise", label: "Denise (femme)", voice: "fr-FR-DeniseNeural" },
  { id: "henri", label: "Henri (homme)", voice: "fr-FR-HenriNeural" },
  { id: "vivienne", label: "Vivienne (femme)", voice: "fr-FR-VivienneMultilingualNeural" },
  { id: "remy", label: "Rémy (homme)", voice: "fr-FR-RemyMultilingualNeural" },
];
export const DEFAULT_SOLO_VOICE_ID = "denise";

// Packs de jury : chaque pack = 3 voix DISTINCTES (une par persona), pour garder les personas différenciés.
export type JuryPack = { id: string; label: string; voices: Record<PersonaId, string> };
export const EDGE_JURY_PACKS: JuryPack[] = [
  { id: "pack1", label: "Pack 1 (par défaut)", voices: { ...EDGE_PERSONA_VOICE } },
  {
    id: "pack2",
    label: "Pack 2",
    voices: {
      rh: "fr-FR-EloiseNeural",
      manager: "fr-FR-RemyMultilingualNeural",
      expert: "fr-FR-VivienneMultilingualNeural",
    },
  },
];
export const DEFAULT_JURY_PACK_ID = "pack1";

// Recherche par id, repli sur le défaut historique si l'id est inconnu.
export function soloVoiceById(id: string): string {
  return EDGE_SOLO_VOICES.find((v) => v.id === id)?.voice ?? EDGE_SOLO_VOICE;
}
export function juryVoicesByPack(id: string): Record<PersonaId, string> {
  return EDGE_JURY_PACKS.find((p) => p.id === id)?.voices ?? EDGE_PERSONA_VOICE;
}

// Liste blanche acceptée par /api/tts = union de tout ce qu'on peut demander.
export const EDGE_VOICE_ALLOWLIST: string[] = Array.from(
  new Set([
    EDGE_SOLO_VOICE,
    ...Object.values(EDGE_PERSONA_VOICE),
    ...EDGE_SOLO_VOICES.map((v) => v.voice),
    ...EDGE_JURY_PACKS.flatMap((p) => Object.values(p.voices)),
  ])
);
```

- [ ] **Step 4: Vérifier les noms de voix `msedge-tts`**

Run (vérifie que les 5 voix utilisées existent bien) :

```bash
node -e "const {MsEdgeTTS}=require('msedge-tts');(async()=>{const t=new MsEdgeTTS();const v=await t.getVoices();const want=['fr-FR-DeniseNeural','fr-FR-HenriNeural','fr-FR-VivienneMultilingualNeural','fr-FR-RemyMultilingualNeural','fr-FR-EloiseNeural'];const have=new Set(v.map(x=>x.ShortName));for(const w of want)console.log(w, have.has(w)?'OK':'MANQUANTE');})()"
```

Expected: les 5 lignes affichent `OK`. Si l'une affiche `MANQUANTE`, la remplacer par une voix `fr-FR-*Neural` présente dans la sortie (garder distinctes dans chaque pack) et réajuster `EDGE_SOLO_VOICES` / `EDGE_JURY_PACKS`.

- [ ] **Step 5: Lancer les tests, vérifier le succès**

Run: `npm test -- edgeVoices`
Expected: PASS (anciens + nouveaux tests).

- [ ] **Step 6: Commit**

```bash
git add lib/edgeVoices.ts tests/edgeVoices.test.ts
git commit -m "feat(voix): catalogue de voix solo + packs jury dans edgeVoices"
```

---

### Task 2: `lib/voicePrefs.ts` — préférence persistée avec validation

**Files:**
- Create: `lib/voicePrefs.ts`
- Test: `tests/voicePrefs.test.ts`

**Interfaces:**
- Consumes: `EDGE_SOLO_VOICES`, `EDGE_JURY_PACKS`, `DEFAULT_SOLO_VOICE_ID`, `DEFAULT_JURY_PACK_ID` (Task 1).
- Produces:
  - `type VoicePref = { soloId: string; packId: string }`
  - `resolveVoicePref(rawSolo: string | null, rawPack: string | null): VoicePref` (logique pure, testée)
  - `getVoicePref(): VoicePref` (lit localStorage, SSR-safe)
  - `setVoicePref(p: Partial<VoicePref>): void` (écrit localStorage, SSR-safe)

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/voicePrefs.test.ts` :

```typescript
import { describe, it, expect } from "vitest";
import { resolveVoicePref } from "../lib/voicePrefs";
import { DEFAULT_SOLO_VOICE_ID, DEFAULT_JURY_PACK_ID } from "../lib/edgeVoices";

describe("resolveVoicePref", () => {
  it("null → défauts", () => {
    expect(resolveVoicePref(null, null)).toEqual({
      soloId: DEFAULT_SOLO_VOICE_ID,
      packId: DEFAULT_JURY_PACK_ID,
    });
  });

  it("valeurs connues → conservées", () => {
    expect(resolveVoicePref("henri", "pack2")).toEqual({ soloId: "henri", packId: "pack2" });
  });

  it("valeurs inconnues/corrompues → défauts", () => {
    expect(resolveVoicePref("bidon", "xxx")).toEqual({
      soloId: DEFAULT_SOLO_VOICE_ID,
      packId: DEFAULT_JURY_PACK_ID,
    });
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier l'échec**

Run: `npm test -- voicePrefs`
Expected: FAIL (`lib/voicePrefs` introuvable).

- [ ] **Step 3: Créer `lib/voicePrefs.ts`**

```typescript
import {
  EDGE_SOLO_VOICES,
  EDGE_JURY_PACKS,
  DEFAULT_SOLO_VOICE_ID,
  DEFAULT_JURY_PACK_ID,
} from "./edgeVoices";

export type VoicePref = { soloId: string; packId: string };

const SOLO_KEY = "interviewsim.voice.solo";
const PACK_KEY = "interviewsim.voice.juryPack";

// Valide des valeurs brutes (localStorage) contre les catalogues connus ; inconnu → défaut.
export function resolveVoicePref(rawSolo: string | null, rawPack: string | null): VoicePref {
  const soloId = EDGE_SOLO_VOICES.some((v) => v.id === rawSolo) ? rawSolo! : DEFAULT_SOLO_VOICE_ID;
  const packId = EDGE_JURY_PACKS.some((p) => p.id === rawPack) ? rawPack! : DEFAULT_JURY_PACK_ID;
  return { soloId, packId };
}

export function getVoicePref(): VoicePref {
  if (typeof window === "undefined") return resolveVoicePref(null, null);
  return resolveVoicePref(localStorage.getItem(SOLO_KEY), localStorage.getItem(PACK_KEY));
}

export function setVoicePref(p: Partial<VoicePref>): void {
  if (typeof window === "undefined") return;
  if (p.soloId != null) localStorage.setItem(SOLO_KEY, p.soloId);
  if (p.packId != null) localStorage.setItem(PACK_KEY, p.packId);
}
```

- [ ] **Step 4: Lancer le test, vérifier le succès**

Run: `npm test -- voicePrefs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/voicePrefs.ts tests/voicePrefs.test.ts
git commit -m "feat(voix): préférence de voix persistée (localStorage) avec validation"
```

---

### Task 3: Câblage UI — `useVoice` expose `engine`, `MeetingRoom` gère l'état, `MeetingLobby` affiche le choix + aperçu

**Files:**
- Modify: `lib/useVoice.ts` (exposer `engine`)
- Modify: `app/components/meeting/MeetingRoom.tsx`
- Modify: `app/components/meeting/MeetingLobby.tsx`

**Interfaces:**
- Consumes: `EDGE_SOLO_VOICES`, `EDGE_JURY_PACKS`, `soloVoiceById`, `juryVoicesByPack` (Task 1) ; `getVoicePref`, `setVoicePref`, `type VoicePref` (Task 2) ; `useVoice().engine`.
- Produces: rien pour d'autres tâches (feature terminale).

- [ ] **Step 1: Exposer `engine` depuis `useVoice`**

Dans `lib/useVoice.ts`, dans l'objet `return` du hook (actuellement lignes 184-193), ajouter `engine` :

```typescript
  return {
    engine,
    supported: engine === "browser" ? browser.supported : true,
    ready: engine !== "probing",
    speak,
    cancel,
    muted: browser.muted,
    toggleMute: browser.toggleMute,
    isSpeaking: engine === "edge" ? edgeSpeaking : browser.isSpeaking,
    voices: browser.voices,
  };
```

- [ ] **Step 2: Nouveau `MeetingLobby.tsx` (sélecteurs + aperçu)**

Remplacer tout le contenu de `app/components/meeting/MeetingLobby.tsx` :

```tsx
"use client";

import { Button } from "@/app/components/ui/Button";
import { EDGE_SOLO_VOICES, EDGE_JURY_PACKS } from "@/lib/edgeVoices";

type Props = {
  onJoin: () => void;
  engine: "probing" | "edge" | "browser";
  ready: boolean;
  jury: boolean;
  soloId: string;
  packId: string;
  onChangeSolo: (id: string) => void;
  onChangePack: (id: string) => void;
  onPreview: () => void;
};

export function MeetingLobby({
  onJoin,
  engine,
  ready,
  jury,
  soloId,
  packId,
  onChangeSolo,
  onChangePack,
  onPreview,
}: Props) {
  const showVoiceChoice = engine === "edge";
  return (
    <div className="flex flex-col items-center gap-6 rounded-2xl border border-slate-200 bg-white/80 p-10 text-center shadow-soft animate-rise">
      <span className="grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-2xl font-bold text-white shadow-brand">
        RH
      </span>
      <div>
        <h2 className="font-heading text-xl font-bold text-slate-900">Prêt pour ton entretien ?</h2>
        <p className="mt-1 text-sm text-slate-600">
          Le recruteur va te parler. Active le son de ton appareil.
        </p>
      </div>

      {showVoiceChoice && (
        <div className="flex w-full max-w-xs flex-col gap-2 text-left">
          <label className="text-sm font-medium text-slate-700">
            {jury ? "Voix du jury" : "Voix du recruteur"}
          </label>
          <div className="flex gap-2">
            {jury ? (
              <select
                value={packId}
                onChange={(e) => onChangePack(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {EDGE_JURY_PACKS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={soloId}
                onChange={(e) => onChangeSolo(e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {EDGE_SOLO_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            )}
            <Button variant="secondary" onClick={onPreview} disabled={!ready}>
              ▶ Écouter
            </Button>
          </div>
        </div>
      )}

      <Button size="lg" onClick={onJoin}>
        Rejoindre l&apos;entretien →
      </Button>
    </div>
  );
}
```

Note : `Button` accepte déjà `variant="secondary"` et `disabled` (voir `app/components/ui/Button.tsx` : `ButtonHTMLAttributes` + `variant?: "primary" | "secondary" | "ghost"`).

- [ ] **Step 3: Câbler l'état + l'aperçu dans `MeetingRoom.tsx`**

Dans `app/components/meeting/MeetingRoom.tsx` :

a) Compléter les imports :

```tsx
import { EDGE_PERSONA_VOICE, soloVoiceById, juryVoicesByPack } from "@/lib/edgeVoices";
import { getVoicePref, setVoicePref } from "@/lib/voicePrefs";
```

(remplace l'import actuel `import { EDGE_PERSONA_VOICE } from "@/lib/edgeVoices";`)

b) Récupérer `engine` du hook (ligne 40) :

```tsx
  const { engine, supported, ready, speak, cancel, muted, toggleMute, isSpeaking, voices } = useVoice();
```

c) Ajouter l'état de préférence (juste après la ligne `const [cameraOn, setCameraOn] = useState(false);`) :

```tsx
  const [pref, setPref] = useState(() => getVoicePref());
  function changeSolo(soloId: string) {
    setPref((p) => ({ ...p, soloId }));
    setVoicePref({ soloId });
  }
  function changePack(packId: string) {
    setPref((p) => ({ ...p, packId }));
    setVoicePref({ packId });
  }
  function previewVoice() {
    if (!ready) return;
    if (jury) {
      const v = juryVoicesByPack(pref.packId);
      speak("Bonjour, je suis la RH.", { edgeVoice: v.rh });
      speak("Et moi le manager opérationnel.", { edgeVoice: v.manager });
      speak("Et moi l'expert métier.", { edgeVoice: v.expert });
    } else {
      speak("Bonjour, installez-vous, nous allons commencer l'entretien.", {
        edgeVoice: soloVoiceById(pref.soloId),
      });
    }
  }
```

d) Utiliser la voix choisie quand le recruteur parle. Modifier `voiceOptsFor` (lignes 43-50) pour le jury :

```tsx
  function voiceOptsFor(id: PersonaId | null) {
    if (!id) return undefined;
    const idx = PERSONAS.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const p = PERSONAS[idx];
    const voice = voices.length ? voices[idx % voices.length] : undefined;
    return { pitch: p.pitch, rate: p.rate, voice, edgeVoice: juryVoicesByPack(pref.packId)[id] };
  }
```

Et pour le solo : dans l'effet qui fait parler le recruteur (la branche `else` autour de la ligne 91), passer la voix solo choisie. Remplacer :

```tsx
    const opts = jury ? voiceOptsFor(parseSpeaker(text).speaker) : undefined;
```

par :

```tsx
    const opts = jury
      ? voiceOptsFor(parseSpeaker(text).speaker)
      : { edgeVoice: soloVoiceById(pref.soloId) };
```

Ajouter `pref` aux dépendances de cet effet `useEffect` (la liste actuelle finit par `, jury, voices]`) → `, jury, voices, pref]`.

e) Passer les props au lobby (ligne 117) :

```tsx
  if (!joined) {
    return (
      <MeetingLobby
        onJoin={() => setJoined(true)}
        engine={engine}
        ready={ready}
        jury={jury}
        soloId={pref.soloId}
        packId={pref.packId}
        onChangeSolo={changeSolo}
        onChangePack={changePack}
        onPreview={previewVoice}
      />
    );
  }
```

- [ ] **Step 4: Vérifier la compilation + tests**

Run: `npm test && npx tsc --noEmit`
Expected: tests PASS, aucune erreur TypeScript.

- [ ] **Step 5: Vérification navigateur**

Run: `npm run dev`, ouvrir un entretien jusqu'au salon.
Vérifier :
- **Solo** : le sélecteur « Voix du recruteur » liste 4 voix ; ▶ Écouter joue la voix choisie ; changer de voix puis Écouter change la voix ; rejoindre → le recruteur parle avec la voix choisie.
- **Jury** (relancer un entretien en mode jury) : sélecteur « Voix du jury » liste les packs ; ▶ Écouter joue 3 voix distinctes ; rejoindre → les 3 personas utilisent les voix du pack.
- **Persistance** : choisir une voix, recharger la page, revenir au salon → la voix choisie est pré-sélectionnée.
- **Repli** : (optionnel, difficile à forcer) si `engine === "browser"`, le bloc de choix est absent et l'entretien fonctionne comme avant.

- [ ] **Step 6: Commit**

```bash
git add lib/useVoice.ts app/components/meeting/MeetingRoom.tsx app/components/meeting/MeetingLobby.tsx
git commit -m "feat(voix): choix de la voix du recruteur dans le salon (solo + packs jury, aperçu)"
```

---

## Self-Review

**Spec coverage :**
- Données (EDGE_SOLO_VOICES, packs, allowlist union) → Task 1. ✅
- Préférence persistée + validation → Task 2. ✅
- UI salon (sélecteur solo/jury, aperçu ▶, gating edge) → Task 3 (steps 2-3). ✅
- Câblage voix recruteur (solo + jury) → Task 3 step 3d. ✅
- Init depuis localStorage + survie salon→entretien (état dans MeetingRoom) → Task 3 step 3c. ✅
- Cas limites (localStorage corrompu, invariant allowlist, repli navigateur, aperçu avant `ready`) → Task 1 tests, Task 2 tests, Task 3 gating + `disabled={!ready}`. ✅
- Hors périmètre (par-persona, pitch/rate, base) → non implémentés. ✅

**Placeholders :** aucun — code complet à chaque étape.

**Type consistency :** `VoicePref { soloId, packId }`, `soloVoiceById`/`juryVoicesByPack`, `EDGE_SOLO_VOICES`/`EDGE_JURY_PACKS`, `engine` cohérents entre tasks. `SpeakOpts.edgeVoice` déjà défini dans `useVoice.ts`. Défauts `"denise"`/`"pack1"` cohérents.
