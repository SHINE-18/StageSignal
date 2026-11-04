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
          bg: "#FAF8F5",
          surface: "#FFFFFF",
          card: "#FFFFFF",
          border: "#E7E2D9",
          crimson: "#DC143C",
          flame: "#EA580C",
          amber: "#F59E0B",
          green: "#16A34A",
          red: "#DC2626",
          text: "#1C1917",
          muted: "#78716C",
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
