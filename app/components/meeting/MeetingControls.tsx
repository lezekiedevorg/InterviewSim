"use client";

import { Button } from "@/app/components/ui/Button";

type Props = {
  muted: boolean;
  onToggleMute: () => void;
  showTranscript: boolean;
  onToggleTranscript: () => void;
  cameraOn: boolean;
  onToggleCamera: () => void;
  currentAnswer: string;
  onAnswerChange: (v: string) => void;
  onSend: () => void;
  onFinish: () => void;
  streaming: boolean;
  speechSupported: boolean;
  recognitionSupported: boolean;
  listening: boolean;
  onToggleMic: () => void;
  micDisabled: boolean;
  handsFree: boolean;
  onToggleHandsFree: () => void;
};

const pill = "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors";

export function MeetingControls({
  muted,
  onToggleMute,
  showTranscript,
  onToggleTranscript,
  cameraOn,
  onToggleCamera,
  currentAnswer,
  onAnswerChange,
  onSend,
  onFinish,
  streaming,
  speechSupported,
  recognitionSupported,
  listening,
  onToggleMic,
  micDisabled,
  handsFree,
  onToggleHandsFree,
}: Props) {
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          disabled={!speechSupported}
          className={`${pill} ${muted ? "bg-slate-200 text-slate-600" : "bg-brand-50 text-brand-700"} disabled:opacity-40`}
        >
          {muted ? "🔇 Son coupé" : "🔊 Son"}
        </button>
        <button
          type="button"
          onClick={onToggleTranscript}
          className={`${pill} ${showTranscript ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"}`}
        >
          💬 Transcription
        </button>
        {recognitionSupported && (
          <button
            type="button"
            onClick={onToggleMic}
            disabled={micDisabled}
            className={`${pill} ${listening ? "animate-pulse bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"} disabled:opacity-40`}
          >
            {listening ? "🎤 J'écoute…" : "🎤 Parler"}
          </button>
        )}
        {recognitionSupported && (
          <button
            type="button"
            onClick={onToggleHandsFree}
            className={`${pill} ${handsFree ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"}`}
          >
            {handsFree ? "🎙️ Mains-libres activé" : "🎙️ Mains-libres"}
          </button>
        )}
        <button
          type="button"
          onClick={onToggleCamera}
          className={`${pill} ${cameraOn ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"}`}
        >
          {cameraOn ? "📷 Caméra active" : "📷 Activer la caméra"}
        </button>
        <button type="button" onClick={onFinish} disabled={streaming} className={`${pill} bg-red-50 text-red-600 disabled:opacity-40`}>
          ☎️ Terminer
        </button>
      </div>
      <div className="flex items-end gap-2">
        <textarea
          aria-label="Ta réponse"
          className="min-h-[48px] w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm outline-none transition-shadow focus:border-brand-600 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50"
          value={currentAnswer}
          disabled={streaming}
          onChange={(e) => onAnswerChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ta réponse…  (Entrée pour envoyer)"
        />
        <Button onClick={onSend} disabled={streaming || currentAnswer.trim() === ""}>
          Envoyer
        </Button>
      </div>
    </div>
  );
}
