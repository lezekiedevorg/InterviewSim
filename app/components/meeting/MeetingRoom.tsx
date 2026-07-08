"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { useVoice } from "@/lib/useVoice";
import { soloVoiceById, juryVoicesByPack } from "@/lib/edgeVoices";
import { getVoicePref, setVoicePref } from "@/lib/voicePrefs";
import { nextSpeakableChunk, mergeTranscript } from "@/lib/speech";
import { PERSONAS, parseSpeaker, type PersonaId } from "@/lib/jury";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { createSilenceDetector } from "@/lib/silenceDetector";
import { useMicEnergy } from "@/lib/useMicEnergy";
import { RecruiterTile } from "./RecruiterTile";
import { UserTile } from "./UserTile";
import { MeetingControls, type LiveState } from "./MeetingControls";
import { MeetingLobby } from "./MeetingLobby";
import { TranscriptPanel } from "./TranscriptPanel";

// ponytail: seuils de conversation mains-libres — calibration (débit de parole / pauses réelles).
// 2000 ms : laisse le temps d'une pause de réflexion sans couper. 1200 coupait trop tôt.
// Vrai correctif à terme : endpointing basé sur l'énergie micro (réutiliser useMicEnergy)
// pour ne déclencher que sur un vrai silence acoustique, pas une simple pause de mots.
const SILENCE_MS = 2000; // silence sans nouveaux mots avant l'envoi automatique
const MIC_REOPEN_MS = 400; // anti-rebond avant réouverture auto du micro (absorbe les micro-coupures d'isSpeaking entre phrases)

type Props = {
  history: ChatMessage[];
  streaming: boolean;
  currentAnswer: string;
  setCurrentAnswer: (v: string) => void;
  sendAnswer: () => void;
  finishInterview: () => void;
  errorMsg: string | null;
  jury: boolean;
};

export function MeetingRoom({
  history,
  streaming,
  currentAnswer,
  setCurrentAnswer,
  sendAnswer,
  finishInterview,
  errorMsg,
  jury,
}: Props) {
  const [joined, setJoined] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const { engine, supported, ready, speak, cancel, muted, toggleMute, isSpeaking, voices } = useVoice();
  const [pref, setPref] = useState(() => getVoicePref());
  function changeSolo(soloId: string) {
    setPref((p) => ({ ...p, soloId }));
    setVoicePref({ soloId });
  }
  function changePack(packId: string) {
    setPref((p) => ({ ...p, packId }));
    setVoicePref({ packId });
  }
  function previewVoice() {
    if (!ready) return;
    if (jury) {
      const v = juryVoicesByPack(pref.packId);
      speak("Bonjour, je suis la RH.", { edgeVoice: v.rh });
      speak("Et moi le manager opérationnel.", { edgeVoice: v.manager });
      speak("Et moi l'expert métier.", { edgeVoice: v.expert });
    } else {
      speak("Bonjour, installez-vous, nous allons commencer l'entretien.", {
        edgeVoice: soloVoiceById(pref.soloId),
      });
    }
  }

  // Voix + paramètres du persona courant (mode jury).
  function voiceOptsFor(id: PersonaId | null) {
    if (!id) return undefined;
    const idx = PERSONAS.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const p = PERSONAS[idx];
    const voice = voices.length ? voices[idx % voices.length] : undefined;
    return { pitch: p.pitch, rate: p.rate, voice, edgeVoice: juryVoicesByPack(pref.packId)[id] };
  }
  const spokenRef = useRef<{ index: number; len: number }>({ index: -1, len: 0 });
  const rec = useSpeechRecognition();
  const baseTextRef = useRef("");
  // Mode fluide par défaut : on rejoint, l'IA accueille, le micro se rouvre seul, l'envoi
  // part au silence — zéro clic. Le bouton « Parler » reste un filet de secours (manuel /
  // navigateurs sans Web Speech). Barge-in reste OFF (écho sans casque).
  const [handsFree, setHandsFree] = useState(true);

  // Refs vers les dernières valeurs/fonctions, pour que le détecteur (créé une fois) et l'effet
  // d'ouverture utilisent toujours la version courante SANS les mettre dans les tableaux de deps
  // (rec est recréé à chaque rendu ; currentAnswer change à chaque mot -> ne doivent pas réarmer les effets).
  const sendRef = useRef(sendAnswer);
  sendRef.current = sendAnswer;
  const recStopRef = useRef(rec.stop);
  recStopRef.current = rec.stop;
  const currentAnswerRef = useRef(currentAnswer);
  currentAnswerRef.current = currentAnswer;
  const detectorRef = useRef<ReturnType<typeof createSilenceDetector> | null>(null);
  if (detectorRef.current === null) {
    detectorRef.current = createSilenceDetector(SILENCE_MS, () => {
      recStopRef.current();
      sendRef.current();
    });
  }

  const [bargeIn, setBargeIn] = useState(false);

  // Interruption : coupe le TTS immédiatement puis ouvre le micro.
  // cancel() bascule isSpeaking à false dans le même rendu que rec.start(),
  // donc l'effet de coupure forcée (plus bas) laisse le micro ouvert.
  function handleBargeIn() {
    cancel();
    baseTextRef.current = currentAnswerRef.current;
    rec.start();
  }

  // Capteur de volume : actif seulement quand le barge-in est armé et non muet ;
  // ne nourrit la porte de parole que pendant que l'IA parle (isSpeaking).
  const micEnergy = useMicEnergy({
    enabled: bargeIn && joined && !muted && rec.supported,
    listening: isSpeaking,
    onSpeech: handleBargeIn,
  });

  // État conversationnel affiché en direct (dérivé, pas de source nouvelle).
  const liveState: LiveState = isSpeaking
    ? "speaking"
    : streaming
    ? "thinking"
    : rec.listening
    ? "listening"
    : "idle";

  function toggleBargeIn() {
    setBargeIn((b) => !b);
  }

  // Mains-libres : chaque mot reconnu réarme le minuteur de silence ; à échéance -> envoi auto (via detector).
  // On bump `rec.transcript` (texte reconnu brut) : la garde non-vide porte donc sur la parole, pas sur le champ.
  // Volontaire — pas d'envoi auto sur pur silence même si du texte a été tapé (l'envoi utilise bien currentAnswer via sendAnswer).
  useEffect(() => {
    const d = detectorRef.current!;
    if (handsFree && rec.listening) d.bump(rec.transcript);
    else d.cancel();
  }, [handsFree, rec.listening, rec.transcript]);

  // Annule tout minuteur de silence en cours au démontage (ex. clic « Terminer » pendant l'écoute) :
  // sinon le tir différé déclencherait un envoi fantôme sur l'écran de débrief.
  useEffect(() => () => detectorRef.current?.cancel(), []);

  // Mains-libres : rouvrir le micro tout seul quand le recruteur a fini (anti-rebond contre les micro-coupures d'isSpeaking).
  // Deps = uniquement des primitives + rec.start (stable, useCallback[]) — surtout PAS `rec` ni `currentAnswer`,
  // qui changent d'identité à chaque rendu et réarmeraient le minuteur en boucle (le micro ne s'ouvrirait jamais).
  useEffect(() => {
    if (!(handsFree && joined && !muted && !streaming && !isSpeaking && !rec.listening && rec.supported)) return;
    const t = setTimeout(() => {
      baseTextRef.current = currentAnswerRef.current;
      rec.start();
    }, MIC_REOPEN_MS);
    return () => clearTimeout(t);
  }, [handsFree, joined, muted, streaming, isSpeaking, rec.listening, rec.supported, rec.start]);

  // Pendant l'écoute, le texte reconnu remplit le champ (combiné à ce qui a été tapé).
  // Les modifications manuelles pendant l'écoute sont volontairement écrasées ; l'édition se fait après avoir arrêté le micro.
  useEffect(() => {
    if (rec.listening) setCurrentAnswer(mergeTranscript(baseTextRef.current, rec.transcript));
  }, [rec.listening, rec.transcript, setCurrentAnswer]);

  // Coupe le micro dès qu'il doit être bloqué (envoi en cours ou recruteur qui parle) :
  // évite que le champ se re-remplisse après envoi et que le micro capte la voix du recruteur.
  useEffect(() => {
    if ((streaming || isSpeaking) && rec.listening) rec.stop();
  }, [streaming, isSpeaking, rec.listening]);

  function toggleMic() {
    if (rec.listening) {
      rec.stop();
    } else {
      baseTextRef.current = currentAnswer;
      rec.start();
    }
  }

  function toggleHandsFree() {
    if (handsFree && rec.listening) rec.stop(); // couper le micro si on désactive en plein tour
    setHandsFree((h) => !h);
  }

  // Fait parler le recruteur phrase par phrase, au fil du flux.
  useEffect(() => {
    // Attend que le moteur soit décidé (probe edge/navigateur) avant de parler,
    // sinon les premières phrases passeraient par le navigateur puis basculeraient sur edge.
    if (!joined || muted || !ready) return;
    let lastIdx = -1;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === "recruiter") {
        lastIdx = i;
        break;
      }
    }
    if (lastIdx === -1) return;
    if (spokenRef.current.index !== lastIdx) spokenRef.current = { index: lastIdx, len: 0 };
    const text = history[lastIdx].text;
    const opts = jury
      ? voiceOptsFor(parseSpeaker(text).speaker)
      : { edgeVoice: soloVoiceById(pref.soloId) };
    let len = spokenRef.current.len;
    let guard = 0;
    while (guard++ < 200) {
      const res = nextSpeakableChunk(text, len);
      if (res.spokenLen === len) break;
      if (res.chunk) {
        // En mode jury, ne prononce pas le préfixe "Nom : " du premier chunk.
        const chunkText = jury ? parseSpeaker(res.chunk).body : res.chunk;
        speak(chunkText, opts);
      }
      len = res.spokenLen;
    }
    spokenRef.current = { index: lastIdx, len };
    // voices : les voix Web Speech se chargent en asynchrone ; sans cette dépendance,
    // l'effet garderait la liste vide et perdrait la différenciation vocale du jury.
  }, [history, joined, muted, ready, speak, jury, voices, pref]);

  // Nettoyage de la voix UNIQUEMENT au démontage (fin d'entretien).
  // On passe par une ref pour ne pas re-déclencher le nettoyage si `cancel`
  // change d'identité à chaque rendu (sinon la voix serait coupée en continu).
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  useEffect(() => () => cancelRef.current(), []);

  if (!joined) {
    return (
      <MeetingLobby
        onJoin={() => setJoined(true)}
        engine={engine}
        ready={ready}
        jury={jury}
        soloId={pref.soloId}
        packId={pref.packId}
        onChangeSolo={changeSolo}
        onChangePack={changePack}
        onPreview={previewVoice}
      />
    );
  }

  let lastRecruiterText = "";
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].role === "recruiter") {
      lastRecruiterText = history[i].text;
      break;
    }
  }
  const currentSpeaker = jury ? parseSpeaker(lastRecruiterText).speaker : null;

  return (
    <div className="flex flex-col gap-4 animate-rise">
      {jury ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PERSONAS.map((p) => (
              <RecruiterTile
                key={p.id}
                name={p.name}
                initials={p.initials}
                compact
                speaking={isSpeaking && currentSpeaker === p.id}
              />
            ))}
          </div>
          {cameraOn && (
            <div className="grid grid-cols-2 sm:grid-cols-3">
              <UserTile cameraOn={cameraOn} />
            </div>
          )}
        </div>
      ) : (
        <div className="relative">
          <RecruiterTile speaking={isSpeaking} />
          {/* Médaillon « Toi » incrusté, comme dans un vrai appel vidéo */}
          <div className={`absolute bottom-3 right-3 ${cameraOn ? "w-32 sm:w-40" : ""}`}>
            <UserTile cameraOn={cameraOn} inset={!cameraOn} />
          </div>
        </div>
      )}

      {!supported && (
        <p className="rounded-xl border border-amber-400/45 bg-amber-400/10 px-3.5 py-2.5 text-sm text-amber-300">
          La synthèse vocale n&apos;est pas supportée sur ce navigateur. Ouvre la transcription
          pour lire l&apos;entretien.
        </p>
      )}
      {(errorMsg || rec.error || micEnergy.error) && (
        <p className="rounded-xl border border-danger-400/40 bg-danger-400/10 px-3.5 py-2.5 text-sm text-danger-400">{errorMsg || rec.error || micEnergy.error}</p>
      )}

      {showTranscript && <TranscriptPanel history={history} />}

      <MeetingControls
        muted={muted}
        onToggleMute={toggleMute}
        showTranscript={showTranscript}
        onToggleTranscript={() => setShowTranscript((s) => !s)}
        cameraOn={cameraOn}
        onToggleCamera={() => setCameraOn((c) => !c)}
        currentAnswer={currentAnswer}
        onAnswerChange={setCurrentAnswer}
        onSend={sendAnswer}
        onFinish={finishInterview}
        streaming={streaming}
        speechSupported={supported}
        recognitionSupported={rec.supported}
        listening={rec.listening}
        onToggleMic={toggleMic}
        micDisabled={streaming || isSpeaking}
        handsFree={handsFree}
        onToggleHandsFree={toggleHandsFree}
        liveState={liveState}
        bargeIn={bargeIn}
        onToggleBargeIn={toggleBargeIn}
        bargeInSupported={rec.supported && micEnergy.supported}
      />
    </div>
  );
}
