import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        dashboard: {
          bg: "#F6F8FB",
          surface: "#FFFFFF",
          border: "#E2E8F0",
          text: "#0F172A",
          muted: "#64748B",
          primary: "#2563EB",
          navy: "#1E3A8A",
          online: "#16A34A",
          offline: "#DC2626",
          warning: "#D97706",
          critical: "#BE123C",
          capacity: "#4F46E5",
          central: "#0891B2",
          booster: "#0284C7",
          purity: "#0D9488",
          pressure: "#7C3AED",
          utilization: "#EA580C"
        }
      },
      boxShadow: {
        panel: "0 8px 24px rgba(15, 23, 42, 0.06)"
      }
    }
  },
  plugins: [],
};

export default config;
