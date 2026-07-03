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

export type Debrief = {
  pointsForts: string[];
  pointsATravailler: string[];
  reformulations: string[];
  scoreConfiance: number;
  syntheseGenerale: string;
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
