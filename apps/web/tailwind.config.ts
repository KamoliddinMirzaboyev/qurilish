import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          dark: "#0F172A",
          primary: "#075985",
          primaryHover: "#0C4A6E",
          teal: "#0F766E",
          amber: "#D97706",
        },
        gov: {
          navy: "#071A33",
          navyDeep: "#04101F",
          gold: "#C9A227",
          goldHover: "#B8961F",
          flagBlue: "#1EB5E6",
          flagGreen: "#1EB53A",
          flagRed: "#CE1126",
        },
        surface: {
          page: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
        },
        ink: {
          DEFAULT: "#0F172A",
          muted: "#475569",
        },
        danger: "#DC2626",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["\"Source Serif 4\"", "Times New Roman", "Times", "serif"],
      },
      borderRadius: {
        card: "10px",
      },
      maxWidth: {
        content: "1280px",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
