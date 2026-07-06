type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  rows?: number;
  placeholder?: string;
  hint?: string;
};

export function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  rows = 4,
  placeholder,
  hint,
}: Props) {
  const shared =
    "w-full rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all duration-200 hover:border-slate-300 focus:border-brand-500 focus:ring-4 focus:ring-brand-100";
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {textarea ? (
        <textarea
          className={`${shared} resize-y`}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={shared}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>}
    </label>
  );
}
