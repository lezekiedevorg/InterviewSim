import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[20px] border border-cream/15 bg-night-800 p-5 shadow-card ${className}`}
      {...props}
    />
  );
}
