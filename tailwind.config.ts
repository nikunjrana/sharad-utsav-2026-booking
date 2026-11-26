import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primaryDark: "#2C2C2C",
        primary: "#C99B24",
        gold: "#BC9226",
        brightGold: "#D1AC3E",
        cream: "#FDF3E4",
        heading: "#291900",
        primaryText: "#645743",
        success: "#28A736",
        error: "#EF1F1F",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        panel: "0 12px 40px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
