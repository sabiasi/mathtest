"use client";

import { useState } from "react";
import { fieldClasses } from "@/components/ui/input";
import { formatPoints } from "@/lib/questions";
import { cn } from "@/lib/utils";

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
    <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
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
        className={cn(fieldClasses, "h-9 w-14 px-2 text-center font-semibold")}
      />
      {label}
    </label>
  );
}
