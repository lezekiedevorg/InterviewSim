export type DrillReport = {
  score: number; // 0-100, maîtrise du thème sur ce drill
  pointsForts: string[];
  aTravailler: string[];
  meilleureReponse: { question: string; avant: string; apres: string } | null;
};
