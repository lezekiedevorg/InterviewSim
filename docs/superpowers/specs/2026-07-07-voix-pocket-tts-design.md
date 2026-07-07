# Voix à accent ivoirien via pocket-tts — Design

**Date** : 2026-07-07
**Statut** : validé (brainstorm + POC réussi le même jour)
**Sous-projet** : chantier « voix — clonage / accent africain »

## Objectif

Offrir dans le sélecteur de voix du salon une voix de recruteur **à l'accent ivoirien** (voix clonée d'Ézéchiel) ainsi que les **voix françaises intégrées de pocket-tts**, en plus des voix edge-tts actuelles — sans régression sur l'existant et sans dépense (Hugging Face Spaces gratuit maintenant, VPS à la mise en production).

## Contexte et faits établis (POC du 2026-07-07)

- Le catalogue Edge TTS ne contient AUCUNE voix française d'Afrique (13 voix fr-* : FR/BE/CA/CH uniquement).
- **pocket-tts (Kyutai, licence MIT, 100M paramètres)** tourne sur CPU plus vite que le temps réel, parle français nativement, et **clone une voix depuis ~12 s d'audio** : POC réalisé sur le PC de l'utilisateur, **l'accent ivoirien survit au clonage** (verdict utilisateur).
- Recette d'échantillon apprise : retailler à ~12 s (un brut de 38 s tronquait la génération), normaliser (`loudnorm`), débruiter si besoin (`highpass=f=80,afftdn`) — le modèle clone AUSSI le bruit de fond.
- Le modèle avec clonage est un dépôt Hugging Face **à accès contrôlé** (`kyutai/pocket-tts`) : compte gratuit + acceptation des conditions + token requis au téléchargement.
- Orpheus-TTS (émotions taggées) écarté : 3B paramètres, GPU requis = hébergement payant. Rangé « futur payant ».

## Décisions de design

1. **Une seule voix clonée pour commencer** : celle d'Ézéchiel (échantillon consenti, c'est la sienne). Le jury reste 100 % edge-tts. Extensible plus tard.
2. **Les voix intégrées françaises de pocket-tts** (Estelle, Fantine, Éponine, Azelma, Charles… — liste finale curée À L'ÉCOUTE pendant l'implémentation) rejoignent aussi le sélecteur.
3. **Hébergement : HF Space privé gratuit** maintenant ; **VPS acheté à la mise en production** (le Space est un conteneur Docker → migration = changer une URL d'env var, rien d'autre).
4. **Space PRIVÉ** : seule l'app (serveur Vercel) détient le token d'accès. Personne d'autre ne peut générer avec la voix clonée. L'empreinte de voix (`.safetensors` produite par `pocket-tts export-voice`) est stockée dans le Space, PAS l'enregistrement brut.
5. **Repli edge-tts systématique** : Space endormi, timeout ou erreur → `/api/tts` bascule sur une voix edge par défaut pour la phrase demandée. L'utilisateur entend toujours quelque chose. (Le repli navigateur existant reste le filet final, inchangé.)
6. **Ping de réveil** : quand le salon s'ouvre avec une voix pocket sélectionnée, le client envoie un ping léger qui réveille le Space pendant que l'utilisateur lit l'écran et clique « Rejoindre ».
7. **Compression audio côté Space** : sortie **MP3** (pas le WAV 24 kHz brut) — lisible sur tous les navigateurs y compris vieux mobiles, poids comparable à edge-tts, vital pour les forfaits data des étudiants en CI. Le client lit déjà du MP3 (edge-tts) : aucun changement de lecture.
8. **Gate GO/NO-GO en première tâche** : mesurer sur le Space gratuit (2 vCPU) le facteur temps réel et la latence du premier segment. Critère GO : génération plus rapide que la parole (RTF < 1) et première phrase audible en < ~3 s avec le pipeline de préchargement existant. NO-GO → cette partie attend le VPS, le reste du montage est conservé tel quel.

## Architecture

```
Navigateur ──► /api/tts (Vercel, existant, étendu)
                 │ voix edge ──► msedge-tts (inchangé)
                 │ voix pocket ─► HF Space privé (FastAPI pocket-tts)
                 │                  │ token HF en secret Vercel
                 │                  │ voix = empreinte clonée .safetensors + intégrées
                 │                  └─ sortie compressée (MP3/Opus)
                 └─ échec/timeout pocket ──► repli edge-tts (même requête)
Salon (MeetingLobby) ─ voix pocket sélectionnée ─► ping de réveil du Space
```

### Composants

- **Space HF (nouveau, dépôt séparé du repo app)** : conteneur pocket-tts + FastAPI. Endpoints : `POST /tts` (texte + id de voix → audio compressé), `GET /health` (réveil/ping). Secret `HF_TOKEN` du Space pour télécharger le modèle gated au build.
- **`lib/pocketVoices.ts` (nouveau)** : catalogue des voix pocket (id, libellé, drapeau/description) — même rôle que `lib/edgeVoices.ts`. La voix clonée a un id dédié (ex. `ezekiel`) ; les intégrées gardent leur nom pocket.
- **`/api/tts` (étendu)** : si l'id de voix appartient au catalogue pocket → appel du Space (fetch avec token, timeout court) ; sinon chemin edge inchangé. Échec pocket → synthèse edge de repli. Allowlist = union edge + pocket (validation serveur conservée).
- **`MeetingLobby` (étendu)** : le sélecteur affiche une section voix pocket (clonée en tête). ▶ Écouter et persistance localStorage réutilisés tels quels (`lib/voicePrefs.ts` étendu pour valider les nouveaux ids).
- **Ping de réveil (`GET /api/tts/wake`, nouveau)** : au montage du salon avec voix pocket, le client appelle cette route en fire-and-forget ; c'est le SERVEUR qui pingue le `GET /health` du Space avec le token (le Space étant privé, le navigateur ne peut pas le joindre directement).

### Ce qui ne change PAS

- `useVoice`, la file audio, le préchargement profondeur 1, le repli navigateur.
- Le jury et ses voix edge. Les 4 voix solo edge et les 2 packs jury existants.
- `/api/interview`, `/api/debrief`, prompts, notation : rien.

## Gestion des erreurs

| Situation | Comportement |
|---|---|
| Space endormi / timeout / 5xx | Repli edge-tts sur la même phrase, silencieux pour l'utilisateur |
| Voix inconnue dans le body | 400 (allowlist union, comme aujourd'hui) |
| Token HF invalide/expiré | Équivalent panne Space → repli edge + à signaler dans les logs |
| Modèle gated inaccessible au build du Space | Échec de déploiement du Space, l'app n'est pas impactée (repli edge de fait) |

## Sécurité / confidentialité

- Space privé + token côté serveur uniquement (jamais exposé au client).
- L'empreinte de voix ne permet pas de reconstruire l'enregistrement original ; l'enregistrement brut n'est stocké nulle part en ligne.
- Texte à synthétiser : mêmes limites que `/api/tts` actuel (≤ 800 caractères, validation serveur).

## Hors périmètre (explicitement)

- Voix clonées pour le jury (3 échantillons) — plus tard si demande.
- Émotions taggées (Orpheus) — tiroir « futur payant ».
- Deuxième voix clonée (féminine) — quand un échantillon consenti existera.
- Barge-in, enregistrement d'appel — autres chantiers.

## Critères de succès

1. Gate GO : RTF < 1 et première phrase < ~3 s sur le Space gratuit (sinon NO-GO documenté et arrêt propre).
2. Un entretien complet avec la voix « Ézéchiel · accent ivoirien » est fluide (pas de trou entre phrases, préchargement efficace).
3. Space éteint à la main → l'entretien se déroule quand même en voix edge, sans erreur visible.
4. Les voix edge existantes et le jury fonctionnent exactement comme avant (zéro régression).
5. Aucune dépense, aucune carte bancaire, aucune dépendance npm ajoutée côté app.
