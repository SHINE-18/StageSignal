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
        arounda: {
          flame: "#FC3B00",
          orange: "#FF6129",
          peach: "#FF7145",
          black: "#000000",
          dark: "#0A0A0B",
          surface: "#121113",
          card: "#161518",
          border: "rgba(255, 255, 255, 0.12)",
          white: "#FFFFFF",
          muted: "#A8A29E",
        },
        brand: {
          bg: "#000000",
          surface: "#0F0E11",
          card: "#141316",
          border: "rgba(255, 255, 255, 0.12)",
          crimson: "#FC3B00",
          flame: "#FC3B00",
          orange: "#FF6129",
          peach: "#FF7145",
          amber: "#F59E0B",
          green: "#22C55E",
          red: "#FC3B00",
          text: "#FFFFFF",
          muted: "#A8A29E",
        },
      },
      fontFamily: {
        sans: [
          '"Helvetica Neue"',
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
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
