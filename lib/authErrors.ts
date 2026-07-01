export function authErrorMessage(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email ou mot de passe incorrect.";
  if (m.includes("already registered")) return "Cet email est déjà utilisé.";
  if (m.includes("email not confirmed"))
    return "Confirme ton email avant de te connecter (vérifie ta boîte mail).";
  if (m.includes("password") && m.includes("at least"))
    return "Le mot de passe est trop court (au moins 6 caractères).";
  return "Une erreur est survenue. Réessaie.";
}
