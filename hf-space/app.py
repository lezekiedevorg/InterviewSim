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
    wav.close = lambda: None  # ponytail: stream_audio_chunks fait `with f:` → close() ; getvalue() doit marcher après
    chunks = MODEL.generate_audio_stream(model_state=state, text_to_generate=text)
    stream_audio_chunks(wav, chunks, MODEL.config.mimi.sample_rate)
    mp3 = subprocess.run(
        [ffmpeg_exe(), "-hide_banner", "-loglevel", "error",
         "-f", "wav", "-i", "pipe:0", "-b:a", "48k", "-ac", "1", "-f", "mp3", "pipe:1"],
        input=wav.getvalue(), capture_output=True, check=True,
    ).stdout
    return Response(content=mp3, media_type="audio/mpeg")
