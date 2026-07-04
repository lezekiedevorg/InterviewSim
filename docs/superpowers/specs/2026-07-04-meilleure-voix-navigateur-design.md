# Meilleure voix du navigateur (design)

Date : 2026-07-04
Branche : `feat/meilleure-voix` (depuis `main`)
Prolonge : la synthèse vocale de l'entretien (`lib/useSpeech.ts`).

## Objectif

La voix de l'entretien sonne robotique parce qu'on prend **la première** voix
française du navigateur, souvent la plus vieille. Beaucoup d'appareils récents
ont des voix **bien plus naturelles déjà installées** (Edge « Natural »,
« Google français », Siri). On veut **choisir la meilleure voix disponible** sur
l'appareil, au lieu de la première venue.

## Contexte : pourquoi ce v1

Retour utilisateur (#4 du test jury) : voix monotones/robotiques, envie de voix
naturelles/africaines. Après exploration : le TTS cloud (Google) exige une
**carte bancaire** (écarté) ; la voix locale téléchargée (Piper) alourdit le
mobile (public = étudiants CI sur data limitée). Le **meilleur premier pas** :
mieux choisir parmi les voix **déjà présentes** — gratuit, sans carte, sans
téléchargement, sans serveur, quasi aucun code. L'accent africain et le clonage
restent pour un v2 (voir [[interviewsim-roadmap]]).

## Décisions

- **Choix de la meilleure voix**, pas d'ajout de moteur ni de dépendance.
- **Heuristique par le nom** de la voix (il n'existe pas de champ « qualité » dans
  l'API `speechSynthesis`) : les marqueurs de qualité montent, les marqueurs de
  basse qualité descendent.
- **Filet de sécurité** : aucune voix française « de qualité » → on garde la
  première voix française (comportement actuel) ; `speechSynthesis` absent →
  texte (inchangé).
- **Portée v1 = mode solo** (produit en ligne actuel). Le mode jury vit sur une
  autre branche (`feat/jury`, non fusionnée) et **réutilisera `rankFrenchVoices`**
  pour ses 3 personas au moment de son intégration (petit ajustement, hors de ce
  spec).

## Architecture

### `lib/speech.ts` — `rankFrenchVoices(voices)` (nouveau, pur)

```ts
export function rankFrenchVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[];
```

- Ne garde que les voix dont `lang` commence par `fr` (insensible à la casse).
- Trie **meilleures d'abord** via un score par le nom :
  - +2 si le nom contient un marqueur de qualité : `natural`, `neural`,
    `enhanced`, `premium`, `google`, `siri`, `online` (insensible à la casse) ;
  - −2 si le nom contient un marqueur de basse qualité : `compact`, `espeak`,
    `hortense`.
- Tri **stable** : à score égal, l'ordre d'origine est conservé.
- Renvoie `[]` s'il n'y a aucune voix française.

Le calcul du score est un détail interne (fonction privée `scoreVoice`), non
exporté.

### `lib/useSpeech.ts` — utiliser le classement

Dans `pickVoice`, remplacer :

```ts
voiceRef.current = voices.find((v) => v.lang.startsWith("fr")) ?? voices[0] ?? null;
```

par :

```ts
voiceRef.current = rankFrenchVoices(voices)[0] ?? voices[0] ?? null;
```

(+ import de `rankFrenchVoices` depuis `./speech`.) Rien d'autre ne change : le
chargement asynchrone des voix (`onvoiceschanged`) et le reste du hook sont
inchangés.

## Cas limites

| Cas | Comportement |
|-----|--------------|
| Voix de qualité présente | Elle est choisie (ex. « Microsoft Denise (Natural) » devant « Microsoft Hortense »). |
| Aucune voix « de qualité », mais des voix FR | La première voix FR est gardée (comme aujourd'hui). |
| Aucune voix française | Repli sur `voices[0]` puis `null` (comme aujourd'hui). |
| `speechSynthesis` absent | Pas de voix, transcription lisible (inchangé). |
| Appareil bas de gamme au choix pauvre | On prend le mieux disponible ; ça peut rester moyen — limite assumée du navigateur. |

## Tests

- `tests/speech.test.ts` (ajout) : `rankFrenchVoices`
  - écarte les voix non françaises ;
  - place une voix « Natural » devant une « Compact »/« Hortense » ;
  - conserve l'ordre d'origine à score égal ;
  - renvoie `[]` sans voix française.
  - (Voix simulées : objets `{ name, lang }` castés en `SpeechSynthesisVoice`.)
- Vérif navigateur : lancer un entretien, entendre une voix plus naturelle que
  la précédente (selon l'appareil).

## Fichiers touchés

- `lib/speech.ts` — +`rankFrenchVoices` (+ `scoreVoice` privé)
- `lib/useSpeech.ts` — utilise `rankFrenchVoices` dans `pickVoice`
- `tests/speech.test.ts` — +tests `rankFrenchVoices`
