import type { Config } from "tailwindcss";

// Direction « Studio nuit » : fond bleu-nuit, crème, ambre chaud.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        night: {
          900: "#0c1517", // fond de page + inputs
          800: "#101c1f", // cartes
          700: "#132124", // tuiles, pilules
          600: "#142326", // haut des dégradés de tuile
        },
        cream: "#f2efe4", // texte principal
        muted: "#aebcbb", // texte secondaire
        faint: "#7d908f", // libellés, mentions
        amber: {
          300: "#ffcf6e",
          400: "#ffb224", // accent principal
          ink: "#14100a", // texte sur ambre
        },
        danger: {
          400: "#ff5a4e",
          600: "#c73e33",
        },
        ok: "#34d27b", // succès / bon score
      },
      boxShadow: {
        card: "0 20px 50px rgba(0,0,0,0.4)",
        cta: "0 6px 24px rgba(255,178,36,0.3)",
        "cta-hover": "0 10px 30px rgba(255,178,36,0.45)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        wave: {
          from: { transform: "scaleY(0.3)" },
          to: { transform: "scaleY(1)" },
        },
        ring: {
          from: { transform: "scale(1)", opacity: ".55" },
          to: { transform: "scale(1.9)", opacity: "0" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".25" },
        },
      },
      animation: {
        rise: "rise .6s cubic-bezier(.2,.7,.3,1) both",
        wave: "wave .7s ease-in-out infinite alternate",
        ring: "ring 1.8s ease-out infinite",
        blink: "blink 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
