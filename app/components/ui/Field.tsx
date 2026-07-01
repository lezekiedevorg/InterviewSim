type Props = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  textarea?: boolean;
  rows?: number;
  placeholder?: string;
};

export function Field({
  label,
  value,
  onChange,
  type = "text",
  textarea = false,
  rows = 4,
  placeholder,
}: Props) {
  const shared =
    "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100";
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {textarea ? (
        <textarea
          className={shared}
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
    </label>
  );
}
