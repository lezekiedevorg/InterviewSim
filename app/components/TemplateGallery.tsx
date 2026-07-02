import type { Template } from "@/lib/templates";
import { TEMPLATES } from "@/lib/templates";

export function TemplateGallery({
  onPick,
  selectedId,
}: {
  onPick: (t: Template) => void;
  selectedId?: string | null;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-3 text-center text-sm font-medium text-slate-500">
        Pas d&apos;idée ? Pars d&apos;un scénario
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onPick(t)}
            className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft ${
              selectedId === t.id
                ? "border-brand-600 bg-brand-50 ring-2 ring-brand-100"
                : "border-slate-200 bg-white"
            }`}
          >
            <span className="text-xl" aria-hidden>{t.emoji}</span>
            <span className="text-sm font-semibold text-slate-900">{t.titre}</span>
            <span className="text-xs text-slate-500">{t.sousTitre}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
