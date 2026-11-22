/** The site's look (src/app/globals.css of the app): indigo brand, soft grey page, physics blue. */
import { loadFont as loadGeorgian } from "@remotion/google-fonts/NotoSansGeorgian";
import { loadFont as loadLatin } from "@remotion/google-fonts/NotoSans";

const georgian = loadGeorgian("normal", { weights: ["400", "600", "700"], subsets: ["georgian", "latin"] });
const latin = loadLatin("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

/** Noto Sans Georgian first (as on the site), Noto Sans for anything it lacks. */
export const font = `${georgian.fontFamily}, ${latin.fontFamily}, sans-serif`;

export const colors = {
  page: "#f8f9fc", // --background (light)
  ink: "#0f172a",
  text: "#1e1b4b",
  muted: "#64748b",
  brand: "#4f46e5", // --primary
  brandDark: "#4338ca",
  brandGlow: "rgba(79, 70, 229, 0.22)",
  physics: "#1f6fb2", // --subject-physics
  physicsSoft: "rgba(31, 111, 178, 0.12)",
  captionBg: "rgba(17, 24, 39, 0.86)",
  card: "#ffffff",
  border: "#e2e8f0",
};

/** Subject colours (--subject-<id> in the app's globals.css, light theme). */
export const subjectColors: Record<string, string> = {
  math: "oklch(0.5 0.2 277)",
  physics: "oklch(0.52 0.15 240)",
  chemistry: "oklch(0.5 0.11 170)",
  biology: "oklch(0.5 0.14 140)",
  geography: "oklch(0.52 0.12 105)",
  history: "oklch(0.52 0.13 55)",
  georgian: "oklch(0.52 0.19 15)",
  english: "oklch(0.5 0.16 300)",
};

/** The same colour, see-through (for soft chip backgrounds). */
export const soft = (color: string, alpha = 0.12) => `color-mix(in oklab, ${color} ${Math.round(alpha * 100)}%, transparent)`;
