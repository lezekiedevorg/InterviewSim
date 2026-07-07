# IA d'entretien v2 — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Passer toute l'IA sur `openai/gpt-oss-120b` (effort de réflexion bas en entretien, moyen au débrief) et imposer une règle d'or « 2-4 phrases, UNE SEULE question » en tête des prompts recruteur et jury.

**Architecture:** `lib/askModel.ts` est l'unique point de contact Groq : on y change la constante `MODEL` et on ajoute `reasoning_effort` (low si stream, medium sinon, envoyé seulement pour les modèles gpt-oss). La règle d'or s'insère dans `buildRecruiterPrompt` et `buildJuryPrompt` juste après la consigne de langue, AVANT le contexte — indépendante du point d'insertion de l'attitude (difficulté), donc la non-régression octet pour octet de la difficulté reste vraie. Spec : `docs/superpowers/specs/2026-07-07-ia-entretien-v2-design.md`.

**Tech Stack:** Next.js + TypeScript, Vitest (mock de `fetch` via `vi.stubGlobal`), API Groq OpenAI-compatible.

## Global Constraints

- Texte utilisateur en **français**. **Zéro dépendance npm ajoutée.**
- Modèle exact : `openai/gpt-oss-120b`. `reasoning_effort` : `"low"` si `stream === true`, `"medium"` sinon — envoyé UNIQUEMENT si le modèle commence par `openai/gpt-oss` (le repli débrief→llama prévu par la spec rejetterait ce paramètre).
- **Le prompt débrief ne change pas** (contenu, température 0, retry 0.2 — rien).
- Non-régression : toute la suite existante passe SANS modification des tests existants (la règle d'or est un ajout aux deux variantes réaliste/difficulté à la fois).
- Branche : `feat/ia-entretien` (déjà active). Commandes : `npm test`, `npm run build`, `npx tsc --noEmit`.

---

### Task 1 : `lib/askModel.ts` — modèle + effort de réflexion (TDD)

**Files:**
- Modify: `lib/askModel.ts` (constante `MODEL` ligne 6, corps de `post` lignes 36-42)
- Test: `tests/askModel.test.ts` (nouveau)

**Interfaces:**
- Produces: mêmes signatures qu'avant (`askModelStream(systemPrompt, history)`, `askModelText(systemPrompt, history, opts?)`) — seuls le modèle envoyé et le champ `reasoning_effort` du body changent.

- [ ] **Step 1 : Écrire les tests qui échouent — `tests/askModel.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { askModelText, askModelStream } from "../lib/askModel";

// Fabrique un flux SSE minimal : un chunk de contenu puis [DONE].
function sseBody(): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(c) {
      c.enqueue(enc.encode('data: {"choices":[{"delta":{"content":"ok"}}]}\n'));
      c.enqueue(enc.encode("data: [DONE]\n"));
      c.close();
    },
  });
}

function stubFetch(res: Partial<Response>) {
  const fn = vi.fn().mockResolvedValue({ ok: true, ...res });
  vi.stubGlobal("fetch", fn);
  return fn;
}

beforeEach(() => {
  process.env.GROQ_API_KEY = "clef-de-test";
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("askModel — modèle et effort de réflexion", () => {
  it("askModelText envoie gpt-oss-120b, reasoning_effort medium, stream false", async () => {
    const fn = stubFetch({ json: async () => ({ choices: [{ message: { content: "ok" } }] }) });
    await askModelText("sys", []);
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("openai/gpt-oss-120b");
    expect(body.reasoning_effort).toBe("medium");
    expect(body.stream).toBe(false);
  });

  it("askModelText transmet toujours la température quand demandée", async () => {
    const fn = stubFetch({ json: async () => ({ choices: [{ message: { content: "ok" } }] }) });
    await askModelText("sys", [], { temperature: 0 });
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.temperature).toBe(0);
    expect(body.reasoning_effort).toBe("medium");
  });

  it("askModelStream envoie reasoning_effort low et stream true", async () => {
    const fn = stubFetch({ body: sseBody() });
    const out: string[] = [];
    for await (const t of askModelStream("sys", [])) out.push(t);
    expect(out.join("")).toBe("ok");
    const body = JSON.parse((fn.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("openai/gpt-oss-120b");
    expect(body.reasoning_effort).toBe("low");
    expect(body.stream).toBe(true);
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run : `npm test 2>&1 | tail -8`
Attendu : ÉCHEC — le body contient `llama-3.3-70b-versatile` et pas de `reasoning_effort`.

- [ ] **Step 3 : Implémenter dans `lib/askModel.ts`**

Remplacer la ligne 6 :

```ts
const MODEL = "openai/gpt-oss-120b";
```

Et dans `post`, remplacer le `body: JSON.stringify({...})` par :

```ts
    body: JSON.stringify({
      model: MODEL,
      messages: toMessages(systemPrompt, history),
      stream,
      // gpt-oss : réfléchit peu quand il parle en direct (latence voix), davantage quand il corrige.
      // Envoyé seulement pour gpt-oss : un repli vers llama rejetterait ce paramètre.
      ...(MODEL.startsWith("openai/gpt-oss") && {
        reasoning_effort: stream ? "low" : "medium",
      }),
      // Température imposée uniquement quand demandé (débrief : 0 → correcteur froid et régulier)
      ...(temperature !== undefined && { temperature }),
    }),
```

(Mettre à jour aussi le commentaire de tête du fichier si besoin — le choix Groq reste, seul le modèle change.)

- [ ] **Step 4 : Vérifier que tout passe**

Run : `npm test 2>&1 | tail -4`
Attendu : PASS (nouveaux + toute la suite).

- [ ] **Step 5 : Commit**

```bash
git add lib/askModel.ts tests/askModel.test.ts
git commit -m "feat(ia): gpt-oss-120b pour tout, effort de réflexion bas en entretien et moyen au débrief"
```

---

### Task 2 : Règle d'or « une seule question » dans les prompts recruteur et jury (TDD)

**Files:**
- Modify: `lib/prompts.ts` (`buildRecruiterPrompt` et `buildJuryPrompt` uniquement)
- Test: `tests/prompts.test.ts` (ajouts uniquement — aucun test existant ne change)

**Interfaces:**
- Consumes: rien de nouveau. Produces: mêmes signatures.

- [ ] **Step 1 : Ajouter les tests — nouveau `describe` à la fin de `tests/prompts.test.ts`**

```ts
describe("règle d'or — une seule question par réplique", () => {
  const transcript: ChatMessage[] = [
    { role: "recruiter", text: "Parlez-moi de vous." },
    { role: "candidate", text: "Je suis développeur." },
  ];

  it("recruteur : la règle d'or est présente, AVANT le contexte", () => {
    const p = buildRecruiterPrompt(ctx);
    expect(p).toContain("RÈGLE D'OR");
    expect(p).toContain("UNE SEULE question");
    expect(p.indexOf("RÈGLE D'OR")).toBeLessThan(p.indexOf("Poste visé"));
  });

  it("jury : la règle d'or est présente aussi", () => {
    const p = buildJuryPrompt(ctx);
    expect(p).toContain("RÈGLE D'OR");
    expect(p).toContain("UNE SEULE question");
  });

  it("la règle d'or précède le bloc d'attitude de la difficulté (elle le domine)", () => {
    const p = buildRecruiterPrompt({ ...ctx, difficulte: "sans-pitie" });
    expect(p.indexOf("RÈGLE D'OR")).toBeLessThan(p.indexOf("Attitude imposée"));
  });

  it("le prompt débrief ne contient PAS la règle d'or", () => {
    expect(buildDebriefPrompt(ctx, transcript)).not.toContain("RÈGLE D'OR");
  });
});
```

- [ ] **Step 2 : Vérifier l'échec**

Run : `npm test 2>&1 | tail -8`
Attendu : ÉCHEC — les prompts ne contiennent pas « RÈGLE D'OR ».

- [ ] **Step 3 : Implémenter dans `lib/prompts.ts`**

Dans `buildRecruiterPrompt`, le template contient aujourd'hui :

```
IMPORTANT : mène TOUT l'entretien, dès le premier mot, dans la « Langue de l'entretien » indiquée ci-dessous — même si ces instructions sont en français.

${contextLines(ctx)}
```

Insérer ENTRE la ligne IMPORTANT et `${contextLines(ctx)}` (avec une ligne vide de chaque côté) :

```
RÈGLE D'OR (elle domine TOUT le reste, y compris les consignes de difficulté s'il y en a) : chaque réplique fait 2 à 4 phrases orales MAXIMUM et pose UNE SEULE question — un seul point d'interrogation. Si plusieurs points méritent d'être creusés, choisis le plus important ; les autres attendront les prochains tours.
```

Faire EXACTEMENT la même insertion dans `buildJuryPrompt` (même position : entre sa ligne IMPORTANT et son `${contextLines(ctx)}`), avec la variante jury :

```
RÈGLE D'OR (elle domine TOUT le reste, y compris les consignes de difficulté s'il y en a) : la réplique du persona qui parle fait 2 à 4 phrases orales MAXIMUM et pose UNE SEULE question — un seul point d'interrogation. Si plusieurs points méritent d'être creusés, choisis le plus important ; les autres attendront les prochains tours.
```

Ne toucher à RIEN d'autre : ni au bloc `${attitude}`, ni aux listes « Règles : », ni à `buildDebriefPrompt`.

- [ ] **Step 4 : Vérifier que tout passe (y compris la non-régression difficulté)**

Run : `npm test 2>&1 | tail -4`
Attendu : PASS — les tests d'octet pour octet de la difficulté passent toujours (la règle d'or est ajoutée aux deux variantes comparées à la fois).

- [ ] **Step 5 : Commit**

```bash
git add lib/prompts.ts tests/prompts.test.ts
git commit -m "feat(ia): règle d'or en tête des prompts recruteur et jury — 2-4 phrases, une seule question par réplique"
```

---

### Task 3 : Vérification réelle + push

**Files:** aucun nouveau.

- [ ] **Step 1 : Suite complète**

Run : `npm run build 2>&1 | tail -3 && npm test 2>&1 | tail -5 && npx tsc --noEmit`
Attendu : tout vert.

- [ ] **Step 2 : Entretien réel via l'API (compte les « ? » par réplique)**

Lancer `npm run dev` (arrière-plan), puis dérouler un entretien de 4 tours via `POST /api/interview` (contexte : poste « Développeur junior », réponses volontairement vagues) et vérifier sur CHAQUE réplique du recruteur : exactement un « ? », 2-4 phrases, français naturel. Tester aussi un tour en `difficulte: "sans-pitie"` : le ton doit rester sec MAIS une seule question. Arrêter le serveur.

- [ ] **Step 3 : Débrief réel**

Avec le transcript du Step 2, `POST /api/debrief` : JSON valide au premier coup, 5 critères notés, preuves = citations exactes du candidat, score global cohérent avec une prestation vague (< 50 attendu).

- [ ] **Step 4 : Pousser la branche**

```bash
git push origin feat/ia-entretien
```

- [ ] **Step 5 : Validation finale utilisateur (PENDING)**

L'utilisateur fait un entretien complet à la voix : fluidité, une question par tour, jeu de rôle plus fin. C'est lui qui tranche ; en cas de déception sur la notation du débrief, appliquer le repli prévu par la spec (débrief seul sur `llama-3.3-70b-versatile`).
