"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { nextSpeakableChunk, mergeTranscript } from "@/lib/speech";
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
};

export function MeetingRoom({
  history,
  streaming,
  currentAnswer,
  setCurrentAnswer,
  sendAnswer,
  finishInterview,
  errorMsg,
}: Props) {
  const [joined, setJoined] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const { supported, speak, cancel, muted, toggleMute, isSpeaking } = useSpeech();
  const spokenRef = useRef<{ index: number; len: number }>({ index: -1, len: 0 });
  const rec = useSpeechRecognition();
  const baseTextRef = useRef("");

  // Pendant l'écoute, le texte reconnu remplit le champ (combiné à ce qui a été tapé).
  useEffect(() => {
    if (rec.listening) setCurrentAnswer(mergeTranscript(baseTextRef.current, rec.transcript));
  }, [rec.listening, rec.transcript, setCurrentAnswer]);

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
    if (!joined || muted) return;
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
    let len = spokenRef.current.len;
    let guard = 0;
    while (guard++ < 200) {
      const res = nextSpeakableChunk(text, len);
      if (res.spokenLen === len) break;
      if (res.chunk) speak(res.chunk);
      len = res.spokenLen;
    }
    spokenRef.current = { index: lastIdx, len };
  }, [history, joined, muted, speak]);

  // Nettoyage de la voix au démontage (fin d'entretien).
  useEffect(() => cancel, [cancel]);

  if (!joined) {
    return <MeetingLobby onJoin={() => setJoined(true)} />;
  }

  return (
    <div className="flex flex-col gap-4 animate-rise">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <RecruiterTile speaking={isSpeaking} />
        </div>
        <UserTile cameraOn={cameraOn} />
      </div>

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
