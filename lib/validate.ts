import type { InterviewContext } from "./types";

export function validateContext(ctx: Partial<InterviewContext>): string[] {
  const errors: string[] = [];
  if (!ctx.poste || ctx.poste.trim() === "") {
    errors.push("Le poste visé est obligatoire.");
  }
  if (!ctx.cv || ctx.cv.trim() === "") {
    errors.push("Le CV est obligatoire.");
  }
  return errors;
}
