// Carte image partageable du score d'un entretien (Canvas 2D, aucune dépendance).

const APP_URL = "interview-sim-red.vercel.app";
const SIZE = 1080;

// Phrase d'encouragement selon la tranche de score. Fonction pure (testée).
export function encouragement(score: number): string {
  if (score >= 80) return "Excellent, continue !";
  if (score >= 60) return "Bien joué 👏";
  if (score >= 40) return "En bonne voie 🚀";
  return "Chaque essai compte 💪";
}

// Tronque un texte pour tenir sur une ligne du canvas (ellipse si trop long).
function fitOneLine(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxWidth) t = t.slice(0, -1);
  return t + "…";
}

// Dessine la carte 1080x1080 et renvoie un PNG. Rejette si le contexte 2D ou toBlob échoue.
export function renderScoreCard(input: { poste: string; score: number }): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("canvas 2d indisponible"));

  // Fond dégradé émeraude (charte brand).
  const grad = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  grad.addColorStop(0, "#065f46"); // emerald-800
  grad.addColorStop(1, "#059669"); // emerald-600
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.textAlign = "center";

  // Label
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = "600 48px sans-serif";
  ctx.fillText("Score de confiance", SIZE / 2, 360);

  // Score géant
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 300px sans-serif";
  ctx.fillText(`${input.score}`, SIZE / 2, 620);
  ctx.font = "700 72px sans-serif";
  ctx.fillText("/ 100", SIZE / 2, 700);

  // Poste (une ligne, tronqué)
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = "600 52px sans-serif";
  ctx.fillText(fitOneLine(ctx, input.poste, SIZE - 160), SIZE / 2, 800);

  // Encouragement
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "500 44px sans-serif";
  ctx.fillText(encouragement(input.score), SIZE / 2, 880);

  // Wordmark + CTA
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 56px sans-serif";
  ctx.fillText("InterviewSim", SIZE / 2, 980);
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "500 36px sans-serif";
  ctx.fillText(`Entraîne-toi gratuitement · ${APP_URL}`, SIZE / 2, 1030);

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
  URL.revokeObjectURL(url);
}
