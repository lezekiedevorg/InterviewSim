"use client";

import { Button } from "@/app/components/ui/Button";
import {
  VolumeIcon,
  VolumeOffIcon,
  MessageIcon,
  MicIcon,
  RadioIcon,
  VideoIcon,
  PhoneOffIcon,
  SendIcon,
} from "@/app/components/ui/icons";

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

const pill =
  "flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-all duration-200 hover:shadow-soft";
const pillOn = "bg-brand-100 text-brand-800 ring-1 ring-brand-200";
const pillOff = "bg-white/80 text-slate-600 ring-1 ring-slate-200 backdrop-blur hover:text-slate-900";

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
          className={`${pill} ${muted ? "bg-slate-200 text-slate-600" : pillOn} disabled:opacity-40`}
        >
          {muted ? <VolumeOffIcon /> : <VolumeIcon />}
          {muted ? "Son coupé" : "Son"}
        </button>
        <button
          type="button"
          onClick={onToggleTranscript}
          className={`${pill} ${showTranscript ? pillOn : pillOff}`}
        >
          <MessageIcon />
          Transcription
        </button>
        {recognitionSupported && (
          <button
            type="button"
            onClick={onToggleMic}
            disabled={micDisabled}
            className={`${pill} relative ${
              listening ? "bg-red-100 text-red-700 ring-1 ring-red-200" : pillOff
            } disabled:opacity-40`}
          >
            {listening && (
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-red-300/50" aria-hidden />
            )}
            <MicIcon />
            {listening ? "J'écoute…" : "Parler"}
          </button>
        )}
        {recognitionSupported && (
          <button
            type="button"
            onClick={onToggleHandsFree}
            className={`${pill} ${handsFree ? pillOn : pillOff}`}
          >
            <RadioIcon />
            {handsFree ? "Mains-libres activé" : "Mains-libres"}
          </button>
        )}
        <button type="button" onClick={onToggleCamera} className={`${pill} ${cameraOn ? pillOn : pillOff}`}>
          <VideoIcon />
          {cameraOn ? "Caméra active" : "Activer la caméra"}
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={streaming}
          className={`${pill} bg-red-50 text-red-600 ring-1 ring-red-100 hover:bg-red-100 disabled:opacity-40`}
        >
          <PhoneOffIcon />
          Terminer
        </button>
      </div>
      <div className="flex items-end gap-2">
        <textarea
          aria-label="Ta réponse"
          className="min-h-[48px] w-full resize-none rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-base sm:text-sm outline-none transition-all duration-200 backdrop-blur hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100 disabled:bg-slate-50"
          value={currentAnswer}
          disabled={streaming}
          onChange={(e) => onAnswerChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ta réponse…  (Entrée pour envoyer)"
        />
        <Button onClick={onSend} disabled={streaming || currentAnswer.trim() === ""}>
          <SendIcon />
          Envoyer
        </Button>
      </div>
    </div>
  );
}
