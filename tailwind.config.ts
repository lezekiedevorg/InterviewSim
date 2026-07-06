import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        accent: {
          // turquoise compagnon du dégradé émeraude→turquoise
          300: "#5eead4",
          400: "#2dd4bf",
          500: "#14b8a6",
          600: "#0d9488",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.04), 0 8px 24px -12px rgba(6,95,70,.18)",
        brand: "0 8px 20px -8px rgba(5,150,105,.55)",
        glow: "0 0 0 1px rgba(16,185,129,.12), 0 12px 40px -12px rgba(5,150,105,.45)",
        card: "0 1px 2px rgba(15,23,42,.04), 0 16px 40px -20px rgba(5,150,105,.25)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        drift: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(4rem, -3rem) scale(1.15)" },
        },
        "drift-2": {
          "0%, 100%": { transform: "translate(0, 0) scale(1.1)" },
          "50%": { transform: "translate(-3rem, 4rem) scale(1)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: ".45" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
      },
      animation: {
        rise: "rise .45s cubic-bezier(.16,1,.3,1) both",
        "scale-in": "scale-in .35s cubic-bezier(.16,1,.3,1) both",
        drift: "drift 16s ease-in-out infinite",
        "drift-2": "drift-2 20s ease-in-out infinite",
        "pulse-ring": "pulse-ring 1.6s cubic-bezier(0,0,.2,1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
