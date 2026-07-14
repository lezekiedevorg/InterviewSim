"use client";

import {
  VolumeIcon,
  VolumeOffIcon,
  MessageIcon,
  MicIcon,
  RadioIcon,
  VideoIcon,
  PhoneOffIcon,
  SendIcon,
  HandIcon,
} from "@/app/components/ui/icons";

export type LiveState = "idle" | "thinking" | "speaking" | "listening";

const LIVE_LABEL: Record<LiveState, string> = {
  idle: "En pause",
  thinking: "L'IA réfléchit…",
  speaking: "Au tour de l'IA",
  listening: "Je t'écoute",
};

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
  liveState?: LiveState;
  bargeIn?: boolean;
  onToggleBargeIn?: () => void;
  bargeInSupported?: boolean;
};

// Mobile : rond icône-seule (48px). Tablette et plus : pilule avec libellé.
const pill =
  "flex h-12 w-12 cursor-pointer items-center justify-center gap-1.5 rounded-full border text-[13px] font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:w-auto sm:min-h-[44px] sm:px-4 sm:py-2";
const pillOn = "border-amber-400 bg-amber-400 text-amber-ink";
const pillOff = "border-cream/[0.18] bg-night-700 text-muted hover:border-amber-400/60 hover:text-cream";
const pillLabel = "hidden sm:inline";

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
  liveState = "idle",
  bargeIn = false,
  onToggleBargeIn,
  bargeInSupported = false,
}: Props) {
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-center">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors duration-200 ${
            liveState === "listening"
              ? "bg-danger-600/15 text-danger-400"
              : liveState === "speaking"
              ? "bg-amber-400/15 text-amber-300"
              : liveState === "thinking"
              ? "bg-amber-400/10 text-amber-400"
              : "bg-night-700 text-faint ring-1 ring-cream/15"
          }`}
          aria-live="polite"
        >
          <span
            className={`h-2 w-2 rounded-full ${
              liveState === "listening"
                ? "animate-pulse bg-danger-400"
                : liveState === "speaking"
                ? "bg-amber-400"
                : liveState === "thinking"
                ? "animate-pulse bg-amber-400"
                : "bg-cream/30"
            }`}
            aria-hidden
          />
          {LIVE_LABEL[liveState]}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onToggleMute}
          disabled={!speechSupported}
          aria-label={muted ? "Réactiver le son" : "Couper le son"}
          className={`${pill} ${muted ? "border-cream/[0.18] bg-night-700 text-danger-400" : pillOff}`}
        >
          {muted ? <VolumeOffIcon /> : <VolumeIcon />}
          <span className={pillLabel}>{muted ? "Son coupé" : "Son"}</span>
        </button>
        <button
          type="button"
          onClick={onToggleTranscript}
          aria-label="Transcription"
          className={`${pill} ${showTranscript ? pillOn : pillOff}`}
        >
          <MessageIcon />
          <span className={pillLabel}>Transcription</span>
        </button>
        {recognitionSupported && (
          <button
            type="button"
            onClick={onToggleMic}
            disabled={micDisabled}
            className={`flex min-h-[52px] cursor-pointer items-center gap-2 rounded-full px-6 py-3 font-heading text-[15px] font-extrabold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
              listening
                ? "bg-danger-600 text-white shadow-[0_6px_20px_rgba(199,62,51,0.4)]"
                : "bg-amber-400 text-amber-ink shadow-cta hover:-translate-y-0.5 active:translate-y-0"
            }`}
          >
            <MicIcon />
            {listening ? "J'écoute…" : "Parler"}
          </button>
        )}
        {recognitionSupported && (
          <button
            type="button"
            onClick={onToggleHandsFree}
            aria-label="Mains-libres"
            className={`${pill} ${handsFree ? pillOn : pillOff}`}
          >
            <RadioIcon />
            <span className={pillLabel}>Mains-libres</span>
          </button>
        )}
        {bargeInSupported && (
          <button
            type="button"
            onClick={onToggleBargeIn}
            aria-pressed={bargeIn}
            aria-label="Couper la parole de l'IA"
            className={`${pill} ${bargeIn ? pillOn : pillOff}`}
          >
            <HandIcon />
            <span className={pillLabel}>Couper la parole</span>
          </button>
        )}
        <button
          type="button"
          onClick={onToggleCamera}
          aria-label="Caméra"
          className={`${pill} ${cameraOn ? pillOn : pillOff}`}
        >
          <VideoIcon />
          <span className={pillLabel}>Caméra</span>
        </button>
        <button
          type="button"
          onClick={onFinish}
          disabled={streaming}
          aria-label="Terminer l'entretien"
          className={`${pill} border-danger-600 bg-danger-600 font-bold text-white hover:bg-danger-400 hover:border-danger-400`}
        >
          <PhoneOffIcon />
          <span className={pillLabel}>Terminer</span>
        </button>
      </div>
      {bargeIn && (
        <p className="text-center text-[12px] text-faint">
          🎧 Mets un casque pour bien couper la parole (sans casque, l&apos;écho gêne).
        </p>
      )}
      <div className="flex items-end gap-2.5">
        <textarea
          aria-label="Ta réponse"
          className="min-h-[50px] w-full resize-none rounded-3xl border border-cream/[0.18] bg-night-800 px-5 py-3.5 text-base sm:text-[15px] font-medium text-cream placeholder:text-faint outline-none transition-colors duration-200 hover:border-cream/30 focus:border-amber-400 disabled:opacity-50"
          value={currentAnswer}
          disabled={streaming}
          onChange={(e) => onAnswerChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ou écris ta réponse ici…"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={streaming || currentAnswer.trim() === ""}
          aria-label="Envoyer"
          className="grid h-[50px] w-[50px] shrink-0 cursor-pointer place-items-center rounded-full border border-amber-400/45 bg-amber-400/10 text-amber-400 transition-colors duration-200 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SendIcon className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
}
