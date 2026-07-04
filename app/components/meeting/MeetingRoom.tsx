"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { useVoice } from "@/lib/useVoice";
import { EDGE_PERSONA_VOICE } from "@/lib/edgeVoices";
import { nextSpeakableChunk, mergeTranscript } from "@/lib/speech";
import { PERSONAS, parseSpeaker, type PersonaId } from "@/lib/jury";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { RecruiterTile } from "./RecruiterTile";
import { UserTile } from "./UserTile";
import { MeetingControls } from "./MeetingControls";
import { MeetingLobby } from "./MeetingLobby";
import { TranscriptPanel } from "./TranscriptPanel";

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
  const { supported, ready, speak, cancel, muted, toggleMute, isSpeaking, voices } = useVoice();

  // Voix + paramètres du persona courant (mode jury).
  function voiceOptsFor(id: PersonaId | null) {
    if (!id) return undefined;
    const idx = PERSONAS.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    const p = PERSONAS[idx];
    const voice = voices.length ? voices[idx % voices.length] : undefined;
    return { pitch: p.pitch, rate: p.rate, voice, edgeVoice: EDGE_PERSONA_VOICE[id] };
  }
  const spokenRef = useRef<{ index: number; len: number }>({ index: -1, len: 0 });
  const rec = useSpeechRecognition();
  const baseTextRef = useRef("");

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
    const opts = jury ? voiceOptsFor(parseSpeaker(text).speaker) : undefined;
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
  }, [history, joined, muted, ready, speak, jury, voices]);

  // Nettoyage de la voix UNIQUEMENT au démontage (fin d'entretien).
  // On passe par une ref pour ne pas re-déclencher le nettoyage si `cancel`
  // change d'identité à chaque rendu (sinon la voix serait coupée en continu).
  const cancelRef = useRef(cancel);
  cancelRef.current = cancel;
  useEffect(() => () => cancelRef.current(), []);

  if (!joined) {
    return <MeetingLobby onJoin={() => setJoined(true)} />;
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
          <div className="grid grid-cols-3 gap-2">
            {PERSONAS.map((p) => (
              <RecruiterTile
                key={p.id}
                name={p.name}
                initials={p.initials}
                speaking={isSpeaking && currentSpeaker === p.id}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3">
            <UserTile cameraOn={cameraOn} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <RecruiterTile speaking={isSpeaking} />
          </div>
          <UserTile cameraOn={cameraOn} />
        </div>
      )}

      {!supported && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          La synthèse vocale n&apos;est pas supportée sur ce navigateur. Ouvre la transcription
          pour lire l&apos;entretien.
        </p>
      )}
      {(errorMsg || rec.error) && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{errorMsg || rec.error}</p>
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
      />
    </div>
  );
}
