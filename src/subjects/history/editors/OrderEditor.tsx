"use client";

import { Plus } from "lucide-react";
import { RichTextInput } from "@/features/math/RichTextInput";
import { useT } from "@/i18n/language";
import { newId } from "@/lib/ids";
import { LIMITS } from "@/lib/questions";
import type { OrderQuestion } from "@/lib/storage/types";
import { RowControls, addButtonClass, move } from "./RowControls";

/**
 * Chronological order: the teacher writes the events IN THE RIGHT ORDER
 * (earliest first). The paper shows them shuffled and lettered.
 */
export function OrderEditor({ question, onChange }: { question: OrderQuestion; onChange: (question: OrderQuestion) => void }) {
  const t = useT();
  const { items } = question;
  return (
    <div data-order-editor="">
      <p className="mb-2 text-sm text-muted-foreground">{t("order.hint")}</p>
      <ol className="space-y-2">
        {items.map((item, index) => (
          <li key={item.id} className="flex items-center gap-2">
            <span className="w-6 shrink-0 text-right font-semibold text-soft-foreground tabular-nums">{index + 1}.</span>
            <RichTextInput
              singleLine
              className="min-w-0 flex-1"
              value={item.text}
              ariaLabel={t("order.item", { number: index + 1 })}
              placeholder={t(index === 0 ? "order.firstPlaceholder" : "order.itemPlaceholder")}
              onChange={(text) => onChange({ ...question, items: items.map((i) => (i.id === item.id ? { ...i, text } : i)) })}
            />
            <RowControls
              index={index}
              count={items.length}
              min={LIMITS.orderItems.min}
              onMove={(by) => onChange({ ...question, items: move(items, index, by) })}
              onRemove={() => onChange({ ...question, items: items.filter((i) => i.id !== item.id) })}
            />
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={`${addButtonClass} mt-1 ml-6`}
        disabled={items.length >= LIMITS.orderItems.max}
        onClick={() => onChange({ ...question, items: [...items, { id: newId(), text: [] }] })}
      >
        <Plus className="size-4" aria-hidden="true" />
        {t("order.add")}
      </button>
    </div>
  );
}
