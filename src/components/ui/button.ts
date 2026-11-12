/**
 * Shared button looks. It's a function returning CSS classes (not a
 * component), so the same style works on a <button> and on a <Link>.
 */
const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-[15px] font-semibold transition-colors disabled:opacity-50";

const variants = {
  primary: "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700",
  secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
} as const;

export function buttonClasses(variant: keyof typeof variants = "primary", extra = "") {
  return `${base} ${variants[variant]} ${extra}`.trim();
}
