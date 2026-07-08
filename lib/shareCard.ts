// Carte image partageable du score (Canvas 2D, aucune dépendance).
// Format carré 1080×1080, charte « Studio nuit » — voir maquette « InterviewSim B - Partage score ».

import { scoreColor, BAND_HEX, verdict } from "./scoreColor";

const APP_URL = "interview-sim-red.vercel.app";
const SIZE = 1080;

// Tronque un texte pour tenir sur une ligne du canvas (ellipse si trop long).
function fitOneLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

// Rectangle arrondi avec repli pour les navigateurs sans roundRect.
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  if ("roundRect" in ctx) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    (ctx as CanvasRenderingContext2D).rect(x, y, w, h);
  }
}

// Police display du site (Bricolage via next/font), résolue au moment du rendu.
function headingFamily(): string {
  const fam = getComputedStyle(document.body).getPropertyValue("--font-heading").trim();
  return fam || "sans-serif";
}

// Dessine la carte 1080×1080 et renvoie un PNG. Rejette si le contexte 2D ou toBlob échoue.
export function renderScoreCard(input: { poste: string; score: number }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas 2d indisponible"));

  const hex = BAND_HEX[scoreColor(input.score)];
  const heading = headingFamily();

  // Fond nuit + halo ambre qui tombe du haut
  ctx.fillStyle = "#0c1517";
  ctx.fillRect(0, 0, SIZE, SIZE);
  const glow = ctx.createRadialGradient(SIZE / 2, -SIZE * 0.15, 0, SIZE / 2, -SIZE * 0.15, SIZE * 0.85);
  glow.addColorStop(0, "rgba(255,178,36,0.16)");
  glow.addColorStop(1, "rgba(255,178,36,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Onde vocale en filigrane, centrée verticalement
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#ffb224";
  const barW = 12;
  const gap = 14;
  const n = 30;
  const total = n * barW + (n - 1) * gap;
  for (let i = 0; i < n; i++) {
    const h = Math.round(20 + 150 * Math.abs(Math.sin(i * 0.5 + 0.6))) * 2;
    const x = (SIZE - total) / 2 + i * (barW + gap);
    rr(ctx, x, SIZE / 2 - h / 2, barW, h, 6);
    ctx.fill();
  }
  ctx.restore();

  // Logo micro + wordmark, centrés en haut
  const logoS = 52;
  ctx.font = `800 34px ${heading}`;
  const wordW = ctx.measureText("InterviewSim").width;
  const headerW = logoS + 14 + wordW;
  const logoX = (SIZE - headerW) / 2;
  const logoY = 64;
  ctx.fillStyle = "#ffb224";
  rr(ctx, logoX, logoY, logoS, logoS, 16);
  ctx.fill();
  // micro : capsule + arc + pied (échelle 52/30 depuis le SVG du logo)
  const k = logoS / 30;
  ctx.fillStyle = "#14100a";
  rr(ctx, logoX + 12 * k, logoY + 6 * k, 6 * k, 11 * k, 3 * k);
  ctx.fill();
  ctx.strokeStyle = "#14100a";
  ctx.lineWidth = 2 * k;
  ctx.beginPath();
  ctx.arc(logoX + 15 * k, logoY + 14 * k, 6 * k, 0, Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(logoX + 15 * k, logoY + 20 * k);
  ctx.lineTo(logoX + 15 * k, logoY + 24 * k);
  ctx.stroke();
  // wordmark bicolore
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const wordX = logoX + logoS + 14;
  const wordY = logoY + logoS / 2;
  ctx.fillStyle = "#f2efe4";
  ctx.fillText("Interview", wordX, wordY);
  ctx.fillStyle = "#ffb224";
  ctx.fillText("Sim", wordX + ctx.measureText("Interview").width, wordY);

  // Jauge circulaire
  const cx = SIZE / 2;
  const cy = 470;
  const r = 189;
  ctx.lineWidth = 24;
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(242,239,228,0.1)";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = hex;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (input.score / 100) * Math.PI * 2);
  ctx.stroke();

  // Score + libellé dans la jauge
  ctx.textAlign = "center";
  ctx.fillStyle = hex;
  ctx.font = `800 128px ${heading}`;
  ctx.fillText(`${input.score}`, cx, cy - 14);
  ctx.fillStyle = "#7d908f";
  ctx.font = "700 22px sans-serif";
  ctx.fillText("C O N F I A N C E  /  1 0 0", cx, cy + 66);

  // Verdict + contexte
  ctx.fillStyle = "#f2efe4";
  ctx.font = `800 56px ${heading}`;
  ctx.fillText(verdict(input.score), cx, 748);
  ctx.fillStyle = "#aebcbb";
  ctx.font = "600 28px sans-serif";
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  ctx.fillText(fitOneLine(ctx, `Entretien « ${input.poste} » · ${date}`, SIZE - 140), cx, 806);

  // Badge pilule
  const badge = "GRATUIT  ·  ILLIMITÉ  ·  SANS JUGEMENT";
  ctx.font = "700 21px sans-serif";
  const badgeW = ctx.measureText(badge).width + 56;
  ctx.fillStyle = "rgba(255,178,36,0.08)";
  rr(ctx, cx - badgeW / 2, 912, badgeW, 56, 28);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,178,36,0.45)";
  ctx.lineWidth = 2;
  rr(ctx, cx - badgeW / 2, 912, badgeW, 56, 28);
  ctx.stroke();
  ctx.fillStyle = "#ffcf6e";
  ctx.fillText(badge, cx, 940);

  // Appel à l'action
  ctx.font = "600 26px sans-serif";
  const cta = "Entraîne-toi aussi →  ";
  const ctaW = ctx.measureText(cta).width + ctx.measureText(APP_URL).width;
  ctx.textAlign = "left";
  ctx.fillStyle = "#7d908f";
  ctx.fillText(cta, cx - ctaW / 2, 1022);
  ctx.fillStyle = "#f2efe4";
  ctx.fillText(APP_URL, cx - ctaW / 2 + ctx.measureText(cta).width, 1022);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob null"))), "image/png");
  });
}

// Partage natif (WhatsApp…) avec repli téléchargement. Annulation utilisateur = silencieuse.
export async function shareScoreCard(blob: Blob): Promise<void> {
  const file = new File([blob], "interviewsim-score.png", { type: "image/png" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({
        files: [file],
        title: "Mon score InterviewSim",
        text: "J'ai passé un entretien blanc sur InterviewSim 💪",
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") return; // annulation = pas une erreur
      throw e;
    }
    return;
  }
  // Repli : téléchargement du PNG.
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "interviewsim-score.png";
  a.click();
  // Révocation différée : révoquer dans le même tick que click() rate le téléchargement sur Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
