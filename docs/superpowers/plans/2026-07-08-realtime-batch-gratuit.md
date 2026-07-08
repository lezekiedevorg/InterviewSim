# Batch gratuit realtime — TTS plus rapide + mode fluide — Plan

**Goal:** Réduire le blanc et supprimer le tout-au-bouton, sans coût ni data en plus.
**Base :** branche `feat/entretien-realtime` (suite du chantier realtime).

## Diagnostic (mesuré 2026-07-08)

Blanc ≈ 3448 ms après la dernière parole = endpoint 1200 (corrigé → 2000 pour ne plus couper)
+ 1er token LLM **746 ms** (OK, Groq) + TTS **1503 ms** dont **644 ms de reconnexion websocket à chaque phrase**.

## Batch 1 — Réutiliser la connexion Edge TTS (−644 ms/phrase)

**Fichier :** `app/api/tts/route.ts` (réécriture).

- Cache module `Map<voix, Promise<MsEdgeTTS>>` : `new MsEdgeTTS()` + `setMetadata` **une fois par voix**, réutilisé ensuite.
- Concurrence OK (msedge multiplexe par `requestId`).
- Auto-réparation : si l'audio revient **vide** (socket expirée côté Microsoft), on évince l'instance, on la recrée, on retente **une** fois.
- Garde 8 s de timeout, allowlist de voix, validations existantes.

**Vérif :** script de mesure — setMetadata une fois puis 2× `toStream` : le 2ᵉ appel doit être ~644 ms plus rapide (pas de reconnexion).

## Batch 2 — Mode fluide par défaut (fini le bouton)

**Fichier :** `app/components/meeting/MeetingRoom.tsx`.

- `handsFree` par défaut **true** (au lieu de false). Le mains-libres existe déjà : micro qui se rouvre seul après que l'IA parle + envoi auto au silence. Le passer par défaut = tu rejoins → l'IA t'accueille → tu parles → ça part tout seul. **Zéro clic.**
- Barge-in reste **OFF** par défaut (écho sans casque).
- Le bouton « Parler » reste comme **filet de secours** (manuel / navigateurs sans Web Speech).
- Cas limites déjà couverts : `rec.supported` false → le mains-libres ne fait rien (repli saisie/manuel) ; micro refusé → message existant.

**Vérif :** `npx tsc --noEmit`, `npm test`, `npm run build`. Test manuel : rejoindre → parler sans toucher un bouton.

## Hors lot (plus tard)

- Streamer le TTS (−300 ms) — lecture audio progressive côté client (MediaSource).
- Endpointing à l'énergie (réutiliser `useMicEnergy`) — couper le seuil sans hacher la parole.
- Gemini Live / clonage de voix / LiveKit → chapitre VPS.
