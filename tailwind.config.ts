import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Centro Dental color palette
        primary: {
          DEFAULT: "#1E40AF",
          dark: "#1E3A8A",
          light: "#3B82F6",
        },
        centro: {
          green: "#22C55E",
          blue: "#1E40AF",
          lightBlue: "#3B82F6",
        },
        background: {
          DEFAULT: "#FFFFFF",
          secondary: "#F5F5F7",
          tertiary: "#FAFAFA",
        },
        text: {
          DEFAULT: "#1D1D1F",
          secondary: "#86868B",
          tertiary: "#6E6E73",
        },
        border: {
          DEFAULT: "#D2D2D7",
          light: "#E5E5EA",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "SF Pro Display",
          "SF Pro Text",
          "Helvetica Neue",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      borderRadius: {
        apple: "12px",
        "apple-lg": "18px",
      },
      boxShadow: {
        apple: "0 4px 20px rgba(0, 0, 0, 0.08)",
        "apple-lg": "0 8px 30px rgba(0, 0, 0, 0.12)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.5s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;

