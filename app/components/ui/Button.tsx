import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
};

const styles: Record<string, string> = {
  // pilule ambre, texte sombre, typo display — le CTA « Studio nuit »
  primary:
    "rounded-full bg-amber-400 font-heading font-extrabold text-amber-ink shadow-cta hover:shadow-cta-hover hover:-translate-y-0.5 active:translate-y-0 disabled:bg-night-700 disabled:text-faint disabled:shadow-none disabled:translate-y-0",
  // ambre en creux : bordure + fond teinté
  secondary:
    "rounded-full border border-amber-400/45 bg-amber-400/10 font-semibold text-amber-400 hover:bg-amber-400/20 disabled:opacity-50",
  ghost:
    "rounded-full bg-transparent font-semibold text-muted hover:text-cream hover:bg-cream/10",
};

const sizes: Record<string, string> = {
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base min-h-[54px]",
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: Props) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center gap-2 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-night-900 disabled:cursor-not-allowed ${sizes[size]} ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
