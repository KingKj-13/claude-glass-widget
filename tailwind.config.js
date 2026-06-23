/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Claude brand terracotta / coral accent.
        claude: {
          50: "#fdf3ef",
          100: "#fbe4da",
          200: "#f6c5b1",
          300: "#f0a085",
          400: "#e87f5d",
          500: "#d97757", // primary brand accent
          600: "#c75f3f",
          700: "#a64a31",
          800: "#7e3a28",
          900: "#5c2c20",
        },
        // Neutral glass surface tones.
        glass: {
          line: "rgba(255,255,255,0.15)",
          fill: "rgba(255,255,255,0.08)",
          hi: "rgba(255,255,255,0.22)",
        },
        status: {
          healthy: "#4ade80",
          warn: "#fbbf24",
          danger: "#f87171",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "SF Pro Display",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "SF Mono",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      borderRadius: {
        glass: "32px",
        card: "22px",
        pill: "999px",
      },
      boxShadow: {
        glass: "0 20px 80px rgba(0,0,0,0.35)",
        "glass-sm": "0 8px 32px rgba(0,0,0,0.28)",
        "inner-hi": "inset 0 1px 0 0 rgba(255,255,255,0.18)",
        glow: "0 0 24px rgba(217,119,87,0.35)",
      },
      backdropBlur: {
        glass: "30px",
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(200%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        "float-in": {
          "0%": { opacity: "0", transform: "translateY(8px) scale(0.98)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        shimmer: "shimmer 2.4s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "float-in": "float-in 0.4s cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
};
