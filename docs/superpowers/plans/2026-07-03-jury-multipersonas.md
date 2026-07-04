# Jury multi-personas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un mode « jury » activable où trois recruteurs IA (RH, Manager opérationnel, Expert métier) se relaient dans l'entretien, avec voix distinctes et 3 tuiles.

**Architecture:** Un seul appel LLM joue tout le jury via un prompt dédié ; chaque réplique est préfixée du nom du persona (`RH : …`). Un helper pur `parseSpeaker` extrait le persona pour animer la bonne tuile et choisir les paramètres de voix. Le mode solo reste le défaut, inchangé.

**Tech Stack:** Next.js App Router + TypeScript, Groq via `lib/askModel` (streaming), Web Speech API (`speechSynthesis`), vitest.

**Spec:** `docs/superpowers/specs/2026-07-03-jury-multipersonas-design.md`

## Global Constraints

- **Copie UI en français.** Aucune nouvelle dépendance. Composants navigateur `"use client"` (déjà en place).
- **Le mode solo reste inchangé** : toute signature modifiée reste rétro-compatible (nouveaux paramètres optionnels / props avec valeurs par défaut).
- **Personas exacts** : `RH`, `Manager opérationnel`, `Expert métier` — ces noms servent de préfixe et de libellé, à l'orthographe près.
- Tests via **vitest** (`npm test`), descriptions en français, style de `tests/parseDebrief.test.ts` / `tests/prompts.test.ts`.
- Le préfixe persona ne doit **pas être prononcé** par la synthèse vocale (on lit le corps sans le préfixe).

---

### Task 1: `lib/jury.ts` — personas + `parseSpeaker`

**Files:**
- Create: `lib/jury.ts`
- Test: `tests/jury.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type PersonaId = "rh" | "manager" | "expert"`
  - `type Persona = { id: PersonaId; name: string; initials: string; pitch: number; rate: number }`
  - `const PERSONAS: Persona[]` (ordre : rh, manager, expert)
  - `parseSpeaker(text: string): { speaker: PersonaId | null; body: string }`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `tests/jury.test.ts` :

```ts
import { describe, it, expect } from "vitest";
import { parseSpeaker, PERSONAS } from "../lib/jury";

describe("parseSpeaker", () => {
  it("repère le persona et retire le préfixe du corps", () => {
    expect(parseSpeaker("RH : Parlez-moi de vous.")).toEqual({
      speaker: "rh",
      body: "Parlez-moi de vous.",
    });
  });

  it("gère les noms composés", () => {
    expect(parseSpeaker("Manager opérationnel : Une mise en situation.")).toEqual({
      speaker: "manager",
      body: "Une mise en situation.",
    });
    expect(parseSpeaker("Expert métier : Décrivez votre stack.").speaker).toBe("expert");
  });

  it("tolère l'absence ou l'excès d'espaces autour du deux-points", () => {
    expect(parseSpeaker("RH:Sans espace").speaker).toBe("rh");
    expect(parseSpeaker("RH   :   Large").body).toBe("Large");
  });

  it("renvoie speaker null et le texte intact sans préfixe connu", () => {
    expect(parseSpeaker("Bonjour, je suis là.")).toEqual({
      speaker: null,
      body: "Bonjour, je suis là.",
    });
  });
});

describe("PERSONAS", () => {
  it("contient les 3 personas avec des paramètres de voix", () => {
    expect(PERSONAS.map((p) => p.id)).toEqual(["rh", "manager", "expert"]);
    for (const p of PERSONAS) {
      expect(typeof p.pitch).toBe("number");
      expect(typeof p.rate).toBe("number");
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.initials.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npm test -- jury`
Expected: FAIL — module `../lib/jury` introuvable.

- [ ] **Step 3: Implémenter `lib/jury.ts`**

```ts
export type PersonaId = "rh" | "manager" | "expert";

export type Persona = {
  id: PersonaId;
  name: string; // nom exact, sert de préfixe et de libellé
  initials: string; // avatar de la tuile
  pitch: number; // paramètre speechSynthesis
  rate: number; // paramètre speechSynthesis
};

// Ordre = ordre d'affichage des tuiles.
export const PERSONAS: Persona[] = [
  { id: "rh", name: "RH", initials: "RH", pitch: 1.1, rate: 1.0 },
  { id: "manager", name: "Manager opérationnel", initials: "MO", pitch: 0.85, rate: 0.95 },
  { id: "expert", name: "Expert métier", initials: "EM", pitch: 1.05, rate: 1.05 },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Repère quel persona parle d'après le préfixe "Nom : …" en tête du texte,
// et renvoie le corps sans ce préfixe. Aucun préfixe connu → speaker null.
export function parseSpeaker(text: string): { speaker: PersonaId | null; body: string } {
  for (const p of PERSONAS) {
    const re = new RegExp(`^\\s*${escapeRegExp(p.name)}\\s*:\\s*`, "i");
    const m = text.match(re);
    if (m) return { speaker: p.id, body: text.slice(m[0].length) };
  }
  return { speaker: null, body: text };
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npm test -- jury`
Expected: PASS (parseSpeaker + PERSONAS).

- [ ] **Step 5: Commit**

```bash
git add lib/jury.ts tests/jury.test.ts
git commit -m "feat: lib/jury (personas + parseSpeaker)"
```

---

### Task 2: `buildJuryPrompt`

**Files:**
- Modify: `lib/prompts.ts` (ajout d'une fonction, réutilise `contextLines` déjà présent)
- Test: `tests/prompts.test.ts` (ajout d'un `describe`)

**Interfaces:**
- Consumes: `InterviewContext` (déjà importé dans `prompts.ts`), `contextLines` (fonction privée existante du fichier).
- Produces: `buildJuryPrompt(ctx: InterviewContext): string`.

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `tests/prompts.test.ts`, ajouter `buildJuryPrompt` à l'import depuis `../lib/prompts`, puis ajouter à la fin :

```ts
describe("buildJuryPrompt", () => {
  it("inclut les trois personas", () => {
    const p = buildJuryPrompt(ctx);
    expect(p).toContain("RH");
    expect(p).toContain("Manager opérationnel");
    expect(p).toContain("Expert métier");
  });

  it("impose un seul persona par tour, préfixé de son nom", () => {
    const p = buildJuryPrompt(ctx);
    expect(p).toContain("UN SEUL persona");
    expect(p.toLowerCase()).toContain("nom exact");
  });

  it("inclut le poste et gère un CV absent sans planter", () => {
    expect(buildJuryPrompt(ctx)).toContain("Développeur back-end");
    const sansCv: InterviewContext = { poste: "Vendeur", cv: "" };
    expect(buildJuryPrompt(sansCv)).toContain("Vendeur");
  });
});
```

(`ctx` et l'import de type `InterviewContext` existent déjà en haut du fichier de test.)

- [ ] **Step 2: Lancer les tests pour vérifier l'échec**

Run: `npm test -- prompts`
Expected: FAIL — `buildJuryPrompt is not a function`.

- [ ] **Step 3: Implémenter `buildJuryPrompt`**

Dans `lib/prompts.ts`, ajouter à la fin (utilise `contextLines` déjà défini dans le fichier) :

```ts
export function buildJuryPrompt(ctx: InterviewContext): string {
  return `Tu incarnes un JURY d'entretien composé de trois personas qui font passer l'entretien ensemble :
- « RH » : motivation, parcours, soft skills, adéquation culturelle.
- « Manager opérationnel » : le futur responsable ; mises en situation, priorisation, concret du poste, travail en équipe.
- « Expert métier » : profondeur du savoir-faire spécifique au poste.

IMPORTANT : mène TOUT l'entretien, dès le premier mot, dans la « Langue de l'entretien » indiquée ci-dessous — même si ces instructions sont en français.

${contextLines(ctx)}

Règles :
- À CHAQUE tour, UN SEUL persona prend la parole. Commence ta réplique par son nom EXACT suivi de " : " — exactement « RH : », « Manager opérationnel : » ou « Expert métier : » — puis sa réplique.
- Fais tourner la parole naturellement entre les trois selon la pertinence (le RH ouvre et sonde la motivation, l'expert creuse la technique, le manager met en situation), sans ordre rigide et sans annoncer les tours.
- Calibre la difficulté sur le « Niveau » indiqué ; sans niveau, déduis-le du CV. Si aucun CV n'est fourni, n'invente PAS de parcours à la place du candidat et pose des questions d'entrée adaptées à un débutant.
- Déroulé en phases : mise en confiance → questions techniques → mises en situation → questions pièges. Une seule question à la fois, puis attends la réponse du candidat.
- Quand une réponse est vague, le persona qui a la parole relance : demande un exemple concret, un chiffre, un « comment » ou un « pourquoi ».
- Interventions courtes et orales, pas de monologue ni de listes à puces. Reste dans les personnages ; pas de feedback pendant l'entretien.
- Si un détail manque (ton nom, l'entreprise…), invente-le naturellement. N'écris JAMAIS d'autres crochets ni de champs à remplir du type « [entreprise] » (le préfixe « Nom : » n'est PAS un crochet, garde-le).
- Réponds dans la langue de l'entretien indiquée ci-dessus.`;
}
```

- [ ] **Step 4: Lancer les tests pour vérifier le succès**

Run: `npm test -- prompts`
Expected: PASS (tests existants + `buildJuryPrompt`).

- [ ] **Step 5: Commit**

```bash
git add lib/prompts.ts tests/prompts.test.ts
git commit -m "feat: buildJuryPrompt (jury 3 personas, un par tour)"
```

---

### Task 3: Flag `jury` dans la route `/api/interview`

**Files:**
- Modify: `app/api/interview/route.ts`

**Interfaces:**
- Consumes: `buildJuryPrompt` (Task 2), `buildRecruiterPrompt` (existant).
- Produces: la route accepte `{ context, history, jury?: boolean }` et choisit le prompt selon `jury`.

*Note : route calquée sur l'existant, pas de test unitaire (comme le reste des routes) ; vérif au build + navigateur en Task 5.*

- [ ] **Step 1: Modifier l'import du prompt**

Dans `app/api/interview/route.ts`, remplacer :

```ts
import { buildRecruiterPrompt } from "@/lib/prompts";
```

par :

```ts
import { buildRecruiterPrompt, buildJuryPrompt } from "@/lib/prompts";
```

- [ ] **Step 2: Étendre le type du body**

Remplacer :

```ts
  let body: { context: InterviewContext; history: ChatMessage[] };
```

par :

```ts
  let body: { context: InterviewContext; history: ChatMessage[]; jury?: boolean };
```

- [ ] **Step 3: Choisir le prompt selon le flag**

Remplacer :

```ts
  const systemPrompt = buildRecruiterPrompt(body.context);
```

par :

```ts
  const systemPrompt = body.jury
    ? buildJuryPrompt(body.context)
    : buildRecruiterPrompt(body.context);
```

- [ ] **Step 4: Vérifier build + suite**

Run: `npm run build && npm test`
Expected: build OK, tous les tests verts (aucun cassé).

- [ ] **Step 5: Commit**

```bash
git add app/api/interview/route.ts
git commit -m "feat: /api/interview accepte le flag jury"
```

---

### Task 4: Primitives UI — `RecruiterTile` paramétrée + `useSpeech.speak` options de voix

**Files:**
- Modify: `app/components/meeting/RecruiterTile.tsx`
- Modify: `lib/useSpeech.ts`

**Interfaces:**
- Consumes: rien de nouveau.
- Produces (consommés en Task 5) :
  - `RecruiterTile({ speaking, name?, initials? })` — `name` défaut `"Recruteur"`, `initials` défaut `"RH"`.
  - `useSpeech()` retourne en plus `voices: SpeechSynthesisVoice[]` (voix FR filtrées).
  - `speak(text, opts?)` avec `opts?: { pitch?: number; rate?: number; voice?: SpeechSynthesisVoice }`.

- [ ] **Step 1: Paramétrer `RecruiterTile`**

Remplacer intégralement `app/components/meeting/RecruiterTile.tsx` par :

```tsx
export function RecruiterTile({
  speaking,
  name = "Recruteur",
  initials = "RH",
}: {
  speaking: boolean;
  name?: string;
  initials?: string;
}) {
  return (
    <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 text-white shadow-soft">
      {speaking && (
        <span className="absolute inset-0 animate-pulse rounded-2xl ring-4 ring-brand-500/50" aria-hidden />
      )}
      <div className="flex flex-col items-center gap-3">
        <span
          className={`grid h-20 w-20 place-items-center rounded-full bg-brand-600 text-2xl font-bold transition-transform ${
            speaking ? "scale-110" : "scale-100"
          }`}
        >
          {initials}
        </span>
        <span className="text-sm font-medium text-slate-200">
          {name} {speaking && <span className="text-brand-300">· parle…</span>}
        </span>
      </div>
    </div>
  );
}
```

(Le mode solo appelle `<RecruiterTile speaking={...} />` → `name="Recruteur"`, `initials="RH"` : rendu identique à aujourd'hui.)

- [ ] **Step 2: `useSpeech` — exposer les voix FR et accepter des options dans `speak`**

Dans `lib/useSpeech.ts` :

Ajouter un état pour les voix, sous les états existants :

```ts
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
```

Dans l'effet, remplacer la fonction `pickVoice` par :

```ts
    const pickVoice = () => {
      const all = window.speechSynthesis.getVoices();
      const fr = all.filter((v) => v.lang.startsWith("fr"));
      setVoices(fr);
      voiceRef.current = fr[0] ?? all[0] ?? null;
    };
```

Remplacer le `useCallback` de `speak` par (ajoute `opts`, rétro-compatible) :

```ts
  const speak = useCallback(
    (
      text: string,
      opts?: { pitch?: number; rate?: number; voice?: SpeechSynthesisVoice }
    ) => {
      if (!supported || mutedRef.current || !text.trim()) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "fr-FR";
      if (opts?.voice) u.voice = opts.voice;
      else if (voiceRef.current) u.voice = voiceRef.current;
      if (opts?.pitch !== undefined) u.pitch = opts.pitch;
      if (opts?.rate !== undefined) u.rate = opts.rate;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [supported]
  );
```

Ajouter `voices` à l'objet retourné :

```ts
  return { supported, speak, cancel, muted, toggleMute, isSpeaking, voices };
```

- [ ] **Step 3: Vérifier build + suite**

Run: `npm run build && npm test`
Expected: build OK (les deux fichiers compilent, le mode solo n'appelle `speak` qu'avec un argument), tous les tests verts.

- [ ] **Step 4: Commit**

```bash
git add app/components/meeting/RecruiterTile.tsx lib/useSpeech.ts
git commit -m "feat: RecruiterTile paramétrée + useSpeech voix/options"
```

---

### Task 5: Mode jury dans l'UI — toggle (page) + MeetingRoom multi-tuiles/voix

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/components/meeting/MeetingRoom.tsx`

**Interfaces:**
- Consumes: `PERSONAS`, `parseSpeaker`, `PersonaId` (`@/lib/jury`, Task 1) ; `RecruiterTile` param + `useSpeech.voices`/`speak(opts)` (Task 4) ; flag `jury` de la route (Task 3).
- Produces: mode jury fonctionnel de bout en bout.

- [ ] **Step 1: `page.tsx` — état + envoi du flag**

Dans `app/page.tsx` :

Ajouter l'état, après `const [templateId, setTemplateId] = useState<string | null>(null);` :

```ts
  const [jury, setJury] = useState(false);
```

Dans `streamRecruiter`, remplacer le body du fetch :

```ts
        body: JSON.stringify({ context, history: nextHistory }),
```

par :

```ts
        body: JSON.stringify({ context, history: nextHistory, jury }),
```

- [ ] **Step 2: `page.tsx` — toggle dans le formulaire**

Dans `app/page.tsx`, juste avant le `<Button ... onClick={startInterview}>` (le bouton « Démarrer l'entretien → »), insérer :

```tsx
            <label className="mb-3 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={jury}
                onChange={(e) => setJury(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Mode jury — 3 recruteurs (RH, Manager opérationnel, Expert métier)
            </label>
```

- [ ] **Step 3: `page.tsx` — passer `jury` à MeetingRoom**

Dans le rendu de la phase `chat`, ajouter la prop `jury={jury}` au `<MeetingRoom ... />` :

```tsx
        <MeetingRoom
          history={history}
          streaming={streaming}
          currentAnswer={currentAnswer}
          setCurrentAnswer={setCurrentAnswer}
          sendAnswer={sendAnswer}
          finishInterview={finishInterview}
          errorMsg={errorMsg}
          jury={jury}
        />
```

- [ ] **Step 4: `MeetingRoom` — imports + prop `jury`**

Dans `app/components/meeting/MeetingRoom.tsx` :

Ajouter aux imports (après l'import de `nextSpeakableChunk`) :

```ts
import { PERSONAS, parseSpeaker, type PersonaId } from "@/lib/jury";
```

Ajouter `jury: boolean;` au type `Props`, et `jury` à la déstructuration des props de `MeetingRoom`.

- [ ] **Step 5: `MeetingRoom` — voix par persona + parole sans préfixe**

Récupérer `voices` du hook — remplacer :

```ts
  const { supported, speak, cancel, muted, toggleMute, isSpeaking } = useSpeech();
```

par :

```ts
  const { supported, speak, cancel, muted, toggleMute, isSpeaking, voices } = useSpeech();

  // Voix + paramètres du persona courant (mode jury).
  function voiceOptsFor(id: PersonaId | null) {
    if (!id) return undefined;
    const idx = PERSONAS.findIndex((p) => p.id === id);
    const p = PERSONAS[idx];
    const voice = voices.length ? voices[idx % voices.length] : undefined;
    return { pitch: p.pitch, rate: p.rate, voice };
  }
```

Dans l'effet qui fait parler le recruteur, remplacer le corps de la boucle pour retirer le préfixe à l'oral et appliquer la voix du persona. Remplacer :

```ts
    const text = history[lastIdx].text;
    let len = spokenRef.current.len;
    let guard = 0;
    while (guard++ < 200) {
      const res = nextSpeakableChunk(text, len);
      if (res.spokenLen === len) break;
      if (res.chunk) speak(res.chunk);
      len = res.spokenLen;
    }
    spokenRef.current = { index: lastIdx, len };
```

par :

```ts
    const text = history[lastIdx].text;
    const opts = jury ? voiceOptsFor(parseSpeaker(text).speaker) : undefined;
    let len = spokenRef.current.len;
    let guard = 0;
    while (guard++ < 200) {
      const res = nextSpeakableChunk(text, len);
      if (res.spokenLen === len) break;
      if (res.chunk) {
        // En mode jury, ne prononce pas le préfixe "Nom : " du premier chunk.
        const chunkText = jury ? parseSpeaker(res.chunk).body : res.chunk;
        speak(chunkText, opts);
      }
      len = res.spokenLen;
    }
    spokenRef.current = { index: lastIdx, len };
```

Ajouter `jury` au tableau de dépendances de cet effet (`[history, joined, muted, speak, jury]`).

- [ ] **Step 6: `MeetingRoom` — rendu 3 tuiles en mode jury**

Dans `MeetingRoom`, juste avant le `return (` du JSX, calculer le persona courant :

```ts
  let lastRecruiterText = "";
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "recruiter") {
      lastRecruiterText = history[i].text;
      break;
    }
  }
  const currentSpeaker = jury ? parseSpeaker(lastRecruiterText).speaker : null;
```

Remplacer le bloc de la grille des tuiles :

```tsx
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <RecruiterTile speaking={isSpeaking} />
        </div>
        <UserTile cameraOn={cameraOn} />
      </div>
```

par :

```tsx
      {jury ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-2">
            {PERSONAS.map((p) => (
              <RecruiterTile
                key={p.id}
                name={p.name}
                initials={p.initials}
                speaking={isSpeaking && currentSpeaker === p.id}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <UserTile cameraOn={cameraOn} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <RecruiterTile speaking={isSpeaking} />
          </div>
          <UserTile cameraOn={cameraOn} />
        </div>
      )}
```

- [ ] **Step 7: Vérifier build + suite**

Run: `npm run build && npm test`
Expected: build OK, tous les tests verts.

- [ ] **Step 8: Vérification navigateur (manuelle, Chrome/Edge)**

`npm run dev`, remplir le formulaire, **cocher « Mode jury »**, démarrer, rejoindre la réunion :
1. 3 tuiles (RH / Manager opérationnel / Expert métier) au-dessus de la tuile candidat.
2. Le recruteur qui parle est préfixé (`RH : …`) dans la transcription ; le préfixe **n'est pas prononcé**.
3. Seule la tuile du persona courant est animée.
4. Les voix se distinguent (pitch/débit différents selon le persona).
5. Répondre → un autre persona peut prendre la parole.
6. Sans cocher : entretien solo inchangé (1 tuile, 1 voix).

- [ ] **Step 9: Commit**

```bash
git add app/page.tsx app/components/meeting/MeetingRoom.tsx
git commit -m "feat: mode jury dans l'UI (toggle + 3 tuiles + voix par persona)"
```

---

## Self-Review

- **Couverture spec :** personas trio fixe + `parseSpeaker` (T1) ✅ ; orchestration un appel LLM `buildJuryPrompt` (T2) ✅ ; flag route (T3) ✅ ; voix distinctes via `speak(opts)` + `voices` + mapping persona (T4 + T5 step 5) ✅ ; mode activable toggle + état + body (T5 steps 1-3) ✅ ; UI 3 tuiles + tuile active via `parseSpeaker` (T5 step 6) ✅ ; préfixe non prononcé (T5 step 5) ✅ ; solo inchangé (RecruiterTile défauts T4, branche `jury ?` T5) ✅ ; débrief inchangé (aucune tâche = correct, le transcript préfixé passe tel quel) ✅ ; fallback `speechSynthesis` absent (hérité de useSpeech, inchangé) ✅. Toutes les sections du spec sont couvertes.
- **Placeholders :** aucun — code réel à chaque step.
- **Cohérence des types :** `PersonaId`/`Persona`/`PERSONAS`/`parseSpeaker` définis en T1, consommés à l'identique en T5 ; `speak(text, opts?)` et `voices` définis en T4, consommés en T5 ; `RecruiterTile` props (T4) = celles passées en T5 ; flag `jury` cohérent entre `page.tsx` (T5) → route (T3) et `MeetingRoom` prop (T5). Le persona courant utilise `parseSpeaker(...).speaker` (type `PersonaId | null`) comparé à `p.id` (`PersonaId`) — cohérent.
