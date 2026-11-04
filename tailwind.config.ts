import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#0C0D0E",
          surface: "#14100D",
          card: "#1E1815",
          border: "rgba(249, 115, 22, 0.12)",
          crimson: "#DC143C",
          flame: "#F97316",
          amber: "#FFA726",
          green: "#22C55E",
          red: "#EF4444",
          text: "#F8FAFC",
          muted: "#A8A29E",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      screens: {
        xs: "360px",
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
  },
  plugins: [],
};

export default config;
