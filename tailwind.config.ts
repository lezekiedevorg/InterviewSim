import type { Config } from "tailwindcss";

/* ═══════════════════════════════════════════════════════════════════════════
   Direction « Studio » — crème et terracotta le jour, brun chaud la nuit.

   Les couleurs pointent vers des variables CSS (voir app/globals.css), donc
   elles suivent le thème automatiquement.

   Les NOMS existants (`night`, `cream`, `amber`, `muted`, `faint`) sont
   conservés et remappés sur les nouveaux tokens. C'est délibéré : les écrans
   déjà écrits (outil, entraînement, progression, login, reset) adoptent la
   nouvelle palette sans être réécrits, et `bg-night-900/85` continue de
   fonctionner parce que les tokens exposent un triplet de canaux.

   `rgb(var(--x-rgb) / <alpha-value>)` est la seule forme qui autorise les
   modificateurs d'opacité de Tailwind 3 sur une couleur variable.
   ═══════════════════════════════════════════════════════════════════════════ */

const token = (name: string) => `rgb(var(--${name}-rgb) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── Noms sémantiques (à préférer dans le nouveau code) ── */
        bg:        token("bg"),
        "bg-alt":  token("bg-alt"),
        surface:   token("surface"),
        "surface-2": token("surface-2"),
        ink:       token("ink"),
        "ink-muted": token("ink-muted"),
        "ink-faint": token("ink-faint"),
        border:    token("border"),
        "border-strong": token("border-strong"),
        accent:    token("accent"),
        "accent-ink": token("accent-ink"),

        /* ── Noms hérités, remappés (compatibilité des écrans existants) ── */
        night: {
          900: token("bg"),        // fond de page + inputs
          800: token("surface"),   // cartes
          700: token("surface-2"), // tuiles, pilules
          600: token("surface-2"), // haut des dégradés de tuile
        },
        cream: token("ink"),       // texte principal
        muted: token("ink-muted"), // texte secondaire
        faint: token("ink-faint"), // libellés, mentions

        amber: {
          300: token("warn"),
          400: token("accent"),      // accent principal
          ink: token("accent-ink"),  // texte posé sur l'accent
        },

        danger: {
          400: token("danger"),
          600: token("danger"),
        },
        ok: token("ok"),

        /* Palette d'appoint, disponible mais à utiliser avec parcimonie. */
        brand: {
          soft: token("accent"),
          deep: token("accent"),
        },
      },

      borderColor: {
        DEFAULT: token("border"),
      },

      boxShadow: {
        /* Les ombres suivent le thème : chaudes et diffuses le jour,
           profondes la nuit. */
        card: "var(--shadow-md)",
        soft: "var(--shadow-sm)",
        lift: "var(--shadow-lg)",
        cta: "0 6px 24px rgb(var(--accent-rgb) / 0.28)",
        "cta-hover": "0 10px 30px rgb(var(--accent-rgb) / 0.4)",
      },

      fontFamily: {
        heading: ["var(--font-heading)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },

      borderRadius: {
        card: "20px",
        tile: "16px",
        field: "12px",
        pill: "999px",
      },

      maxWidth: {
        shell: "1120px",
      },

      transitionTimingFunction: {
        studio: "cubic-bezier(.4, 0, .2, 1)",
      },

      transitionDuration: {
        studio: "240ms",
      },

      keyframes: {
        rise: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
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
        /* Pastille « en direct » */
        live: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: ".45", transform: "scale(.82)" },
        },
        /* Barres de l'onde vocale */
        voice: {
          "0%, 100%": { height: "5px" },
          "50%": { height: "20px" },
        },
      },

      animation: {
        rise: "rise .6s cubic-bezier(.2,.7,.3,1) both",
        "fade-up": "fadeUp .7s cubic-bezier(.4,0,.2,1) both",
        wave: "wave .7s ease-in-out infinite alternate",
        ring: "ring 1.8s ease-out infinite",
        blink: "blink 1.6s ease-in-out infinite",
        live: "live 2s ease-in-out infinite",
        voice: "voice .9s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
