/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
      },
      colors: {
        cream: {
          50: "#fffdf8",
          100: "#faf6ef",
          200: "#f3eadc",
          300: "#e8dcc8",
        },
        ink: {
          DEFAULT: "#1c1917",
          soft: "#292524",
          muted: "#57534e",
        },
        sage: {
          DEFAULT: "#4f6f5e",
          light: "#e4ede6",
          deep: "#3d5648",
        },
        honey: {
          DEFAULT: "#d4a24a",
          light: "#f0d78c",
          deep: "#b8892a",
        },
        clay: {
          DEFAULT: "#c67b5c",
          light: "#edd5cb",
        },
        brand: {
          DEFAULT: "#4f6f5e",
          soft: "#e4ede6",
          deep: "#3d5648",
        },
        surface: {
          page: "#faf6ef",
          card: "#ffffff",
          muted: "#f7f4ee",
          glass: "rgba(255, 255, 255, 0.72)",
        },
      },
      boxShadow: {
        soft: "0 4px 24px rgba(28, 25, 23, 0.06), 0 1px 3px rgba(28, 25, 23, 0.04)",
        lift: "0 16px 48px rgba(28, 25, 23, 0.1), 0 6px 16px rgba(28, 25, 23, 0.06)",
        bento: "0 8px 32px rgba(28, 25, 23, 0.07), 0 2px 8px rgba(28, 25, 23, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.85)",
        innerGlow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
      },
      borderRadius: {
        card: "1.35rem",
        "card-lg": "1.75rem",
        bento: "1.5rem",
      },
      backgroundImage: {
        "bento-page":
          "radial-gradient(ellipse 100% 80% at 10% -20%, rgba(240, 215, 140, 0.22) 0%, transparent 55%), radial-gradient(ellipse 80% 60% at 100% 0%, rgba(228, 237, 230, 0.55) 0%, transparent 45%), linear-gradient(168deg, #faf6ef 0%, #fffdf8 40%, #f3eadc 100%)",
      },
    },
  },
  plugins: [],
};
