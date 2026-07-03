# Templates de scénarios — Design

**Date :** 2026-07-02
**Sous-projet :** Bibliothèque de templates d'entretiens
**Branche :** `feat/templates`

## Objectif

Supprimer la friction du premier essai. Aujourd'hui, pour lancer un entretien, il faut
renseigner un poste **et coller un CV** (obligatoire). La cible prioritaire — des étudiants
sans expérience, sans CV, qui n'ont jamais passé d'entretien — est bloquée dès l'entrée.

Un template est un scénario prêt à l'emploi : un clic pré-remplit le formulaire avec un
contexte de poste, l'utilisateur ajuste s'il veut, puis démarre. Il répond **en tant que
lui-même** (pas un personnage fictif). Le CV devient optionnel pour tout le monde.

Public : francophone (étudiants/débutants en priorité), mais utile à tout profil voulant un
entretien rapide sans préparer de CV.

## Décisions actées (brainstorm)

- **Approche « pré-remplir + confirmer »** : un clic sur un template remplit le formulaire ;
  l'utilisateur voit/ajuste puis clique « Démarrer » (flux existant, inchangé). Pas de
  lancement direct.
- **CV optionnel** : seul `poste` reste requis à la validation.
- **Catalogue statique** en TypeScript (pas de base de données) : ajouter un scénario = une
  ligne dans un tableau.
- Le recruteur **n'invente pas de faux parcours** quand aucun CV n'est fourni : il traite un
  candidat débutant qui parle en son nom.

## Modèle de données — `lib/templates.ts` (nouveau)

```ts
export type Template = {
  id: string;        // slug unique, ex. "stage-marketing"
  emoji: string;     // ex. "🎓"
  titre: string;     // ex. "Stage marketing"
  sousTitre: string; // ex. "Débutant · sans expérience requise"
  context: {
    poste: string;
    domaine?: string;
    niveau?: string;
    langue?: string;
  };
};

export const TEMPLATES: Template[] = [ /* ~6-8 scénarios */ ];
```

Le `context` ne contient **jamais** de CV. Il alimente les champs `poste`, `domaine`,
`niveau`, `langue` du formulaire.

Catalogue de départ (orienté étudiants/débutants francophones) :

| emoji | titre | poste | niveau |
|-------|-------|-------|--------|
| 🎓 | Stage marketing | Stagiaire marketing | Débutant |
| 💻 | Premier emploi — Dev junior | Développeur junior | Débutant |
| 🛍️ | Job étudiant — Vente | Vendeur en boutique | Débutant |
| 📞 | Relation client | Téléconseiller | Débutant |
| 📊 | Stage administratif | Assistant administratif | Débutant |
| 🏦 | Stage banque / finance | Stagiaire en banque | Débutant |
| 🍽️ | Job étudiant — Restauration | Serveur | Débutant |
| 🧑‍🏫 | Animateur / encadrant | Animateur | Débutant |

Langue par défaut : français. Le catalogue est trivialement extensible.

## UI & flux

### `app/components/TemplateGallery.tsx` (nouveau)

- Props : `{ onPick: (t: Template) => void; selectedId?: string }`.
- Rend une section « Pas d'idée ? Pars d'un scénario » + une grille de cartes cliquables
  (emoji, titre, sous-titre), dans le style émeraude existant. La carte sélectionnée est
  surlignée.

### `app/page.tsx` (phase `form`)

- La galerie s'affiche **au-dessus** du formulaire existant.
- `onPick(template)` : `setContext({ poste, domaine, niveau, langue, cv: "" })` à partir du
  template, et mémorise l'`id` choisi pour le surlignage.
- L'utilisateur ajuste si besoin puis clique **Démarrer** → `startInterview()` inchangé.
- Le formulaire complet (dont le champ CV) reste disponible dessous pour les profils qui
  veulent coller leur CV.

### Data flow

1. Page d'accueil (phase `form`) → galerie + formulaire.
2. Clic sur une carte → formulaire pré-rempli (sans CV), carte surlignée.
3. Ajustement optionnel → « Démarrer ».
4. `startInterview()` → `/api/interview` avec un contexte sans CV.
5. Le recruteur adapte (candidat débutant). Reste du flux (chat, débrief, save) inchangé.

## Changements de comportement

### `lib/validate.ts`

Retirer l'obligation du CV. Seul `poste` reste requis.

```ts
export function validateContext(ctx: Partial<InterviewContext>): string[] {
  const errors: string[] = [];
  if (!ctx.poste || ctx.poste.trim() === "") {
    errors.push("Le poste visé est obligatoire.");
  }
  return errors;
}
```

### `lib/prompts.ts`

1. `contextLines` n'ajoute la ligne « CV du candidat » **que si** `ctx.cv` est non vide.
2. Nouvelle règle dans `buildRecruiterPrompt` : *« Si aucun CV n'est fourni, considère un
   candidat débutant qui parle en son nom : pose des questions d'entrée adaptées, n'invente
   PAS de parcours ou d'expérience à sa place. »*

## Tests

- **`tests/templates.test.ts`** (nouveau) : intégrité du catalogue — `id` uniques, `poste`
  non vide pour chaque template.
- **`tests/validate.test.ts`** : `poste` requis ; CV **non** requis (mise à jour du test
  existant qui attend l'erreur CV).
- **`tests/prompts.test.ts`** : sans CV → aucune ligne « CV du candidat » + présence de la
  consigne débutant ; avec CV → comportement actuel conservé.

## Hors périmètre (YAGNI)

- Pas de base de données ni de templates éditables / créés par les utilisateurs.
- Pas de catégories, favoris, recherche.
- Pas de lancement direct (choix : pré-remplir + confirmer).
- Pas de CV d'exemple embarqué (le candidat répond en son nom).

## Fichiers touchés

- `lib/templates.ts` (nouveau)
- `app/components/TemplateGallery.tsx` (nouveau)
- `app/page.tsx` (galerie + `onPick`)
- `lib/validate.ts` (CV optionnel)
- `lib/prompts.ts` (CV conditionnel + règle débutant)
- `tests/templates.test.ts` (nouveau), `tests/validate.test.ts`, `tests/prompts.test.ts`
