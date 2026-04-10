import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        paper: "#ffffff",
        blush: "#ff4e6b",
        pulse: "#ff0436",
        mist: "#fff3f6",
        graphite: "#111111",
        ash: "#6a6a6a"
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"]
      },
      boxShadow: {
        pulse: "0 25px 90px rgba(255, 4, 54, 0.18)"
      },
      backgroundImage: {
        "hero-bloom":
          "radial-gradient(circle at top left, rgba(255, 78, 107, 0.22), transparent 36%), radial-gradient(circle at bottom right, rgba(255, 4, 54, 0.18), transparent 40%)",
        "accent-sweep": "linear-gradient(135deg, #ff4e6b 0%, #ff0436 100%)"
      }
    }
  },
  plugins: []
};

export default config;

