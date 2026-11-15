/**
 * The teacher's own paper header (Premium): a school logo, the school's name
 * and up to three extra lines ("Semester exam", a motto, an address…),
 * printed at the top of every paper instead of the plain school line.
 *
 * Saved in the profile (`profiles.paper_header`), so it follows the teacher
 * to every test and every computer. Pure data and checks — no React here.
 */
export const LOGO_POSITIONS = ["left", "center", "right"] as const;
export type LogoPosition = (typeof LOGO_POSITIONS)[number];

export const HEADER_LIMITS = { lines: 3, lineLength: 120, schoolLength: 200 };

export type PaperHeader = {
  /** Off = the plain default header, with everything below kept for later. */
  enabled: boolean;
  /** Printed instead of the test's own "school" field when filled in. */
  schoolName: string;
  /** The uploaded logo ("" = none). It lives with the teacher's other pictures. */
  logoImageId: string;
  logoWidth: number;
  logoHeight: number;
  logoPosition: LogoPosition;
  extraLines: string[];
};

export const EMPTY_HEADER: PaperHeader = { enabled: false, schoolName: "", logoImageId: "", logoWidth: 0, logoHeight: 0, logoPosition: "left", extraLines: [] };

const text = (value: unknown, max: number) => (typeof value === "string" ? value.slice(0, max) : "");
const size = (value: unknown) => (typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.min(Math.round(value), 20000) : 0);

/** Whatever was stored (or sent to the PDF server) → a complete, safe header. */
export function normalizePaperHeader(raw: unknown): PaperHeader {
  if (!raw || typeof raw !== "object") return EMPTY_HEADER;
  const value = raw as Record<string, unknown>;
  const logoImageId = /^[A-Za-z0-9_-]{1,80}$/.test(String(value.logoImageId ?? "")) ? String(value.logoImageId) : "";
  const logoWidth = size(value.logoWidth);
  const logoHeight = size(value.logoHeight);
  const hasLogo = logoImageId !== "" && logoWidth > 0 && logoHeight > 0;
  return {
    enabled: value.enabled === true,
    schoolName: text(value.schoolName, HEADER_LIMITS.schoolLength),
    logoImageId: hasLogo ? logoImageId : "",
    logoWidth: hasLogo ? logoWidth : 0,
    logoHeight: hasLogo ? logoHeight : 0,
    logoPosition: LOGO_POSITIONS.includes(value.logoPosition as LogoPosition) ? (value.logoPosition as LogoPosition) : "left",
    extraLines: Array.isArray(value.extraLines)
      ? value.extraLines.map((line) => text(line, HEADER_LIMITS.lineLength)).slice(0, HEADER_LIMITS.lines)
      : [],
  };
}

/**
 * The header that is actually printed: only when it is switched on, has
 * something in it, and the plan includes the feature. Otherwise null = the
 * default header.
 */
export function activePaperHeader(raw: unknown, allowed: boolean): PaperHeader | null {
  if (!allowed) return null;
  const header = normalizePaperHeader(raw);
  const lines = header.extraLines.map((line) => line.trim()).filter(Boolean);
  if (!header.enabled || (!header.logoImageId && !header.schoolName.trim() && lines.length === 0)) return null;
  return { ...header, schoolName: header.schoolName.trim(), extraLines: lines };
}

/** The logo's printed size in millimetres: at most 18 mm tall and 45 mm wide. */
export function logoSizeMm(header: Pick<PaperHeader, "logoWidth" | "logoHeight">): { width: number; height: number } {
  if (!header.logoWidth || !header.logoHeight) return { width: 0, height: 0 };
  const ratio = header.logoWidth / header.logoHeight;
  const height = Math.min(18, 45 / ratio);
  return { width: Math.round(height * ratio * 10) / 10, height: Math.round(height * 10) / 10 };
}
