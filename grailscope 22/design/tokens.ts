/** GrailScope design tokens as a typed object (for JS/TS consumers). */
export const tokens = {
  color: {
    navy: "#0b1020",
    blue: "#2f6bff",
    teal: "#16d0a0",
    accentSoft: "#eaf0ff",
    up: "#0aa66e",
    upSoft: "#e6f7f0",
    down: "#e5484d",
    downSoft: "#fdecec",
    hold: "#b07b00",
    holdSoft: "#fff6e0",
    ink: "#0c1424",
    muted: "#6b7689",
    line: "#e8ebf2",
    soft: "#f5f7fb",
    panel: "#ffffff",
  },
  radius: { sm: 9, md: 16, lg: 22 },
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  type: { h1: 26, h2: 20, h3: 16, body: 14, small: 12 },
  gradient: "linear-gradient(135deg, #2f6bff, #16d0a0)",
} as const;
