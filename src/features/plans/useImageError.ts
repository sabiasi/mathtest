"use client";

import { useCallback } from "react";
import { useT } from "@/i18n/language";
import { formatSize } from "@/lib/format";
import { ImageStorageFullError, UnsupportedImageError } from "@/lib/images/imageStore";
import { usePlan } from "./PlanProvider";
import { useUpgrade } from "./UpgradeDialog";

/**
 * Turns a "couldn't add the picture" error into a message for the teacher.
 * Picture space full on the Free plan: also opens the upgrade window
 * (only now, because the teacher just tried to add a picture).
 */
export function useImageError(): (error: unknown) => string {
  const t = useT();
  const upgrade = useUpgrade();
  const { entitlements } = usePlan();
  return useCallback(
    (error: unknown) => {
      if (error instanceof ImageStorageFullError) {
        if (entitlements.plan === "free") upgrade("images");
        return t("media.storageFull", { limit: formatSize(error.limitBytes) });
      }
      return t(error instanceof UnsupportedImageError ? "media.unsupported" : "media.failed");
    },
    [t, upgrade, entitlements.plan],
  );
}
