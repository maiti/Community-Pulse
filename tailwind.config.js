/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#061D35", 800: "#0B2A4A", 700: "#123659" },
        teal: { DEFAULT: "#009C9F", soft: "#E0F4F4" },
        canvas: "#FAFBFD",
        forest: "#00594D",
        coral: "#FF5365",
        electric: "#2379EE",
        lavender: "#7952E8",
        amber: "#F5A623",
        line: "#E5EAF0",
        ink: { DEFAULT: "#061D35", muted: "#56677C", soft: "#8593A5" },
        pastel: {
          mint: "#E3F5EE",
          peach: "#FFEBDD",
          sky: "#E8F1FE",
          blush: "#FFE7EB",
          lilac: "#EFEAFD",
          butter: "#FFF3D9",
          sage: "#E6F0EA",
        },
      },
      fontFamily: {
        sans: ["var(--font-jakarta)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        micro: ["11px", { lineHeight: "14px" }],
        meta: ["12px", { lineHeight: "16px" }],
      },
      borderRadius: {
        12: "12px",
        14: "14px",
        18: "18px",
        20: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(6,29,53,0.04), 0 4px 14px -2px rgba(6,29,53,0.06)",
        lift: "0 2px 4px rgba(6,29,53,0.04), 0 14px 32px -10px rgba(6,29,53,0.22)",
        float: "0 30px 70px -18px rgba(6,29,53,0.42), 0 8px 20px -8px rgba(6,29,53,0.18)",
        search: "0 1px 2px rgba(6,29,53,0.05), 0 6px 18px -8px rgba(6,29,53,0.16)",
      },
      backgroundImage: {
        "topo-teal": "url('/patterns/topo-teal.svg')",
        "topo-navy": "url('/patterns/topo-navy.svg')",
        "sunset-glow": "radial-gradient(120% 120% at 100% 0%, rgba(245,166,35,0.22) 0%, rgba(255,83,101,0.10) 38%, rgba(255,255,255,0) 70%)",
      },
      backgroundSize: {
        topo: "720px 720px",
      },
      keyframes: {
        "overlay-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "overlay-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        "sheet-in": { from: { transform: "translateX(100%)" }, to: { transform: "translateX(0)" } },
        "sheet-out": { from: { transform: "translateX(0)" }, to: { transform: "translateX(100%)" } },
        "dialog-in": {
          from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.96)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "dialog-out": {
          from: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
          to: { opacity: "0", transform: "translate(-50%, -48%) scale(0.96)" },
        },
        "halo-pulse": {
          "0%": { transform: "translate(-50%, -50%) scale(0.6)", opacity: "0.55" },
          "100%": { transform: "translate(-50%, -50%) scale(1.8)", opacity: "0" },
        },
        "sun-spin": { to: { transform: "rotate(360deg)" } },
        shimmer: { from: { backgroundPosition: "200% 0" }, to: { backgroundPosition: "-200% 0" } },
      },
      animation: {
        "overlay-in": "overlay-in 200ms ease-out",
        "overlay-out": "overlay-out 160ms ease-in",
        "sheet-in": "sheet-in 320ms cubic-bezier(0.22, 1, 0.36, 1)",
        "sheet-out": "sheet-out 220ms ease-in",
        "dialog-in": "dialog-in 240ms cubic-bezier(0.22, 1, 0.36, 1)",
        "dialog-out": "dialog-out 160ms ease-in",
        "halo-pulse": "halo-pulse 1.6s ease-out infinite",
        "sun-spin": "sun-spin 40s linear infinite",
        shimmer: "shimmer 1.6s linear infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/container-queries")],
};
