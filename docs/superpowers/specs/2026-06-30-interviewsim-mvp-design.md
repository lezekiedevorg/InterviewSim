# InterviewSim — Spec MVP (cœur entretien + débrief)

**Date :** 2026-06-30
**Périmètre :** MVP du bloc « cœur » uniquement. Tout le reste de la vision (templates, jury multi-acteurs, suivi de progression, comptes, voix, partage, billing, B2B) est explicitement hors périmètre et fera l'objet de sous-projets séparés.

## Objectif

Prouver la valeur de la boucle : **un utilisateur décrit son entretien + colle son CV → une IA joue un recruteur et mène un entretien au tour par tour → un débrief exploitable à la fin.**

Question à laquelle ce MVP répond : *parler à cette IA aide-t-il vraiment à se préparer ?* Si oui, tout le reste se greffe dessus. Si non, on a économisé des mois.

## Hors périmètre (sous-projets futurs)

Bibliothèque de templates · jury multi-acteurs · suivi de progression / historique · comptes utilisateurs · mode vocal · partage entre pairs · freemium / billing · B2B / dashboards cohortes. Aucune de ces fonctions n'est nécessaire pour valider le cœur.

## Décisions structurantes

- **Pas de banque de questions.** L'IA s'appuie sur sa connaissance entraînée du métier, cadrée par le contexte saisi, le CV collé et le déroulé de la conversation. Le levier de qualité est le prompt, pas une base de données.
- **Pas de base de données.** Aucun compte, aucun historique au MVP → rien à persister. L'état de la session vit dans le state React du navigateur. Recharger la page repart à zéro (volontaire).
- **CV collé en texte** (textarea), pas d'upload/parsing PDF. Donne 100 % de la valeur sans la plomberie de fichiers.
- **Fournisseur de modèle : Google Gemini, palier gratuit, `gemini-2.5-flash`**, via `@google/genai`. Choisi pour la qualité du français et du jeu de rôle au coût zéro. L'appel est isolé derrière une seule fonction `askModel` → changer de fournisseur = toucher un fichier.
- **Stack : une seule app Next.js** (front React + routes API). Clé modèle côté serveur, jamais exposée.

## Architecture

```
Navigateur (React, dans Next.js)
   │  1. Formulaire : contexte + CV collé
   │  2. Chat tour par tour (questions ↔ réponses)
   │  3. Clic « Terminer l'entretien »
   ▼
Routes API Next.js (côté serveur, clé Gemini jamais exposée)
   ├─ POST /api/interview  → prochaine réplique du recruteur (streaming)
   └─ POST /api/debrief    → rapport JSON final
   ▼
Gemini (gemini-2.5-flash, palier gratuit)
```

L'API du modèle est sans état : à chaque tour, le front renvoie tout l'historique au serveur. La phase de l'entretien « émerge » du prompt + de l'historique — pas de machine à états côté serveur.

### Trois unités, un rôle chacune

1. **L'UI** (`app/page.tsx`) — saisie du contexte, fil de discussion, bouton terminer, affichage du débrief. Détient tout l'état de la session.
2. **Route entretien** (`/api/interview`) — entrée `{contexte, cv, historique}` → construit le prompt recruteur → appelle Gemini en streaming → renvoie la réplique.
3. **Route débrief** (`/api/debrief`) — entrée `{contexte, cv, transcript}` → demande un rapport JSON structuré → le renvoie.

## Parcours utilisateur

1. **Créer le contexte** — formulaire (voir champs ci-dessous) + CV collé.
2. **Vivre la simulation** — l'IA mène l'entretien en phases, une question à la fois, en rebondissant sur les réponses et le CV.
3. **Terminer** — bouton « Terminer l'entretien » toujours disponible → déclenche le débrief.
4. **Recevoir le débrief** — rapport structuré affiché à l'écran.

### Champs du formulaire de contexte

| Champ | Obligatoire | Exemple |
|---|---|---|
| Poste visé | ✅ | « Développeur back-end » |
| Entreprise / type d'entreprise | — | « Startup fintech » / « SNDI » |
| Domaine | — | « Informatique » |
| Niveau | — | Junior / Senior |
| Langue de l'entretien | — | Français |
| CV collé (textarea) | ✅ | texte du CV |
| Offre d'emploi collée (textarea) | — | texte de l'annonce |

Seuls **poste** et **CV** sont obligatoires ; le reste affine si rempli. L'offre est un textarea de plus concaténé au prompt.

## Le cœur : les deux prompts

### Prompt recruteur (`/api/interview`)

Injecte contexte + CV + offre dans un prompt système qui cadre le rôle :

- *Tu es un recruteur pour [poste] chez [entreprise/type], niveau [niveau], en [langue]. Voici le CV du candidat : […]. Voici l'offre : […].*
- *Déroulé en phases : mise en confiance → technique → mise en situation → questions pièges. ~2-3 questions par phase, puis conclure naturellement.*
- *Pose UNE question à la fois. Rebondis sur les réponses et sur le CV. Reste dans le personnage.*

L'historique complet est renvoyé à chaque tour ; le modèle suit le déroulé sans état serveur.

### Prompt débrief (`/api/debrief`)

Envoie transcript + contexte, demande un **rapport JSON** à champs fixes :

```json
{
  "pointsForts": ["..."],
  "pointsATravailler": ["..."],
  "reformulations": ["..."],
  "scoreConfiance": 0,
  "syntheseGenerale": "..."
}
```

JSON plutôt que prose → affichage fiable, pas de re-parsing de texte libre.

## Fin de l'entretien

Combinaison de deux mécanismes :
- L'IA suit le déroulé en phases et **conclut naturellement** quand elles sont couvertes.
- Un bouton **« Terminer l'entretien »** toujours disponible → coupe quand l'utilisateur veut, le débrief se génère sur ce qui a été dit.

Pas de compteur de tours rigide. Si en test l'IA s'éternise ou s'égare, on ajoutera un plafond souple (« ~2-3 questions par phase ») dans le prompt — réglage, pas fonctionnalité.

## Gestion d'erreurs

1. **Limite de débit Gemini (429)** — cas le plus probable au gratuit. Message clair *« L'IA est momentanément surchargée, réessaie dans quelques instants »* + bouton « Réessayer ». Un seul re-essai manuel ; pas de file d'attente. Le SDK gère déjà un backoff de base.
2. **Champs obligatoires manquants** — validés côté client (bouton « Démarrer » désactivé tant que poste + CV ne sont pas remplis) ET côté serveur (la route refuse une requête sans poste/CV).
3. **Débrief JSON malformé** — un re-essai automatique ; si ça échoue encore, afficher le texte brut du rapport. L'utilisateur a son débrief, juste moins joli.
4. **Coupure de streaming en cours d'entretien** — le message partiel reste affiché, l'utilisateur peut renvoyer sa réponse.

## Structure des fichiers

```
app/
  page.tsx              → écran unique : formulaire → chat → débrief
  api/
    interview/route.ts  → POST : prochaine réplique du recruteur (streaming)
    debrief/route.ts    → POST : rapport JSON final
lib/
  askModel.ts           → seule fonction qui parle à Gemini (point unique de switch modèle)
  prompts.ts            → les deux prompts système (recruteur + débrief)
.env.local              → GEMINI_API_KEY (jamais commitée)
```

Tout l'état (contexte, CV, historique) vit dans le state React de `page.tsx`. Pas de store global, pas de DB. Si `page.tsx` grossit trop, on découpera les composants à ce moment-là.

## Critères de succès du MVP

- Un utilisateur peut décrire un entretien, coller un CV, et mener une conversation au tour par tour avec une IA qui pose des questions personnalisées sur le CV et réagit aux réponses.
- À la fin (naturelle ou via le bouton), il reçoit un débrief structuré exploitable.
- Tourne sur le palier gratuit de Gemini.

## Limites connues (assumées au MVP)

- Palier gratuit = limites de débit (quelques requêtes/minute, quota journalier). Suffisant pour tester et quelques utilisateurs. Montée en charge = palier payant ou auto-hébergement (changement de clé/URL, pas de réarchitecture).
- Session non persistée : recharger la page perd l'entretien en cours.
- Un seul recruteur (pas de jury). Pas de suivi de progression entre sessions.
