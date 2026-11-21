/** Intro, per-scene title cards and the closing recap (all text in Georgian). */
import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CameraView } from "./Footage";
import { colors, font } from "./theme";
import { FADE, FPS, HEIGHT, RECAP, SCENES, TITLE, WIDTH } from "./timeline";

/** The MathTest mark (copied from the app's src/components/Logo.tsx). */
export function Logo({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size}>
      <defs>
        <linearGradient id="logo-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="1" stopColor="#4338ca" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-tile)" />
      <path d="M6 17.5l3-1.5 4 7.5 6-15.5h7" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The site's soft backdrop: grey page with an indigo glow at the top. */
function Backdrop() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.page,
        backgroundImage: `radial-gradient(ellipse 70% 55% at 50% 0%, rgba(99,102,241,0.16), transparent 70%), radial-gradient(ellipse 50% 40% at 85% 100%, rgba(31,111,178,0.10), transparent 70%)`,
      }}
    />
  );
}

const fadeInOut = (frame: number, total: number, fade = FADE * FPS) =>
  interpolate(frame, [0, fade, total - fade, total], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export function Intro() {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const line = (delay: number) => interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const out = interpolate(frame, [durationInFrames - FADE * FPS, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: font, gap: 34 }}>
        <div style={{ transform: `scale(${0.6 + 0.4 * pop})`, opacity: pop, filter: "drop-shadow(0 18px 40px rgba(79,70,229,0.35))" }}>
          <Logo size={190} />
        </div>
        <div style={{ fontSize: 120, fontWeight: 700, color: colors.text, letterSpacing: -2, opacity: line(10), transform: `translateY(${(1 - line(10)) * 20}px)` }}>
          MathTest
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20, opacity: line(22), transform: `translateY(${(1 - line(22)) * 20}px)` }}>
          <span style={{ fontSize: 50, fontWeight: 600, color: colors.physics, backgroundColor: colors.physicsSoft, padding: "8px 28px", borderRadius: 999 }}>
            ფიზიკა
          </span>
          <span style={{ fontSize: 54, fontWeight: 600, color: colors.text }}>პლატფორმის ტური მასწავლებლებისთვის</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export function TitleCard({ index, title }: { index: number; title: string }) {
  const frame = useCurrentFrame();
  const total = TITLE * FPS;
  const opacity = fadeInOut(frame, total);
  const rise = interpolate(frame, [0, 14], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bar = interpolate(frame, [6, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: font, transform: `translateY(${rise}px)` }}>
        <div style={{ fontSize: 40, fontWeight: 600, color: colors.physics, backgroundColor: colors.physicsSoft, padding: "8px 26px", borderRadius: 999, marginBottom: 34 }}>
          {index + 1} / {SCENES.length}
        </div>
        <div style={{ fontSize: 104, fontWeight: 700, color: colors.text, textAlign: "center", maxWidth: 1600, lineHeight: 1.2 }}>{title}</div>
        <div style={{ marginTop: 36, height: 8, width: 220 * bar, borderRadius: 4, backgroundColor: colors.brand }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

/** A still of a scene at its "thumb" moment, seen through that moment's camera. */
function Thumb({ index }: { index: number }) {
  const scene = SCENES[index];
  const src = scene.marks.thumb ?? scene.duration - 0.5;
  const w = 400;
  const h = (w * HEIGHT) / WIDTH;
  return (
    <div style={{ width: w, height: h, overflow: "hidden", borderRadius: 14, border: `2px solid ${colors.border}`, backgroundColor: colors.card, boxShadow: "0 8px 24px rgba(15,23,42,0.10)" }}>
      <div style={{ width: WIDTH, height: HEIGHT, transform: `scale(${w / WIDTH})`, transformOrigin: "0 0", position: "relative" }}>
        <CameraView scene={scene} src={src} />
      </div>
    </div>
  );
}

export function Recap() {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, FADE * FPS], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [RECAP * FPS - 12, RECAP * FPS], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ opacity: fadeIn * fadeOut }}>
      <Backdrop />
      <AbsoluteFill style={{ alignItems: "center", fontFamily: font, paddingTop: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 26 }}>
          <Logo size={58} />
          <span style={{ fontSize: 52, fontWeight: 700, color: colors.text }}>ყველაფერი, რაც ნახეთ</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 400px)", columnGap: 36, rowGap: 22 }}>
          {SCENES.map((scene, i) => {
            const appear = interpolate(frame, [8 + i * 2.5, 20 + i * 2.5], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={scene.id} style={{ opacity: appear, transform: `translateY(${(1 - appear) * 16}px)` }}>
                <Thumb index={i} />
                <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "baseline", fontSize: 25, fontWeight: 600, color: colors.text, lineHeight: 1.25 }}>
                  <span style={{ color: colors.physics }}>{i + 1}</span>
                  <span>{scene.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
