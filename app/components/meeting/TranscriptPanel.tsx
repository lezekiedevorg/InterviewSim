import type { ChatMessage } from "@/lib/types";

export function TranscriptPanel({ history }: { history: ChatMessage[] }) {
  return (
    <div className="flex max-h-[40vh] flex-col gap-2 overflow-y-auto rounded-2xl border border-white/70 bg-white/80 p-4 shadow-card ring-1 ring-brand-600/5 backdrop-blur-xl animate-rise">
      {history.length === 0 && (
        <p className="text-sm text-slate-400">La transcription apparaîtra ici…</p>
      )}
      {history.map((m, i) => (
        <div
          key={i}
          className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm animate-rise ${
            m.role === "recruiter"
              ? "self-start bg-slate-100 text-slate-800"
              : "self-end bg-brand-600 text-white"
          }`}
        >
          <strong className="mb-0.5 block text-xs font-semibold uppercase tracking-wide opacity-70">
            {m.role === "recruiter" ? "Recruteur" : "Toi"}
          </strong>
          {m.text}
        </div>
      ))}
    </div>
  );
}
