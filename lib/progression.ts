import type { Debrief } from "./types";

export type SavedSession = {
  id: string;
  created_at: string;
  poste: string;
  context: Record<string, unknown>;
  debrief: Debrief;
  score_confiance: number;
};

export function sortByDateDesc(sessions: SavedSession[]): SavedSession[] {
  return [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function withDeltas(
  sessionsDescendants: SavedSession[],
): Array<SavedSession & { delta: number | null }> {
  return sessionsDescendants.map((session, i) => {
    const previous = sessionsDescendants[i + 1]; // la suivante dans l'ordre décroissant = plus ancienne
    return {
      ...session,
      delta: previous ? session.score_confiance - previous.score_confiance : null,
    };
  });
}

export function sparklinePoints(
  scoresChronologiques: number[],
  width: number,
  height: number,
): string {
  const n = scoresChronologiques.length;
  if (n === 0) return "";
  return scoresChronologiques
    .map((score, i) => {
      const x = n === 1 ? 0 : (i / (n - 1)) * width;
      const y = height - (score / 100) * height;
      return `${round(x)},${round(y)}`;
    })
    .join(" ");
}

function round(v: number): number {
  return Math.round(v * 100) / 100;
}
