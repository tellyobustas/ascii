import type { Config } from "tailwindcss";
import forms from "@tailwindcss/forms";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./bot/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ascii: {
          black: "#020403",
          green: "#00ff66",
          muted: "#0a5f31",
          white: "#f2f2f2",
        },
      },
      fontFamily: {
        mono: [
          "var(--font-geist-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      boxShadow: {
        terminal: "0 0 24px rgba(0, 255, 102, 0.16)",
      },
    },
  },
  plugins: [forms],
};

export default config;
