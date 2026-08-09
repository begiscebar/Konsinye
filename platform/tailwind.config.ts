import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0f1a",
          900: "#0f1729",
          800: "#16213a",
          700: "#1f2c4a",
        },
        brand: {
          50: "#eef6ff",
          100: "#d9ebff",
          400: "#4d8dfc",
          500: "#2569ea",
          600: "#1a52c4",
          700: "#173f97",
        },
        accent: {
          500: "#f59e0b",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
