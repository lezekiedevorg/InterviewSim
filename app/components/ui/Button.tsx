import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
};

const styles: Record<string, string> = {
  primary:
    "bg-brand-600 text-white shadow-brand hover:bg-brand-700 hover:-translate-y-0.5 active:translate-y-0 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:translate-y-0",
  secondary:
    "bg-white text-brand-700 border border-brand-600/70 hover:bg-brand-50 hover:border-brand-600 disabled:opacity-50",
  ghost: "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100",
};

const sizes: Record<string, string> = {
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
