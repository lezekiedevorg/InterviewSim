export type Template = {
  id: string;
  emoji: string;
  titre: string;
  sousTitre: string;
  context: {
    poste: string;
    domaine?: string;
    niveau?: string;
    langue?: string;
  };
};

export const TEMPLATES: Template[] = [
  {
    id: "stage-marketing",
    emoji: "🎓",
    titre: "Stage marketing",
    sousTitre: "Débutant · sans expérience requise",
    context: { poste: "Stagiaire marketing", domaine: "Marketing digital", niveau: "Débutant", langue: "français" },
  },
  {
    id: "premier-emploi-dev",
    emoji: "💻",
    titre: "Premier emploi — Dev junior",
    sousTitre: "Débutant · première embauche",
    context: { poste: "Développeur junior", domaine: "Développement web", niveau: "Débutant", langue: "français" },
  },
  {
    id: "job-etudiant-vente",
    emoji: "🛍️",
    titre: "Job étudiant — Vente",
    sousTitre: "Débutant · temps partiel",
    context: { poste: "Vendeur en boutique", domaine: "Commerce / retail", niveau: "Débutant", langue: "français" },
  },
  {
    id: "relation-client",
    emoji: "📞",
    titre: "Relation client",
    sousTitre: "Débutant · centre d'appel",
    context: { poste: "Téléconseiller", domaine: "Relation client", niveau: "Débutant", langue: "français" },
  },
  {
    id: "stage-administratif",
    emoji: "📊",
    titre: "Stage administratif",
    sousTitre: "Débutant · assistanat",
    context: { poste: "Assistant administratif", domaine: "Administration", niveau: "Débutant", langue: "français" },
  },
  {
    id: "stage-banque",
    emoji: "🏦",
    titre: "Stage banque / finance",
    sousTitre: "Débutant · secteur bancaire",
    context: { poste: "Stagiaire en banque", domaine: "Banque / finance", niveau: "Débutant", langue: "français" },
  },
  {
    id: "job-etudiant-restauration",
    emoji: "🍽️",
    titre: "Job étudiant — Restauration",
    sousTitre: "Débutant · service",
    context: { poste: "Serveur", domaine: "Restauration", niveau: "Débutant", langue: "français" },
  },
  {
    id: "animateur",
    emoji: "🧑‍🏫",
    titre: "Animateur / encadrant",
    sousTitre: "Débutant · jeunesse",
    context: { poste: "Animateur", domaine: "Animation / éducation", niveau: "Débutant", langue: "français" },
  },
];
