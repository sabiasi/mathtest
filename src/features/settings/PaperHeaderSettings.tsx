"use client";

/**
 * Settings → "Paper header" (Premium): logo, school name, extra lines, and a
 * small picture of how the top of the paper will look.
 * On a plan without the feature it explains and offers the upgrade window;
 * a header saved earlier is kept (and says so).
 */
import { ImageUp, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel, SegmentedControl } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/AuthProvider";
import { PremiumBadge } from "@/features/plans/PremiumBadge";
import { usePlan } from "@/features/plans/PlanProvider";
import { useUpgrade } from "@/features/plans/UpgradeDialog";
import { useImageError } from "@/features/plans/useImageError";
import { Letterhead } from "@/features/print/PrintBlocks";
import { useT } from "@/i18n/language";
import { addImage } from "@/lib/images/imageStore";
import { HEADER_LIMITS, LOGO_POSITIONS, activePaperHeader, normalizePaperHeader, type LogoPosition, type PaperHeader } from "@/lib/paperHeader";

export function PaperHeaderSettings() {
  const t = useT();
  const upgrade = useUpgrade();
  const { profile, updateProfile } = useAuth();
  const { entitlements, ready } = usePlan();
  const allowed = entitlements.features.customHeader;
  const saved = normalizePaperHeader(profile?.paper_header);
  const hasSaved = profile?.paper_header != null;

  if (!profile || !ready) return null;
  if (!allowed) {
    return (
      <div data-letterhead-settings="locked">
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          {t("letterhead.lead")} {t("letterhead.locked")} {hasSaved && t("letterhead.lockedSaved")}
        </p>
        <Button className="mt-4" variant="outline" onClick={() => upgrade("header")} data-letterhead-unlock="">
          {t("letterhead.unlock")}
          <PremiumBadge compact />
        </Button>
      </div>
    );
  }
  // key: start from the saved header again if another account's profile arrives.
  return <HeaderForm key={profile.id} initial={saved} fallbackSchool={profile.school_name} onSave={(header) => updateProfile({ paper_header: header })} />;
}

function HeaderForm({ initial, fallbackSchool, onSave }: { initial: PaperHeader; fallbackSchool: string; onSave: (header: PaperHeader) => Promise<boolean> }) {
  const t = useT();
  const imageError = useImageError();
  const [header, setHeader] = useState<PaperHeader>(() => ({ ...initial, extraLines: [...initial.extraLines, "", "", ""].slice(0, HEADER_LIMITS.lines) }));
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = activePaperHeader({ ...header, enabled: true }, true);

  async function chooseLogo(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const { imageId, width, height } = await addImage(file);
      setHeader((h) => ({ ...h, logoImageId: imageId, logoWidth: width, logoHeight: height }));
    } catch (error) {
      // A full picture space also opens the upgrade window (Free plan).
      toast.error(imageError(error));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function save() {
    setBusy(true);
    const clean = normalizePaperHeader({ ...header, extraLines: header.extraLines.map((line) => line.trim()).filter(Boolean) });
    const ok = await onSave(clean);
    setBusy(false);
    if (ok) toast.success(t("letterhead.saved"));
    else toast.error(t("letterhead.saveFailed"));
  }

  return (
    <div className="space-y-5" data-letterhead-settings="open">
      <p className="text-[15px] leading-relaxed text-muted-foreground">{t("letterhead.lead")}</p>
      <div>
        <FieldLabel>{t("letterhead.enabled")}</FieldLabel>
        <SegmentedControl<"on" | "off">
          label={t("letterhead.enabled")}
          value={header.enabled ? "on" : "off"}
          onChange={(value) => setHeader({ ...header, enabled: value === "on" })}
          options={[
            { value: "on", label: t("letterhead.enabledOn") },
            { value: "off", label: t("letterhead.enabledOff") },
          ]}
        />
      </div>

      <Field label={t("letterhead.school")} hint={t("letterhead.schoolHint")}>
        <Input value={header.schoolName} maxLength={HEADER_LIMITS.schoolLength} placeholder={fallbackSchool} onChange={(e) => setHeader({ ...header, schoolName: e.target.value })} data-letterhead-school="" />
      </Field>

      <div>
        <FieldLabel hint={t("letterhead.logoHint")}>{t("letterhead.logo")}</FieldLabel>
        <div className="flex flex-wrap items-center gap-3">
          <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/svg+xml" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => void chooseLogo(e.target.files?.[0])} data-letterhead-file="" />
          <Button type="button" variant="outline" disabled={busy} onClick={() => fileInput.current?.click()}>
            <ImageUp aria-hidden="true" />
            {header.logoImageId ? t("letterhead.logoReplace") : t("letterhead.logoUpload")}
          </Button>
          {header.logoImageId && (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setHeader({ ...header, logoImageId: "", logoWidth: 0, logoHeight: 0 })} data-letterhead-remove-logo="">
              <Trash2 aria-hidden="true" />
              {t("letterhead.logoRemove")}
            </Button>
          )}
        </div>
      </div>

      {header.logoImageId && (
        <div>
          <FieldLabel>{t("letterhead.position")}</FieldLabel>
          <SegmentedControl<LogoPosition>
            label={t("letterhead.position")}
            value={header.logoPosition}
            onChange={(logoPosition) => setHeader({ ...header, logoPosition })}
            options={LOGO_POSITIONS.map((position) => ({ value: position, label: t(`letterhead.position.${position}`) }))}
          />
        </div>
      )}

      <div>
        <FieldLabel>{t("letterhead.lines")}</FieldLabel>
        <div className="space-y-2">
          {header.extraLines.map((line, index) => (
            <Input
              key={index}
              value={line}
              maxLength={HEADER_LIMITS.lineLength}
              placeholder={index === 0 ? t("letterhead.linePlaceholder") : ""}
              aria-label={`${t("letterhead.lines")} ${index + 1}`}
              data-letterhead-line={index}
              onChange={(e) => setHeader({ ...header, extraLines: header.extraLines.map((old, i) => (i === index ? e.target.value : old)) })}
            />
          ))}
        </div>
      </div>

      <div>
        <FieldLabel>{t("letterhead.preview")}</FieldLabel>
        {/* Paper is always white, also in dark mode. */}
        <div className="paper rounded-xl border p-5" data-letterhead-preview="">
          <div className="print-header">
            {preview ? <Letterhead header={preview} fallbackSchool={fallbackSchool} /> : fallbackSchool && <p className="print-school">{fallbackSchool}</p>}
            <p className="print-title">{t("letterhead.previewTitle")}</p>
          </div>
        </div>
      </div>

      <Button disabled={busy} onClick={() => void save()} data-letterhead-save="">
        {t("letterhead.save")}
      </Button>
    </div>
  );
}
