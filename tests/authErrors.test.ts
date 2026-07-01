import { describe, it, expect } from "vitest";
import { authErrorMessage } from "../lib/authErrors";

describe("authErrorMessage", () => {
  it("identifiants invalides", () => {
    expect(authErrorMessage("Invalid login credentials")).toBe(
      "Email ou mot de passe incorrect.",
    );
  });
  it("email déjà utilisé", () => {
    expect(authErrorMessage("User already registered")).toBe(
      "Cet email est déjà utilisé.",
    );
  });
  it("email non confirmé", () => {
    expect(authErrorMessage("Email not confirmed")).toBe(
      "Confirme ton email avant de te connecter (vérifie ta boîte mail).",
    );
  });
  it("message inconnu -> générique", () => {
    expect(authErrorMessage("some random error")).toBe(
      "Une erreur est survenue. Réessaie.",
    );
  });
});
