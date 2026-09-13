import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  GARDE-FOU DU SYSTÈME DE COULEURS
 * ─────────────────────────────────────────────────────────────────────────────
 *  Le risque d'une refonte à deux thèmes n'est pas le thème clair — c'est le
 *  thème sombre qu'on oublie de compléter. Un token défini dans `:root` mais
 *  absent de `.dark` ne provoque aucune erreur : la valeur claire reste
 *  appliquée sur fond sombre, et on obtient du texte crème sur crème.
 *
 *  Ces vérifications attrapent trois familles de fautes :
 *  1. un token manquant dans un des deux thèmes ;
 *  2. un triplet `-rgb` absent, ce qui casse silencieusement les modificateurs
 *     d'opacité de Tailwind (`bg-night-900/85` devient transparent) ;
 *  3. un nom hérité encore référencé par un écran mais retiré de la config.
 */

const css = readFileSync(resolve(__dirname, "../app/globals.css"), "utf8");
const tw = readFileSync(resolve(__dirname, "../tailwind.config.ts"), "utf8");

/** Extrait le bloc d'un sélecteur et renvoie les noms de variables déclarées. */
function tokensIn(selector: string): Set<string> {
  // `:root` puis le bloc `.dark` — on cible le sélecteur en début de ligne.
  const re = new RegExp(`(?:^|\\n)${selector.replace(".", "\\.")}\\s*\\{([\\s\\S]*?)\\n\\}`, "m");
  const block = css.match(re)?.[1];
  if (!block) throw new Error(`Bloc CSS introuvable pour « ${selector} »`);
  const names = [...block.matchAll(/--([a-z0-9-]+)\s*:/gi)].map((m) => m[1]);
  return new Set(names);
}

describe("Système de couleurs — cohérence des deux thèmes", () => {
  const light = tokensIn(":root");
  const dark = tokensIn(".dark");

  it("les deux thèmes déclarent les mêmes tokens", () => {
    const manquantsEnSombre = [...light].filter((t) => !dark.has(t));
    const manquantsEnClair = [...dark].filter((t) => !light.has(t));
    expect(manquantsEnSombre, "tokens absents du thème sombre").toEqual([]);
    expect(manquantsEnClair, "tokens absents du thème clair").toEqual([]);
  });

  it("chaque couleur expose un triplet de canaux pour les opacités Tailwind", () => {
    // Les triplets sont la seule forme qui autorise `/<alpha>` sur une variable.
    // Sans eux, `bg-night-900/85` rend une couleur transparente, sans erreur.
    const couleurs = [...light].filter((t) => !t.endsWith("-rgb") && t !== "grain");
    const sansTriplet = couleurs.filter((t) => !light.has(`${t}-rgb`));
    // `--accent-soft`, `--ok-soft` et les ombres sont des rgba complètes :
    // elles n'ont pas besoin de triplet.
    const exemptees = ["accent-soft", "ok-soft", "shadow-sm", "shadow-md", "shadow-lg"];
    expect(sansTriplet.filter((t) => !exemptees.includes(t))).toEqual([]);
  });

  it("les triplets sont bien trois nombres, pas une couleur hexadécimale", () => {
    for (const name of [...light].filter((t) => t.endsWith("-rgb"))) {
      const value = css.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1]?.trim() ?? "";
      expect(value, `--${name} doit être un triplet de canaux`).toMatch(
        /^\d{1,3}\s+\d{1,3}\s+\d{1,3}$/
      );
    }
  });
});

describe("Tailwind — les noms hérités restent remappés", () => {
  // Des écrans déjà écrits utilisent ces noms. S'ils disparaissent de la
  // configuration, ils tombent en couleur par défaut SANS erreur de build :
  // la page reste fonctionnelle mais perd son thème.
  const herites = ["night", "cream", "muted", "faint", "amber", "danger", "ok"];
  for (const nom of herites) {
    it(`« ${nom} » pointe vers un token CSS`, () => {
      const re = new RegExp(`\\b${nom}\\s*:\\s*(\\{|token\\()`);
      expect(tw, `« ${nom} » absent de tailwind.config.ts`).toMatch(re);
    });
  }

  it("le mode sombre est piloté par une classe, pas par la préférence système", () => {
    // Le choix explicite de l'utilisateur doit gagner sur la préférence système.
    expect(tw).toMatch(/darkMode:\s*"class"/);
  });
});
