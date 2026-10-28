/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      // Peshku i Pitë palette – taken from the logo (teal fish, orange fins,
      // deep-teal lettering on a cream disc) and the blue mosaic wall.
      colors: {
        brand: {
          cream: "#F3EAD8",
          paper: "#FFFDF8",
          sand: "#E9DFC8",
          chip: "#E6DCC5",
          inset: "#F8F1E3",
          line: "#DCD0B5",
          line2: "#D3C6A8",
          hair: "#ECE3CF",
          ink: "#183A3D",
          ink2: "#24504F",
          muted: "#4A6260",
          muted2: "#55696A",
          faint: "#7E8A84",
          orange: "#E9963F",
          "orange-deep": "#A8521A",
          "orange-tint": "#FBE5C8",
          teal: "#2F8C83",
          "teal-deep": "#237A72",
          "teal-tint": "#D8EBE6",
          tile: "#2C5491",
          chart: "#14907F", // teal for data marks – chroma/contrast validated on paper
          amber: "#F2B63C",
          red: "#E0503A",
        },
      },
      fontFamily: {
        display: ["Outfit", "system-ui", "sans-serif"],
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pip-ring": {
          "0%": { transform: "scale(1)", opacity: "0.55" },
          "100%": { transform: "scale(1.35)", opacity: "0" },
        },
        "pip-in": {
          "0%": { transform: "translateY(12px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "pip-fade": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "pip-ring": "pip-ring 2.2s ease-out infinite",
        "pip-in": "pip-in 220ms ease-out",
        "pip-fade": "pip-fade 200ms ease-out",
      },
    },
  },
  plugins: [],
};
