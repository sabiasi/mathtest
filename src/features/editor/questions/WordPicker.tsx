"use client";

import { useT } from "@/i18n/language";
import { cn } from "@/lib/utils";
import { tokenize, wordRefs, type WordRef } from "@/lib/words";

/**
 * The teacher's text with every word clickable: click to choose a word
 * (a blank, a word to underline, the mistake…), click again to undo.
 */
export function WordPicker({
  text,
  isChosen,
  onPick,
  label,
}: {
  text: string;
  isChosen: (ref: WordRef) => boolean;
  onPick: (ref: WordRef) => void;
  /** Says what clicking does, e.g. "Click the words to leave blank". */
  label: string;
}) {
  const t = useT();
  const tokens = tokenize(text);
  const refs = wordRefs(tokens);
  if (!text.trim()) return null;
  return (
    <div>
      <p className="mb-1.5 text-sm text-muted-foreground">{label}</p>
      <div className="rounded-xl border bg-muted/30 p-3 text-[15px] leading-9 whitespace-pre-wrap" role="group" aria-label={label} data-word-picker="">
        {tokens.map((token, i) => {
          const ref = refs[i];
          if (!ref) return <span key={i}>{token.text}</span>;
          const chosen = isChosen(ref);
          return (
            <button
              key={i}
              type="button"
              aria-pressed={chosen}
              title={t(chosen ? "words.unpick" : "words.pick")}
              onClick={() => onPick(ref)}
              className={cn(
                "rounded-md px-0.5 transition-colors hover:bg-primary-soft",
                chosen && "bg-primary text-primary-foreground hover:bg-primary-hover",
              )}
            >
              {token.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
