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
          // indigo — sérieux, confiance
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81",
          950: "#1e1b4b",
        },
        accent: {
          // corail vif — énergie, boutons d'action
          300: "#ffb4ab",
          400: "#ff8f83",
          500: "#ff6b5e",
          600: "#ef4f42",
        },
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,.04), 0 8px 24px -12px rgba(49,46,129,.18)",
        brand: "0 8px 20px -8px rgba(79,70,229,.50)",
        cta: "0 8px 20px -8px rgba(255,107,94,.60)",
        glow: "0 0 0 1px rgba(99,102,241,.12), 0 12px 40px -12px rgba(255,107,94,.40)",
        card: "0 1px 2px rgba(15,23,42,.04), 0 16px 40px -20px rgba(67,56,202,.25)",
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
