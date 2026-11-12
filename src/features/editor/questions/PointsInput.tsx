"use client";

import { useState } from "react";
import { formatPoints } from "@/lib/questions";

/**
 * A small box for a question's points. Accepts "1.5" and the Georgian-style
 * "1,5". It keeps its own text while typing (so you can clear it and type a
 * new number) and tidies it up when you click away.
 */
export function PointsInput({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (points: number) => void;
}) {
  const [text, setText] = useState(formatPoints(value));

  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-600">
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d.,]/g, "").slice(0, 5);
          setText(next);
          const points = parseFloat(next.replace(",", "."));
          onChange(Number.isFinite(points) ? points : 0);
        }}
        onBlur={() => setText(formatPoints(value))}
        className="w-14 rounded-lg border border-slate-300 px-2 py-1.5 text-center font-semibold text-slate-900 hover:border-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
      />
      {label}
    </label>
  );
}
