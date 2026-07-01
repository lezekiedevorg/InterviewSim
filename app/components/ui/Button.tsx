import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

const styles: Record<string, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-slate-300 disabled:text-slate-500",
  secondary:
    "bg-white text-brand-700 border border-brand-600 hover:bg-brand-50 disabled:opacity-50",
  ghost: "bg-transparent text-slate-600 hover:text-slate-900",
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  return (
    <button
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
