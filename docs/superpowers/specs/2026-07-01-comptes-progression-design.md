# InterviewSim — Spec : Comptes + Suivi de progression

**Date :** 2026-07-01
**Périmètre :** Deuxième sous-projet, greffé sur le MVP existant (entretien + débrief). Ajoute l'authentification optionnelle et le suivi de progression. Ne refait pas le cœur.

## Objectif

Permettre à un utilisateur de **créer un compte**, de **sauvegarder ses entretiens**, et de **voir sa progression dans le temps** — pour qu'il ait une raison de revenir. Le parcours anonyme actuel reste intact (essai sans friction).

## Décisions structurantes (validées)

- **Comptes optionnels.** L'app marche sans connexion comme aujourd'hui. Se connecter débloque la sauvegarde et la progression. Rien n'est gardé pour un visiteur anonyme.
- **Backend : Supabase** (Postgres + Auth, palier gratuit). Un seul service pour la base ET l'authentification. Sécurité (hachage, sessions, emails) déléguée à Supabase. Postgres standard = pas d'enfermement.
- **Auth : email + mot de passe.** Universel, sans dépendance à un compte tiers.
- **Package auth complet dès ce plan** : inscription, connexion, **confirmation d'email**, **mot de passe oublié → reset**.
- **SMTP : Brevo** (palier gratuit ~300 emails/jour) branché sur Supabase, pour ne pas dépendre de l'expéditeur intégré Supabase (fortement bridé sur le gratuit — quelques emails/heure). Le code n'appelle pas Brevo directement : c'est Supabase qui envoie via le SMTP configuré.
- **Isolation par Row-Level Security** : la base garantit que chacun ne lit/écrit que ses propres sessions.

## Ce qu'on stocke (et ce qu'on ne stocke pas)

**Une seule table `sessions` :**

| Colonne | Type | Rôle |
|---|---|---|
| `id` | uuid (pk, défaut `gen_random_uuid()`) | clé primaire |
| `user_id` | uuid → `auth.users` (not null) | propriétaire |
| `created_at` | timestamptz (défaut `now()`) | date de la session |
| `poste` | text | affichage rapide dans la liste |
| `context` | jsonb | poste, entreprise, domaine, niveau, langue |
| `debrief` | jsonb | l'objet Débrief complet |
| `score_confiance` | int | extrait du débrief, pour trier/tracer |

**On ne stocke PAS, volontairement** (moins de PII, moins de stockage) :
- Le **CV brut** (donnée personnelle sensible, inutile pour la progression).
- Le **transcript complet** de l'entretien (on garde le débrief, c'est ce que l'utilisateur veut revoir).

## Architecture

```
App Next.js (existante)
   ├─ Anonyme : entretien → débrief, RIEN gardé (inchangé)
   └─ Connecté : entretien → débrief → session enregistrée
                                        ▼ (client Supabase navigateur, RLS)
                                   Supabase (Postgres + Auth)   ← Brevo SMTP (emails)
                                        ▼
                              Page "Ma progression"
```

### Authentification

- Librairies : `@supabase/supabase-js` + `@supabase/ssr` (session via cookies, motif Next.js standard).
- Deux helpers : client navigateur (`lib/supabase/client.ts`) et client serveur lisant les cookies (`lib/supabase/server.ts`).
- `middleware.ts` rafraîchit la session à la navigation (motif Supabase SSR).
- Écrans :
  - `/login` : un écran, deux modes « Se connecter / Créer un compte ». `signInWithPassword` / `signUp`. Lien « Mot de passe oublié » → `resetPasswordForEmail`.
  - `/reset` : saisie du nouveau mot de passe (après clic sur le lien reçu par email).
- En-tête (`app/components/Header.tsx`, monté dans `app/layout.tsx`) :
  - Non connecté → « Se connecter ».
  - Connecté → « `email` · Ma progression · Se déconnecter ».
- Confirmation d'email **activée** (réglage Supabase) ; l'utilisateur clique le lien reçu (via Brevo) avant de pouvoir se connecter.

### Enregistrement d'une session

- À l'affichage du débrief, si l'utilisateur est connecté, le **client Supabase du navigateur insère la ligne** (`sessions`) ; le RLS la rattache à lui. Pas de route API dédiée.
- Champs insérés : `poste`, `context` (sans CV), `debrief`, `score_confiance` (depuis `debrief.scoreConfiance`). `user_id` / `created_at` automatiques.
- **Best-effort** : l'échec d'insertion ne bloque jamais le débrief. Notice « Impossible d'enregistrer cette session » + bouton « Réessayer ». Le débrief reste affiché.
- Anonyme : le code de sauvegarde ne s'exécute pas (pas de session).

### Page « Ma progression » (`/progression`)

- Accès connecté ; non authentifié → redirection `/login`.
- Récupère les sessions via le client Supabase (RLS, triées par `created_at` décroissant).
- Affiche :
  - **Courbe des scores dans le temps** : un SVG inline (polyline) calculé à partir des scores. Pas de librairie de graphique.
  - **Liste des sessions** : date, poste, score, **delta vs la précédente** (« +8 » / « −3 »).
  - **Cliquer une session** → déplie son **débrief complet** (le jsonb stocké, rendu comme sur l'accueil).
- Calculs (deltas, points de la courbe, tri) dans `lib/progression.ts` (pur, testé).

## Gestion d'erreurs

- **Auth** : erreurs Supabase → messages français (« Identifiants incorrects », « Cet email est déjà utilisé », « Confirme ton email avant de te connecter »).
- **Sauvegarde** : best-effort (notice + Réessayer), ne bloque pas le débrief.
- **`/progression` non connecté** → redirection `/login`.
- **Variables d'env** : `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publiques, sûres côté navigateur ; le RLS protège les données). Pas de clé service-role. `GEMINI_API_KEY` reste côté serveur.

## Tests

- **Automatiques (logique pure, Vitest)** : deltas de progression, points de la courbe SVG, tri des sessions, extraction du score, mapping des messages d'erreur auth.
- **Manuels (auth + base)** : créer un compte → confirmer l'email (Brevo) → se connecter → faire un entretien → le voir dans « Ma progression » → se déconnecter → vérifier qu'un **autre compte ne voit pas** ces sessions (test réel du RLS). Ne peut pas être automatisé de façon fiable sans instance Supabase de test.

## Structure des fichiers

**Ajouts :**
```
lib/supabase/client.ts     → client navigateur
lib/supabase/server.ts     → client serveur (cookies)
lib/progression.ts         → helpers purs (deltas, courbe, tri) — testés
lib/authErrors.ts          → mapping erreurs Supabase → messages FR — testé
middleware.ts              → rafraîchit la session Supabase
app/components/Header.tsx  → état connecté + liens
app/login/page.tsx         → connexion / inscription
app/reset/page.tsx         → nouveau mot de passe
app/progression/page.tsx   → liste + courbe + delta + débrief
supabase/schema.sql        → table sessions + policies RLS
```
**Modifs :** `app/page.tsx` (sauvegarde au débrief si connecté), `app/layout.tsx` (header), `.env.local.example` (variables Supabase).

## Config manuelle (hors code, détaillée dans le plan)

1. Créer un projet Supabase (gratuit).
2. Exécuter `supabase/schema.sql` (table `sessions` + RLS).
3. Créer un compte Brevo, obtenir les identifiants SMTP, les coller dans Supabase (Auth → SMTP).
4. Activer la confirmation d'email ; régler Site URL + Redirect URLs (pour les liens de confirmation/reset).
5. Renseigner `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local`.

## Critères de succès

- Un visiteur anonyme fait un entretien + débrief exactement comme avant (aucune régression).
- Un utilisateur peut s'inscrire, confirmer son email, se connecter.
- Un entretien terminé en étant connecté apparaît dans « Ma progression » avec son score.
- La page progression montre la liste, la courbe des scores, et le delta vs la session précédente ; cliquer une session ré-affiche son débrief.
- Un utilisateur ne voit jamais les sessions d'un autre (RLS vérifié manuellement).

## Hors périmètre (sous-projets futurs)

Points faibles récurrents / analyse cross-sessions (version enrichie de la progression) ; connexion Google ; templates ; jury multi-acteurs ; mode vocal ; partage entre pairs ; freemium/billing ; B2B.
