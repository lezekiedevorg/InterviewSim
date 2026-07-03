# Jury multi-personas (design)

Date : 2026-07-03
Branche : `feat/jury`
Prolonge : la phase entretien (mode réunion vocal v1/v2).

## Objectif

Permettre un entretien face à un **jury de plusieurs recruteurs IA** (RH,
Manager opérationnel, Expert métier) qui se relaient, au lieu d'un seul
recruteur. Mode **activable** : l'entretien solo reste le défaut.

## Décisions

- **Orchestration : un seul appel LLM.** Un prompt enrichi fait jouer tout le
  jury ; à chaque tour un seul persona parle. Pas de routeur ni d'appels
  multiples. (Le routeur explicite pourra venir si le modèle triche sur la
  rotation.)
- **Personas : trio fixe et générique** — RH, Manager opérationnel, Expert
  métier. Rôles universels (« Expert métier » s'adapte à tout poste).
  (Adaptatif / choisi par l'utilisateur = reporté.)
- **Voix distinctes par pitch/débit** — même `speechSynthesis`, paramètres de
  voix différents par persona ; voix FR différente par persona si le navigateur
  en propose plusieurs, sinon même voix + pitch/débit variés. Fallback texte si
  non supporté (comme v1).
- **Mode activable** — toggle « Mode jury » dans le formulaire ; solo par défaut.
- **Débrief inchangé** — global (pas par persona) pour v1.

## Périmètre

**Dans ce spec :** jury à 3 personas fixes, un qui parle par tour, voix
distinctes, mode activable, UI multi-tuiles.

**Hors périmètre (plus tard) :** personas adaptatifs/choisis, débrief par
persona, plusieurs personas dans le même tour, routeur explicite.

## Architecture

### 1. `lib/jury.ts` (nouveau) — personas + parsing

```ts
export type PersonaId = "rh" | "manager" | "expert";

export type Persona = {
  id: PersonaId;
  name: string;      // nom exact utilisé comme préfixe, ex. "Manager opérationnel"
  initials: string;  // pour l'avatar de la tuile, ex. "MO"
  pitch: number;     // paramètre speechSynthesis
  rate: number;      // paramètre speechSynthesis
};

export const PERSONAS: Persona[]; // les 3, dans l'ordre d'affichage RH / Manager / Expert

// Repère quel persona parle d'après le préfixe "Nom : …" en tête du texte.
export function parseSpeaker(text: string): { speaker: PersonaId | null; body: string };
```

Paramètres de voix (indicatifs, ajustables) : RH `{pitch: 1.1, rate: 1.0}`,
Manager `{pitch: 0.85, rate: 0.95}`, Expert `{pitch: 1.05, rate: 1.05}`.

`parseSpeaker` matche en tête l'un des 3 `name` connus suivi de `:` (tolère les
espaces autour du `:`), renvoie l'`id` + le corps sans le préfixe. Sans
correspondance → `{ speaker: null, body: text }` (fallback neutre).

### 2. `lib/prompts.ts` — `buildJuryPrompt(ctx: InterviewContext): string`

Reprend la structure de `buildRecruiterPrompt` (mêmes règles : langue, niveau,
CV optionnel, phases, une question à la fois, pas de crochets à remplir) mais :
- décrit les **3 personas** (RH / Manager opérationnel / Expert métier) et leur
  angle,
- impose : « À chaque tour, **UN SEUL** persona parle. Commence ta réplique par
  son nom exact suivi de " : " (ex. `Manager opérationnel : …`). Fais tourner la
  parole naturellement selon la pertinence, sans forcer un ordre rigide. »

### 3. `lib/useSpeech.ts` — `speak` accepte des options de voix

`speak(text: string, opts?: { pitch?: number; rate?: number; voice?: SpeechSynthesisVoice })`.
Applique `pitch`/`rate` sur l'`utterance` ; `voice` remplace la voix par défaut
si fournie. Sans `opts`, comportement identique à aujourd'hui (rétro-compatible
avec le mode solo).

### 4. `app/api/interview/route.ts` — flag `jury`

Body étendu : `{ context, history, jury?: boolean }`. Si `jury` vrai →
`buildJuryPrompt(context)`, sinon `buildRecruiterPrompt(context)`. Le reste
(validation, streaming, seed candidat, 429/500) est **inchangé**.

### 5. `app/page.tsx` — toggle + état

- Nouvel état `jury: boolean` (défaut `false`).
- Toggle « Mode jury » dans le formulaire (près du bouton Démarrer).
- `streamRecruiter` ajoute `jury` au body POST.
- `MeetingRoom` reçoit `jury` en prop.

### 6. `app/components/meeting/RecruiterTile.tsx` — paramétrée

Props `{ name?: string; initials?: string; speaking: boolean }` avec **valeurs
par défaut** `name = "Recruteur"`, `initials = "RH"` — ainsi l'appel actuel du
mode solo (`<RecruiterTile speaking={...} />`) reste inchangé. L'avatar affiche
les initiales, le libellé le `name`.

### 7. `app/components/meeting/MeetingRoom.tsx` — multi-tuiles + voix

- **Solo (`jury=false`) :** inchangé (1 `RecruiterTile`, 1 voix).
- **Jury (`jury=true`) :** rangée de **3 `RecruiterTile`** (RH / Manager /
  Expert) au-dessus de la tuile candidat. Le persona courant est déduit du
  préfixe de la dernière réplique recruteur (`parseSpeaker`) ; seule sa tuile est
  `speaking`. La synthèse vocale parle avec les `pitch/rate` du persona courant
  (et sa voix FR si dispo). La transcription montre le texte préfixé.

### Flux de données

```
form (toggle jury) → startInterview → streamRecruiter (body: {context, history, jury})
   → /api/interview → buildJuryPrompt → askModelStream (une réplique préfixée "Nom : …")
   → history[recruiter].text = "RH : …"
   → MeetingRoom: parseSpeaker → tuile active + speak(body, {pitch,rate,voice})
```

## Gestion des erreurs / cas limites

| Cas | Comportement |
|-----|--------------|
| Préfixe absent / inconnu | `parseSpeaker` → `speaker null` : voix par défaut (aucun `pitch/rate`), **aucune des 3 tuiles n'est mise en évidence** ce tour-là, texte affiché tel quel. Pas de plantage. |
| `speechSynthesis` absent | Pas de voix, transcription lisible (comme v1). |
| Erreur route (429/500) | Identique au solo (déjà géré). |
| Modèle qui met le préfixe au mauvais endroit | Le texte reste lisible dans la transcription ; seule la mise en évidence de tuile peut manquer (dégradation douce). |

## Tests

- `tests/jury.test.ts` (nouveau) : `parseSpeaker` (chaque nom connu en tête →
  bon `id` + corps sans préfixe ; espaces autour du `:` ; sans préfixe →
  `{null, texte}`) ; `PERSONAS` contient bien les 3 ids avec des paramètres de
  voix.
- `tests/prompts.test.ts` (ajout) : `buildJuryPrompt` contient les 3 noms de
  personas, la règle « un seul par tour + préfixe nom », le poste ; gère un CV
  absent sans planter.
- Route (flag), UI multi-tuiles, différenciation vocale : **vérif navigateur
  manuelle** (mode réunion, Chrome/Edge).

## Fichiers touchés

- `lib/jury.ts` — **nouveau** (personas + `parseSpeaker`)
- `lib/prompts.ts` — +`buildJuryPrompt`
- `lib/useSpeech.ts` — `speak` + options de voix
- `app/api/interview/route.ts` — flag `jury`
- `app/page.tsx` — toggle + état + body
- `app/components/meeting/RecruiterTile.tsx` — paramétrée
- `app/components/meeting/MeetingRoom.tsx` — multi-tuiles + voix par persona
- `tests/jury.test.ts` — **nouveau**
- `tests/prompts.test.ts` — +tests `buildJuryPrompt`
