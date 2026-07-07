# Voix accent ivoirien via pocket-tts — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter au sélecteur du salon une voix de recruteur clonée à l'accent ivoirien (+ les voix intégrées françaises de pocket-tts retenues à l'écoute), servies par un Hugging Face Space privé gratuit, avec repli automatique edge-tts et ping de réveil — zéro régression sur l'existant.

**Architecture:** Un Space HF Docker privé fait tourner pocket-tts (modèle `french_24l`) derrière une petite API FastAPI (`POST /tts` → MP3, `GET /health`) ; les empreintes de voix sont pré-chargées au démarrage. Côté app, les voix pocket portent un préfixe `pocket:` dans le champ `voice` : `/api/tts` route ces voix vers le Space (token en secret Vercel) et retombe sur edge-tts à la moindre erreur ; le salon pingue `GET /api/tts/wake` au montage pour réveiller le Space. Spec : `docs/superpowers/specs/2026-07-07-voix-pocket-tts-design.md`.

**Tech Stack:** Space = Python 3.12 (pocket-tts 2.1.0, FastAPI, ffmpeg) sur HF Spaces Docker ; app = Next.js + TypeScript existant, Vitest.

## Global Constraints

- Texte utilisateur en **français**, tutoiement. **Zéro dépendance npm ajoutée** côté app (les dépendances Python vivent dans le Space).
- **Non-régression absolue** : voix edge solo, packs jury, `useVoice`, préchargement, repli navigateur — inchangés. Le jury reste 100 % edge-tts.
- **Confidentialité voix** : `hf-space/voices/` est **gitignoré** — l'empreinte `ezekiel.safetensors` ne va JAMAIS dans le repo GitHub (public) ; elle n'est uploadée que dans le Space HF **privé**.
- Ids pocket côté app préfixés `pocket:` dans le champ `voice` (ex. `pocket:ezekiel`) ; plafond texte 800 caractères conservé partout.
- Env vars serveur : `POCKET_TTS_URL` (URL du Space, ex. `https://xxx-interviewsim-tts.hf.space`), `POCKET_TTS_TOKEN` (token HF « read »). Absentes → toute voix pocket retombe sur edge sans erreur.
- **Gate GO/NO-GO (Task 3)** : RTF < 1 et première phrase < ~3 s à chaud sur le Space gratuit ; NO-GO → on s'arrête après la Task 3, on documente, les Tasks 4-7 attendront le VPS.
- Tasks 2 et 3 sont **collaboratives** (écoute utilisateur ; compte HF utilisateur) — le contrôleur les mène lui-même avec l'utilisateur, PAS via subagent autonome.
- Branche : `feat/voix-accent` (déjà active). Commandes app : `npm test`, `npm run build`, `npx tsc --noEmit`.

---

### Task 1 : Serveur Space (code + test local sur le PC)

**Files:**
- Create: `hf-space/app.py`
- Create: `hf-space/requirements.txt`
- Create: `hf-space/Dockerfile`
- Create: `hf-space/README.md`
- Modify: `.gitignore` (ajouter `hf-space/voices/`)

**Interfaces:**
- Produces: `POST /tts` body JSON `{ "text": string, "voice": string }` → `200 audio/mpeg` (MP3 mono 48 kbit/s), `400` texte/voix invalide ; `GET /health` → `{ "status": "ok", "voices": [ids] }`. Ids de voix servis = clés de `VOICE_SOURCES` (`ezekiel` + intégrées, liste figée en Task 2).

- [ ] **Step 1 : Écrire `hf-space/app.py`**

```python
import io
import shutil
import subprocess
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from pydantic import BaseModel

from pocket_tts import TTSModel
from pocket_tts.data.audio import stream_audio_chunks

# Voix offertes : id stable (celui que /api/tts envoie) → source pocket-tts.
# Source = nom d'une voix intégrée (str) OU empreinte .safetensors locale (Path).
# La liste finale des intégrées est figée en Task 2 (curation à l'écoute).
VOICE_SOURCES: dict[str, str | Path] = {
    "ezekiel": Path(__file__).parent / "voices" / "ezekiel.safetensors",
    "estelle": "estelle",
}

MAX_TEXT = 800  # même plafond que /api/tts côté app

app = FastAPI()
MODEL: TTSModel | None = None
STATES: dict[str, dict] = {}


def ffmpeg_exe() -> str:
    found = shutil.which("ffmpeg")  # Docker : apt ffmpeg
    if found:
        return found
    import imageio_ffmpeg  # test local sur PC sans ffmpeg système

    return imageio_ffmpeg.get_ffmpeg_exe()


@app.on_event("startup")
def load() -> None:
    global MODEL
    MODEL = TTSModel.load_model(language="french_24l")
    for vid, src in VOICE_SOURCES.items():
        if isinstance(src, Path) and not src.exists():
            continue  # empreinte absente (ex. test local avant Task 2) : voix simplement non servie
        STATES[vid] = MODEL.get_state_for_audio_prompt(str(src) if isinstance(src, Path) else src)


class TtsIn(BaseModel):
    text: str
    voice: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "voices": sorted(STATES)}


@app.post("/tts")
def tts(inp: TtsIn) -> Response:
    text = inp.text.strip()
    if not text or len(text) > MAX_TEXT:
        raise HTTPException(400, "texte invalide")
    state = STATES.get(inp.voice)
    if state is None:
        raise HTTPException(400, "voix inconnue")
    # ponytail: génération séquentielle (un seul utilisateur au MVP) ; workers/queue si trafic un jour
    wav = io.BytesIO()
    chunks = MODEL.generate_audio_stream(model_state=state, text_to_generate=text)
    stream_audio_chunks(wav, chunks, MODEL.config.mimi.sample_rate)
    mp3 = subprocess.run(
        [ffmpeg_exe(), "-hide_banner", "-loglevel", "error",
         "-f", "wav", "-i", "pipe:0", "-b:a", "48k", "-ac", "1", "-f", "mp3", "pipe:1"],
        input=wav.getvalue(), capture_output=True, check=True,
    ).stdout
    return Response(content=mp3, media_type="audio/mpeg")
```

- [ ] **Step 2 : Écrire `hf-space/requirements.txt`**

```
pocket-tts==2.1.0
fastapi
uvicorn[standard]
soundfile
imageio-ffmpeg
```

- [ ] **Step 3 : Écrire `hf-space/Dockerfile`**

```dockerfile
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface
WORKDIR /home/user/app
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --chown=user . .
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
```

(Le modèle gated `kyutai/pocket-tts` se télécharge AU DÉMARRAGE via le secret `HF_TOKEN` du Space — pas au build.)

- [ ] **Step 4 : Écrire `hf-space/README.md`**

```markdown
---
title: InterviewSim TTS
sdk: docker
app_port: 7860
---

Serveur de voix pocket-tts **privé** d'InterviewSim (voix clonée accent ivoirien + intégrées françaises).
Secret requis : `HF_TOKEN` (read) — téléchargement du modèle gated kyutai/pocket-tts au démarrage.
```

- [ ] **Step 5 : Gitignorer les empreintes**

Ajouter à `.gitignore` (racine du repo) :

```
hf-space/voices/
```

- [ ] **Step 6 : Test local (le modèle est déjà en cache sur ce PC)**

Lancer le serveur (terminal 1, ou en arrière-plan) :

```bash
cd hf-space && python -m uvicorn app:app --port 7861
```

Attendre « Application startup complete » (chargement modèle ~1 min), puis :

```bash
python -c "
import json, urllib.request
h = json.load(urllib.request.urlopen('http://127.0.0.1:7861/health'))
assert h['status'] == 'ok' and 'estelle' in h['voices'], h
req = urllib.request.Request('http://127.0.0.1:7861/tts',
    data=json.dumps({'text': 'Bonjour, parlez-moi de votre parcours.', 'voice': 'estelle'}).encode(),
    headers={'Content-Type': 'application/json'})
mp3 = urllib.request.urlopen(req).read()
assert len(mp3) > 5000 and (mp3[:3] == b'ID3' or mp3[0] == 0xFF), (len(mp3), mp3[:4])
print('SMOKE OK', len(mp3), 'octets MP3')
"
```

Attendu : `SMOKE OK <n> octets MP3`. Vérifier aussi qu'une voix inconnue (`{'voice':'nimporte'}`) renvoie HTTP 400. Arrêter le serveur.

- [ ] **Step 7 : Commit**

```bash
git add hf-space/ .gitignore
git commit -m "feat(voix): serveur pocket-tts pour HF Space privé (FastAPI /tts MP3 + /health, empreintes préchargées)"
```

---

### Task 2 : Curation des voix à l'écoute + empreinte clonée — COLLABORATIVE (contrôleur + utilisateur)

**Files:**
- Create: `hf-space/voices/ezekiel.safetensors` (LOCAL uniquement, gitignoré)
- Modify: `hf-space/app.py` (dict `VOICE_SOURCES` : liste finale des intégrées)

**Interfaces:**
- Consumes: échantillon voix validé par l'utilisateur (le débruité `voix_ezekiel_denoise.wav` du POC, ou un nouvel enregistrement en lieu calme s'il le préfère).
- Produces: liste FINALE des ids de voix servis (`ezekiel` + intégrées retenues) — la Task 4 la recopie côté app.

- [ ] **Step 1 : Confirmer l'échantillon avec l'utilisateur**

Lui demander son verdict d'écoute sur `ECOUTE_3_clone_debruite.wav` (POC). S'il valide → utiliser `voix_ezekiel_denoise.wav` (scratchpad du POC). Sinon → nouvel enregistrement en lieu calme, préparé pareil : `-ss 0.5 -t 12 -af highpass=f=80,afftdn=nf=-28,loudnorm -ar 24000 -ac 1`.

- [ ] **Step 2 : Exporter l'empreinte**

```bash
mkdir -p hf-space/voices && python -m pocket_tts export-voice <échantillon_validé>.wav hf-space/voices/ezekiel.safetensors --language french_24l
```

Vérifier : le fichier existe, `git status` ne le liste PAS (gitignoré).

- [ ] **Step 3 : Générer un extrait par voix intégrée candidate**

Candidates (seule `estelle` est nativement française ; les autres sont des locuteurs anglais qui parleront français — souvent avec un accent, à trier à l'oreille) : `estelle, fantine, eponine, azelma, vera, anna, charles, paul, george, michael, eve, jane, mary, cosette, marius, javert`.

```bash
for v in estelle fantine eponine azelma vera anna charles paul george michael eve jane mary cosette marius javert; do
  python -m pocket_tts generate -q --language french_24l --voice "$v" \
    --text "Bonjour, merci d'être venu. Parlez-moi un peu de votre parcours professionnel." \
    --output-path "/c/Users/Ezekiel Kouassi/Downloads/VOIX_POCKET_$v.wav"
done
```

- [ ] **Step 4 : L'utilisateur écoute et choisit**

Il garde celles qui sonnent bien en français (naturel, pas d'accent anglais gênant). Mettre à jour `VOICE_SOURCES` dans `hf-space/app.py` avec les retenues, ex. :

```python
VOICE_SOURCES: dict[str, str | Path] = {
    "ezekiel": Path(__file__).parent / "voices" / "ezekiel.safetensors",
    "estelle": "estelle",
    # + les retenues de l'écoute, id = nom pocket
}
```

- [ ] **Step 5 : Re-test local rapide**

Relancer le serveur local (Task 1 Step 6) : `/health` doit lister `ezekiel` + les retenues ; un `POST /tts` avec `voice: "ezekiel"` doit renvoyer un MP3 (> 5000 octets). L'utilisateur peut écouter ce MP3 (le sauver dans Downloads).

- [ ] **Step 6 : Commit**

```bash
git add hf-space/app.py
git commit -m "feat(voix): liste finale des voix pocket (clonée + intégrées retenues à l'écoute)"
```

---

### Task 3 : Déploiement du Space privé + gate GO/NO-GO — COLLABORATIVE (compte HF utilisateur)

**Files:** aucun dans le repo (Space HF + mesures).

**Interfaces:**
- Consumes: compte HF de l'utilisateur ; un token **write** (upload, révocable après) + un token **read** (secret du Space + env app).
- Produces: URL du Space (`POCKET_TTS_URL`) + verdict GO/NO-GO consigné au ledger.

- [ ] **Step 1 : Tokens utilisateur**

Demander à l'utilisateur : (a) un token **write** temporaire pour créer/uploader le Space (il le révoque après la tâche) ; (b) un token **read** qui restera : secret `HF_TOKEN` du Space + `POCKET_TTS_TOKEN` de l'app. Rappel : son compte a déjà accepté les conditions de `kyutai/pocket-tts`.

- [ ] **Step 2 : Créer le Space privé et uploader**

```bash
HF_TOKEN=<token_write> python -c "
from huggingface_hub import HfApi
api = HfApi()
user = api.whoami()['name']
repo = f'{user}/interviewsim-tts'
api.create_repo(repo, repo_type='space', space_sdk='docker', private=True, exist_ok=True)
api.upload_folder(folder_path='hf-space', repo_id=repo, repo_type='space')
api.add_space_secret(repo, 'HF_TOKEN', '<token_read>')
print('https://huggingface.co/spaces/' + repo)
"
```

(`upload_folder` inclut `hf-space/voices/ezekiel.safetensors` : c'est voulu — le Space est privé. Le `.gitignore` ne concerne que le repo GitHub.)

- [ ] **Step 3 : Attendre le build puis mesurer — gate GO/NO-GO**

Attendre que le Space soit « Running » (page du Space, ~5-10 min de build + démarrage). Puis mesurer À CHAUD (3 appels, jeter le 1er) :

```bash
POCKET_TTS_URL=https://<user>-interviewsim-tts.hf.space POCKET_TTS_TOKEN=<token_read> python -c "
import json, os, time, urllib.request
url, tok = os.environ['POCKET_TTS_URL'], os.environ['POCKET_TTS_TOKEN']
text = 'Très bien. Vous dites avoir géré plusieurs projets. Donnez-moi un exemple concret, avec des chiffres, et expliquez comment vous mesurez ce succès.'
for i in range(3):
    req = urllib.request.Request(url + '/tts',
        data=json.dumps({'text': text, 'voice': 'ezekiel'}).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok})
    t0 = time.time(); mp3 = urllib.request.urlopen(req, timeout=120).read(); dt = time.time() - t0
    print(f'appel {i}: {dt:.1f}s pour {len(mp3)} octets')
# durée audio ~ len(mp3)/6000 octets/s à 48 kbit/s -> RTF ~ dt / (len(mp3)/6000)
"
```

Calculer le RTF des appels 2-3 : `RTF = temps_de_génération / durée_audio` (durée ≈ octets/6000). **GO si RTF < 1** et si une phrase courte (~8 s d'audio) sort en < ~3 s (extrapolation : RTF × 8 s... mesurer aussi avec une phrase courte si limite). **NO-GO** → consigner les chiffres au ledger, mettre le Space en pause, STOP ici (Tasks 4-7 attendront le VPS ; le code des Tasks 1-2 reste commité et prêt).

- [ ] **Step 4 : Config app locale + rappel sécurité**

Si GO : ajouter à `.env.local` : `POCKET_TTS_URL=...` et `POCKET_TTS_TOKEN=<token_read>`. L'utilisateur **révoque le token write**. Consigner GO + RTF mesuré au ledger.

---

### Task 4 : Catalogue app `lib/pocketVoices.ts` + validation prefs (TDD)

**Files:**
- Create: `lib/pocketVoices.ts`
- Modify: `lib/voicePrefs.ts` (validation sur la liste combinée)
- Test: `tests/pocketVoices.test.ts`

**Interfaces:**
- Consumes: type `SoloVoice`, `EDGE_SOLO_VOICES`, `EDGE_SOLO_VOICE` de `lib/edgeVoices.ts` (existant).
- Produces: `POCKET_PREFIX = "pocket:"` ; `POCKET_SOLO_VOICES: SoloVoice[]` (ids/labels ; `voice` = `pocket:<id>`) ; `SOLO_VOICES: SoloVoice[]` (clonée en tête, puis edge, puis intégrées pocket) ; `isPocketVoice(voice: string): boolean` ; `pocketVoiceId(voice: string): string` ; `POCKET_VOICE_IDS: string[]` ; `soloVoiceById(id: string): string` (cherche dans SOLO_VOICES, repli `EDGE_SOLO_VOICE`).

- [ ] **Step 1 : Écrire les tests qui échouent — `tests/pocketVoices.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import {
  POCKET_SOLO_VOICES,
  SOLO_VOICES,
  POCKET_VOICE_IDS,
  isPocketVoice,
  pocketVoiceId,
  soloVoiceById,
} from "../lib/pocketVoices";
import { EDGE_SOLO_VOICES, EDGE_SOLO_VOICE } from "../lib/edgeVoices";
import { resolveVoicePref } from "../lib/voicePrefs";

describe("pocketVoices", () => {
  it("la voix clonée ezekiel existe et ouvre la liste du sélecteur", () => {
    expect(POCKET_SOLO_VOICES[0].id).toBe("ezekiel");
    expect(SOLO_VOICES[0].id).toBe("ezekiel");
    expect(SOLO_VOICES[0].label).toContain("ivoirien");
  });
  it("toutes les voix pocket sont préfixées pocket: et les edge non", () => {
    for (const v of POCKET_SOLO_VOICES) expect(isPocketVoice(v.voice)).toBe(true);
    for (const v of EDGE_SOLO_VOICES) expect(isPocketVoice(v.voice)).toBe(false);
  });
  it("pocketVoiceId extrait l'id envoyé au Space", () => {
    expect(pocketVoiceId("pocket:ezekiel")).toBe("ezekiel");
    expect(POCKET_VOICE_IDS).toContain("ezekiel");
  });
  it("les ids de SOLO_VOICES sont uniques et contiennent edge + pocket", () => {
    const ids = SOLO_VOICES.map((v) => v.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("denise");
  });
  it("soloVoiceById résout pocket ET edge, repli sur le défaut historique", () => {
    expect(soloVoiceById("ezekiel")).toBe("pocket:ezekiel");
    expect(soloVoiceById("denise")).toBe("fr-FR-DeniseNeural");
    expect(soloVoiceById("inconnu")).toBe(EDGE_SOLO_VOICE);
  });
  it("resolveVoicePref accepte désormais un id pocket mémorisé", () => {
    expect(resolveVoicePref("ezekiel", null).soloId).toBe("ezekiel");
    expect(resolveVoicePref("nimporte", null).soloId).toBe("denise");
  });
});
```

- [ ] **Step 2 : Vérifier l'échec** — Run : `npm test 2>&1 | tail -8`. Attendu : ÉCHEC (`../lib/pocketVoices` introuvable).

- [ ] **Step 3 : Implémenter `lib/pocketVoices.ts`**

```ts
import type { SoloVoice } from "./edgeVoices";
import { EDGE_SOLO_VOICES, EDGE_SOLO_VOICE } from "./edgeVoices";

// Voix servies par le Space pocket-tts privé (voir hf-space/app.py, ids identiques).
// Le préfixe "pocket:" dans le champ voice est ce qui route /api/tts vers le Space
// au lieu d'edge-tts ; l'id nu (après le préfixe) est ce que le Space attend.
export const POCKET_PREFIX = "pocket:";

// ATTENTION : recopier ici la liste FINALE de la Task 2 (curation à l'écoute).
export const POCKET_SOLO_VOICES: SoloVoice[] = [
  { id: "ezekiel", label: "Ézéchiel · accent ivoirien 🇨🇮", voice: "pocket:ezekiel" },
  { id: "estelle", label: "Estelle (femme)", voice: "pocket:estelle" },
];

// Liste du sélecteur solo : la voix clonée d'abord (c'est l'argument du produit),
// puis les voix edge actuelles, puis les intégrées pocket retenues.
export const SOLO_VOICES: SoloVoice[] = [
  POCKET_SOLO_VOICES[0],
  ...EDGE_SOLO_VOICES,
  ...POCKET_SOLO_VOICES.slice(1),
];

export function isPocketVoice(voice: string): boolean {
  return voice.startsWith(POCKET_PREFIX);
}
export function pocketVoiceId(voice: string): string {
  return voice.slice(POCKET_PREFIX.length);
}
export const POCKET_VOICE_IDS: string[] = POCKET_SOLO_VOICES.map((v) => pocketVoiceId(v.voice));

// Remplace edgeVoices.soloVoiceById partout où le solo peut être une voix pocket.
export function soloVoiceById(id: string): string {
  return SOLO_VOICES.find((v) => v.id === id)?.voice ?? EDGE_SOLO_VOICE;
}
```

- [ ] **Step 4 : Brancher la validation des prefs — `lib/voicePrefs.ts`**

Remplacer l'import et la ligne solo :

```ts
import { EDGE_JURY_PACKS, DEFAULT_SOLO_VOICE_ID, DEFAULT_JURY_PACK_ID } from "./edgeVoices";
import { SOLO_VOICES } from "./pocketVoices";
```

et dans `resolveVoicePref` :

```ts
  const soloId = SOLO_VOICES.some((v) => v.id === rawSolo) ? rawSolo! : DEFAULT_SOLO_VOICE_ID;
```

(Le pack jury ne change pas.)

- [ ] **Step 5 : Vérifier que tout passe** — Run : `npm test 2>&1 | tail -4`. Attendu : PASS (y compris les tests voicePrefs existants — le défaut reste `denise`).

- [ ] **Step 6 : Commit**

```bash
git add lib/pocketVoices.ts lib/voicePrefs.ts tests/pocketVoices.test.ts
git commit -m "feat(voix): catalogue des voix pocket (clonée en tête) + prefs qui les acceptent"
```

---

### Task 5 : Route `/api/tts` — branche pocket avec repli edge + route de réveil

**Files:**
- Modify: `app/api/tts/route.ts`
- Create: `app/api/tts/wake/route.ts`

**Interfaces:**
- Consumes: `isPocketVoice`, `pocketVoiceId`, `POCKET_VOICE_IDS` (Task 4) ; env `POCKET_TTS_URL`, `POCKET_TTS_TOKEN`.
- Produces: `POST /api/tts` accepte en plus les voix `pocket:<id>` (MP3 du Space, repli edge silencieux) ; `GET /api/tts/wake` → toujours 204 (pingue le Space côté serveur).

- [ ] **Step 1 : Réécrire `app/api/tts/route.ts`** (l'actuel chemin edge devient la fonction `edgeMp3`, réutilisée telle quelle par le repli) :

```ts
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { EDGE_VOICE_ALLOWLIST, EDGE_SOLO_VOICE } from "@/lib/edgeVoices";
import { isPocketVoice, pocketVoiceId, POCKET_VOICE_IDS } from "@/lib/pocketVoices";

export const runtime = "nodejs";

// Chemin edge historique, inchangé — sert aussi de repli aux voix pocket.
async function edgeMp3(voice: string, text: string): Promise<Buffer | null> {
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text);

    const chunks: Buffer[] = [];
    const collect = new Promise<void>((resolve, reject) => {
      audioStream.on("data", (c: Buffer) => chunks.push(c));
      audioStream.on("end", () => resolve());
      audioStream.on("error", reject);
    });
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), 8000)
    );
    await Promise.race([collect, timeout]);

    const audio = Buffer.concat(chunks);
    return audio.length === 0 ? null : audio;
  } catch {
    return null;
  }
}

// Voix pocket : Space HF privé. null (panne, timeout, env absente) => le caller replie sur edge.
async function pocketMp3(voiceId: string, text: string): Promise<Buffer | null> {
  const url = process.env.POCKET_TTS_URL;
  const token = process.env.POCKET_TTS_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(`${url}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, voice: voiceId }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const audio = Buffer.from(await res.arrayBuffer());
    return audio.length === 0 ? null : audio;
  } catch {
    return null;
  }
}

function mp3Response(audio: Buffer): Response {
  return new Response(new Uint8Array(audio), {
    headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
  });
}

export async function POST(req: Request): Promise<Response> {
  let body: { text?: string; voice?: string };
  try {
    body = await req.json();
  } catch {
    return new Response("Requête invalide.", { status: 400 });
  }

  const text = (body.text ?? "").trim();
  const voice = body.voice ?? "";
  if (!text || text.length > 800) return new Response("Texte invalide.", { status: 400 });

  if (isPocketVoice(voice)) {
    const id = pocketVoiceId(voice);
    if (!POCKET_VOICE_IDS.includes(id)) return new Response("Voix inconnue.", { status: 400 });
    // Space endormi/en panne -> repli edge silencieux : l'utilisateur entend toujours quelque chose.
    const audio = (await pocketMp3(id, text)) ?? (await edgeMp3(EDGE_SOLO_VOICE, text));
    return audio ? mp3Response(audio) : new Response("Synthèse indisponible.", { status: 502 });
  }

  if (!EDGE_VOICE_ALLOWLIST.includes(voice)) return new Response("Voix inconnue.", { status: 400 });
  const audio = await edgeMp3(voice, text);
  return audio ? mp3Response(audio) : new Response("Synthèse indisponible.", { status: 502 });
}
```

- [ ] **Step 2 : Créer `app/api/tts/wake/route.ts`**

```ts
export const runtime = "nodejs";

// Ping de réveil du Space (privé => seul le serveur peut le joindre).
// Fire-and-forget : la réponse du Space n'a aucune importance, on répond toujours 204.
export async function GET(): Promise<Response> {
  const url = process.env.POCKET_TTS_URL;
  const token = process.env.POCKET_TTS_TOKEN;
  if (url && token) {
    try {
      await fetch(`${url}/health`, {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // Space en cours de réveil ou injoignable : c'était justement le but du ping.
    }
  }
  return new Response(null, { status: 204 });
}
```

- [ ] **Step 3 : Vérifier build + tests** — Run : `npm run build 2>&1 | tail -3 && npm test 2>&1 | tail -3`. Attendu : build OK (`/api/tts/wake` listée), tests PASS.

- [ ] **Step 4 : Smoke du repli SANS env (aucun secret requis)**

Lancer `npm run dev` (arrière-plan), puis :

```bash
curl -s -o /tmp/repli.mp3 -w "%{http_code}\n" -X POST http://localhost:3000/api/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Test du repli edge.","voice":"pocket:ezekiel"}' && ls -la /tmp/repli.mp3
```

Attendu : `200` et un MP3 non vide — `POCKET_TTS_URL` absente de l'env par défaut → repli edge (voix Denise). Une voix `pocket:inconnue` doit renvoyer `400`. Arrêter le serveur dev.

- [ ] **Step 5 : Commit**

```bash
git add app/api/tts/route.ts app/api/tts/wake/route.ts
git commit -m "feat(voix): /api/tts route les voix pocket vers le Space privé (repli edge silencieux) + /api/tts/wake"
```

---

### Task 6 : Salon — sélecteur enrichi + ping de réveil

**Files:**
- Modify: `app/components/meeting/MeetingLobby.tsx` (liste combinée)
- Modify: `app/components/meeting/MeetingRoom.tsx` (résolveur pocket + ping)

**Interfaces:**
- Consumes: `SOLO_VOICES`, `soloVoiceById`, `isPocketVoice` de `lib/pocketVoices.ts` (Task 4) ; `GET /api/tts/wake` (Task 5).
- Produces: rien (feuille de l'arbre).

- [ ] **Step 1 : `MeetingLobby.tsx` — afficher la liste combinée**

Remplacer l'import :

```ts
import { EDGE_JURY_PACKS } from "@/lib/edgeVoices";
import { SOLO_VOICES } from "@/lib/pocketVoices";
```

et dans le `<select>` solo, remplacer `EDGE_SOLO_VOICES.map` par `SOLO_VOICES.map` (rien d'autre ne change : ▶ Écouter et la persistance passent déjà par `soloId`).

- [ ] **Step 2 : `MeetingRoom.tsx` — résolveur + ping de réveil**

Ligne 6, remplacer :

```ts
import { juryVoicesByPack } from "@/lib/edgeVoices";
import { soloVoiceById, isPocketVoice } from "@/lib/pocketVoices";
```

(les deux usages existants de `soloVoiceById(pref.soloId)` — preview ~l.65 et effet de parole ~l.169 — résolvent maintenant aussi les voix pocket, sans autre changement).

Ajouter l'effet de réveil après la déclaration de `pref` (~l.47) :

```ts
  // Réveille le Space pocket-tts pendant que l'utilisateur est au salon (fire-and-forget).
  useEffect(() => {
    if (isPocketVoice(soloVoiceById(getVoicePref().soloId))) {
      void fetch("/api/tts/wake").catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // au montage seulement : un réveil suffit
```

- [ ] **Step 3 : Vérifier build + tsc** — Run : `npm run build 2>&1 | tail -3 && npx tsc --noEmit`. Attendu : OK.

- [ ] **Step 4 : Commit**

```bash
git add app/components/meeting/MeetingLobby.tsx app/components/meeting/MeetingRoom.tsx
git commit -m "feat(voix): voix pocket dans le sélecteur du salon (clonée en tête) + ping de réveil du Space"
```

---

### Task 7 : Vérification finale (Space réel) + push

**Files:** aucun nouveau.

- [ ] **Step 1 : Suite complète**

Run : `npm run build 2>&1 | tail -3 && npm test 2>&1 | tail -5 && npx tsc --noEmit`
Attendu : tout vert.

- [ ] **Step 2 : Bout en bout réel (navigateur, `.env.local` avec le Space GO de la Task 3)**

1. Salon solo : le sélecteur liste « Ézéchiel · accent ivoirien 🇨🇮 » en premier, puis Denise/Henri/Vivienne/Rémy et les intégrées retenues. ▶ Écouter sur Ézéchiel joue la voix clonée.
2. Entretien complet avec Ézéchiel : chaque réplique du recruteur est parlée avec l'accent, sans trou entre les phrases (préchargement).
3. Choix mémorisé après rechargement de la page (localStorage).
4. Repli : retirer `POCKET_TTS_URL` de `.env.local`, relancer → le même entretien parle en voix edge Denise, sans erreur visible.
5. Jury : les packs edge fonctionnent comme avant (zéro régression).

- [ ] **Step 3 : Pousser la branche**

```bash
git push origin feat/voix-accent
```

(Vercel : ajouter `POCKET_TTS_URL` + `POCKET_TTS_TOKEN` dans les env vars du projet au moment du déploiement — action utilisateur, à rappeler.)
