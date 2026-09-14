import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Garde-fou sur l'identité visuelle.
 *
 * La flèche de boucle a demandé quatre tracés avant d'être lisible : soudée au
 * contour, flottante, ou tournée vers l'intérieur. Ces tests figent ce qui
 * rendait le signe illisible, pour qu'une « simplification » plus tard ne
 * refasse pas silencieusement l'une des trois erreurs.
 */

const root = process.cwd();
const mark = readFileSync(
  join(root, "app/components/brand/SpeechLoopMark.tsx"),
  "utf8",
);
const icon = readFileSync(join(root, "app/icon.svg"), "utf8");
const header = readFileSync(join(root, "app/components/Header.tsx"), "utf8");
const css = readFileSync(join(root, "app/globals.css"), "utf8");

describe("Speech Loop — géométrie", () => {
  it("garde l'arc calculé, pas un cercle complet", () => {
    // large-arc=1 sweep=1 : c'est ce couple qui fait passer l'arc par la
    // gauche et le haut. L'inverser referme la bulle du mauvais côté.
    expect(mark).toContain("A20 20 0 1 1 42.0 12.7");
  });

  it("garde la pointe pleine (fill), jamais deux segments fins", () => {
    // La première version dessinait la flèche au trait : elle disparaissait.
    expect(mark).toContain('d="M37.8 20.0L52.8 18.9L46.2 5.3Z" fill="currentColor"');
  });

  it("garde l'onde à trois barres", () => {
    expect(mark).toContain("M24 26v6M32 20v18M40 25v8");
  });

  it("épaissit le trait quand l'icône rétrécit", () => {
    // Sans cela la boucle et l'onde se referment visuellement sous 24 px.
    expect(mark).toMatch(/size <= 18 \? 8 : size <= 32 \? 7 : 6\.5/);
  });
});

describe("Speech Loop — intégration", () => {
  it("a remplacé l'ancienne icône micro dans l'en-tête", () => {
    expect(header).toContain("SpeechLoopMark");
    expect(header).not.toMatch(/<rect[^>]*rx="9"/); // pastille du micro
  });

  it("porte la classe group, sinon group-hover ne s'applique pas", () => {
    // Bug réel : sans `group` sur le Link, ni l'animation ni la rotation
    // au survol ne se déclenchaient.
    const link = header.match(/<Link href="\/"[^>]*className="([^"]*)"/);
    expect(link?.[1]).toMatch(/(^|\s)group(\s|$)/);
  });

  it("sert une icône autonome, sans dépendre d'un favicon.ico", () => {
    // favicon.ico avait priorité sur icon.svg et servait l'ancienne marque.
    expect(icon).toContain("M25.2 48.8A20 20 0 1 1 42.0 12.7");
    expect(icon).toContain("#C2410C");
  });
});

describe("Speech Loop — animation", () => {
  it("anime un tracé qui se termine, pas une rotation infinie", () => {
    // Une rotation continue se lit comme une attente (spinner).
    expect(css).toContain("@keyframes loop-replay");
    expect(css).not.toMatch(/loop-replay[^}]*infinite/);
  });

  it("aligne le dasharray sur la longueur réelle de l'arc", () => {
    // 2πR × (190/360) avec R=20. Une valeur au jugé laisse un saut visible.
    expect(mark).toContain("66.32");
    expect(css).toContain("stroke-dashoffset: 66.32");
  });

  it("reste couvert par la garde prefers-reduced-motion", () => {
    const guard = css.slice(css.indexOf("prefers-reduced-motion"));
    expect(guard).toContain("animation: none !important");
  });
});
