/** Shared design tokens for the mobile app (mirror of design/tokens). */
export const theme = {
  ink: "#0c1424",
  muted: "#7a8499",
  line: "#eceff5",
  soft: "#f6f8fc",
  bg: "#ffffff",
  navy: "#0b1020",
  accent: "#2f6bff",
  accentSoft: "#eaf0ff",
  up: "#0aa66e",
  upSoft: "#e6f7f0",
  down: "#e5484d",
  downSoft: "#fdecec",
  hold: "#b07b00",
  holdSoft: "#fff6e0",
  radius: 16,
};

export const sigColors = (s: string) =>
  s === "BUY"
    ? { bg: theme.upSoft, fg: theme.up }
    : s === "SELL"
      ? { bg: theme.downSoft, fg: theme.down }
      : { bg: theme.holdSoft, fg: theme.hold };
