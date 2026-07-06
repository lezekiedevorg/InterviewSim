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
    "w-full rounded-xl border border-cream/20 bg-night-900 px-3.5 py-3 text-base sm:text-[15px] font-medium text-cream placeholder:text-faint outline-none transition-colors duration-200 hover:border-cream/30 focus:border-amber-400";
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-faint">
        {label}
      </span>
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
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}
