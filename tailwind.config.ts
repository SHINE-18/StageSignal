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
        studio: {
          base: "#0f0f10",
          bg: "#141415",
          card: "#19191b",
          raised: "#232325",
          hairline: "rgba(237, 237, 237, 0.08)",
          text: "#ededed",
          secondary: "#a1a1a6",
          muted: "#85858b",
          accent: "#fc3b00",
          orange: "#ff6129",
          positive: "#4cc38a",
          negative: "#e5484d",
          amber: "#f59e0b",
        },
        arounda: {
          flame: "#fc3b00",
          orange: "#ff6129",
          peach: "#ff7145",
          black: "#000000",
          dark: "#050505",
          surface: "rgba(18, 17, 19, 0.7)",
          card: "rgba(18, 17, 19, 0.7)",
          border: "rgba(255, 255, 255, 0.12)",
          white: "#ffffff",
          muted: "#a8a29e",
        },
        brand: {
          bg: "#000000",
          surface: "#0a0a0b",
          card: "rgba(18, 17, 19, 0.7)",
          border: "rgba(255, 255, 255, 0.12)",
          crimson: "#fc3b00",
          flame: "#fc3b00",
          orange: "#ff6129",
          peach: "#ff7145",
          amber: "#f59e0b",
          green: "#4cc38a",
          red: "#fc3b00",
          text: "#ffffff",
          muted: "#a8a29e",
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
