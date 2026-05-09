/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        border: "hsl(var(--border))",
        // ... add the rest of your colors here matching the CSS variables
      },
      fontFamily: {
        sans: ["var(--app-font-sans)"],
        display: ["var(--app-font-display)"],
        mono: ["var(--app-font-mono)"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
