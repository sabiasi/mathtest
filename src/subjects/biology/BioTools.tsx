"use client";

import { useState, type MouseEvent } from "react";
import { useT } from "@/i18n/language";
import type { ToolbarWidgetProps } from "../types";
import { formatLatinName } from "./latin";

const keepFocus = (event: MouseEvent) => event.preventDefault();

/** "Latin name: [homo sapiens] → Homo sapiens" — inserted in italics, with the right capital letters. */
export function LatinNameTool({ insertText }: ToolbarWidgetProps) {
  const t = useT();
  const [value, setValue] = useState("");
  const name = formatLatinName(value);
  const insert = () => {
    if (!name) return;
    insertText(name, 0, ["italic"]);
    setValue("");
  };
  return (
    <div className="mr-2 flex flex-wrap items-center gap-1.5 rounded-lg bg-muted px-2 py-1" data-latin-tool="">
      <label className="flex items-center gap-1.5 text-sm text-soft-foreground">
        {t("bio.latin")}
        <input
          lang="la"
          spellCheck={false}
          value={value}
          maxLength={80}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            insert();
          }}
          placeholder="Homo sapiens"
          aria-label={t("bio.latin")}
          className="h-8 w-40 rounded-md border border-input bg-card px-2 italic outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <button
        type="button"
        className="h-10 rounded-lg border bg-card px-2.5 text-sm font-semibold text-foreground shadow-xs transition-colors hover:border-primary-soft-border hover:bg-primary-soft disabled:opacity-40 pointer-coarse:h-11"
        disabled={!name}
        onMouseDown={keepFocus}
        onClick={insert}
        title={t("bio.latinInsert")}
        data-latin-insert=""
      >
        {name ? <i>{name}</i> : t("bio.latinInsert")}
      </button>
    </div>
  );
}
