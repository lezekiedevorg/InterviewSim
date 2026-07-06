export type InterviewContext = {
  poste: string;
  entreprise?: string;
  domaine?: string;
  niveau?: string;
  langue?: string;
  cv: string;
  offre?: string;
};

export type ChatMessage = {
  role: "recruiter" | "candidate";
  text: string;
};

export type CritereId = "structure" | "concret" | "adequation" | "communication" | "pression";

export type CritereNote = {
  id: CritereId;
  note: number; // 0-100, déjà bornée et plafonnée par lib/score.ts
  preuve: string; // citation exacte du candidat ("" si aucune)
  commentaire: string; // 1 phrase de justification
};

export type Debrief = {
  pointsForts: string[];
  pointsATravailler: string[];
  reformulations: string[];
  scoreConfiance: number;
  syntheseGenerale: string;
  criteres?: CritereNote[]; // absent sur les débriefs enregistrés avant la grille
};

export type CrossAnalysis = {
  pointsRecurrents: string[];
  planAction: string[];
};

export type SessionSummary = {
  poste: string;
  pointsATravailler: string[];
  syntheseGenerale: string;
};
