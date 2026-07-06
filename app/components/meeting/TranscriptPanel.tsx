import type { ChatMessage } from "@/lib/types";

export function TranscriptPanel({ history }: { history: ChatMessage[] }) {
  return (
    <div className="flex max-h-[40vh] flex-col gap-3 overflow-y-auto rounded-[20px] border border-cream/15 bg-night-800 p-4 animate-rise">
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
        Transcription
      </span>
      {history.length === 0 && (
        <p className="text-sm text-faint">La transcription apparaîtra ici…</p>
      )}
      {history.map((m, i) => (
        <div
          key={i}
          className={`max-w-[85%] whitespace-pre-wrap px-3.5 py-2.5 text-sm leading-relaxed text-cream animate-rise ${
            m.role === "recruiter"
              ? "self-start rounded-[16px_16px_16px_4px] border border-cream/10 bg-night-700"
              : "self-end rounded-[16px_16px_4px_16px] border border-amber-400/30 bg-amber-400/10"
          }`}
        >
          <strong className="mb-0.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-amber-400">
            {m.role === "recruiter" ? "Recruteur" : "Toi"}
          </strong>
          {m.text}
        </div>
      ))}
    </div>
  );
}
