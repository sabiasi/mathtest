/** The promo video's intro, title cards and closing card (Georgian; no subtitles, no sound). */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop, Logo } from "../Cards";
import { colors, font, soft, subjectColors } from "../theme";
import { FADE, PROMO_SCENES, TITLE } from "./timeline";
import { FPS } from "../timeline";

const SUBJECTS: [string, string][] = [
  ["math", "მათემატიკა"],
  ["physics", "ფიზიკა"],
  ["chemistry", "ქიმია"],
  ["biology", "ბიოლოგია"],
  ["geography", "გეოგრაფია"],
  ["history", "ისტორია"],
  ["georgian", "ქართული"],
  ["english", "ინგლისური"],
];

const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const appear = (frame: number, delay: number, length = 12) => interpolate(frame, [delay, delay + length], [0, 1], clampOpts);

function Chip({ id, label, t }: { id: string; label: string; t: number }) {
  const color = subjectColors[id];
  return (
    <span
      style={{
        fontSize: 34,
        fontWeight: 600,
        color,
        backgroundColor: soft(color),
        border: `2px solid ${soft(color, 0.25)}`,
        padding: "8px 24px",
        borderRadius: 999,
        opacity: t,
        transform: `translateY(${(1 - t) * 18}px)`,
      }}
    >
      {label}
    </span>
  );
}

export function PromoIntro() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const out = interpolate(frame, [durationInFrames - FADE * FPS, durationInFrames], [1, 0], clampOpts);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: font, gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div style={{ transform: `scale(${0.6 + 0.4 * pop})`, opacity: pop, filter: "drop-shadow(0 18px 40px rgba(79,70,229,0.35))" }}>
            <Logo size={170} />
          </div>
          <div style={{ fontSize: 150, fontWeight: 700, color: colors.text, letterSpacing: -3, opacity: appear(frame, 8), transform: `translateX(${(1 - appear(frame, 8)) * -30}px)` }}>
            Rapido
          </div>
        </div>
        <div style={{ fontSize: 64, fontWeight: 700, color: colors.text, opacity: appear(frame, 22), transform: `translateY(${(1 - appear(frame, 22)) * 20}px)` }}>
          ტესტები ყველა საგანში — <span style={{ color: colors.brand }}>წუთებში</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, maxWidth: 1500, marginTop: 20 }}>
          {SUBJECTS.map(([id, label], i) => (
            <Chip key={id} id={id} label={label} t={appear(frame, 38 + i * 3)} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function PromoTitle({ index, title, accent }: { index: number; title: string; accent?: string }) {
  const frame = useCurrentFrame();
  const total = TITLE * FPS;
  const fade = FADE * FPS;
  const opacity = interpolate(frame, [0, fade, total - fade, total], [0, 1, 1, 0], clampOpts);
  const rise = interpolate(frame, [0, 14], [24, 0], clampOpts);
  const bar = interpolate(frame, [6, 26], [0, 1], clampOpts);
  const color = accent ? subjectColors[accent] : colors.brand;
  return (
    <AbsoluteFill style={{ opacity }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: font, transform: `translateY(${rise}px)` }}>
        <div style={{ fontSize: 40, fontWeight: 600, color, backgroundColor: soft(color), padding: "8px 26px", borderRadius: 999, marginBottom: 34 }}>
          {index + 1} / {PROMO_SCENES.length}
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, color: colors.text, textAlign: "center", maxWidth: 1640, lineHeight: 1.2 }}>{title}</div>
        <div style={{ marginTop: 36, height: 8, width: 220 * bar, borderRadius: 4, backgroundColor: color }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function PromoOutro() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fadeIn = interpolate(frame, [0, FADE * FPS], [0, 1], clampOpts);
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], clampOpts);
  const pop = spring({ frame: frame - 4, fps, config: { damping: 14, mass: 0.8 } });
  const points = ["ფორმულები ღილაკებით", "ნახაზები და ცხრილები", "ფურცელი — აკრეფისას", "ვარიანტები და პასუხები", "PDF ერთი დაწკაპუნებით"];
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: font, gap: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30, transform: `scale(${0.7 + 0.3 * pop})`, opacity: pop }}>
          <Logo size={120} />
          <span style={{ fontSize: 110, fontWeight: 700, color: colors.text, letterSpacing: -2 }}>Rapido</span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "14px 40px", maxWidth: 1500 }}>
          {points.map((text, i) => {
            const t = appear(frame, 16 + i * 5);
            return (
              <span key={text} style={{ fontSize: 40, fontWeight: 600, color: colors.text, opacity: t, display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ color: colors.brand, fontSize: 36 }}>✓</span>
                {text}
              </span>
            );
          })}
        </div>
        <div
          style={{
            marginTop: 26,
            fontSize: 50,
            fontWeight: 700,
            color: "#ffffff",
            backgroundColor: colors.brand,
            padding: "22px 60px",
            borderRadius: 22,
            boxShadow: `0 16px 50px ${colors.brandGlow}`,
            opacity: appear(frame, 48),
            transform: `scale(${0.9 + 0.1 * appear(frame, 48)})`,
          }}
        >
          დაიწყეთ უფასოდ
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
