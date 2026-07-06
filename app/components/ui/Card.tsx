import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-2xl border border-white/70 bg-white/80 p-5 shadow-card ring-1 ring-brand-600/5 backdrop-blur-xl ${className}`}
      {...props}
    />
  );
}
