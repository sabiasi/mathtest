/**
 * One scene's footage: the recorded frames with everything drawn on top.
 *
 *  camera layer (zooms/pans with the page):  frame → dimming spotlight → highlight outline
 *  screen layer (fixed size on screen):      cursor + click ripple → caption
 */
import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame } from "remotion";
import { colors, font } from "./theme";
import { FPS, HEIGHT, WIDTH, rateAt, toSource, type Box, type SceneData } from "./timeline";

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (x: number) => {
  const t = clamp(x);
  return t * t * (3 - 2 * t);
};
/** Fade in over `a` seconds after t0 and out over `a` seconds after t1. */
const envelope = (s: number, t0: number, t1: number, a = 0.22) => clamp((s - t0) / a) * (1 - clamp((s - t1) / a));

/* ---------- frames ---------- */

export function frameAt(scene: SceneData, src: number): string {
  const f = scene.frames;
  let lo = 0;
  let hi = f.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (f[mid].t <= src) lo = mid;
    else hi = mid - 1;
  }
  return staticFile(`capture/${scene.id}/${f[lo].file}`);
}

/* ---------- camera ---------- */

type Cam = { z: number; cx: number; cy: number };

function target(scene: SceneData, box: Box | null, pad: number, maxZoom: number): Cam {
  const { width: W, height: H } = scene.viewport;
  if (!box) return { z: 1, cx: W / 2, cy: H / 2 };
  const z = clamp(Math.min(W / (box.w + 2 * pad), H / (box.h + 2 * pad)), 1, maxZoom);
  const halfW = W / (2 * z);
  const halfH = H / (2 * z);
  return { z, cx: clamp(box.x + box.w / 2, halfW, W - halfW), cy: clamp(box.y + box.h / 2, halfH, H - halfH) };
}

const mix = (a: Cam, b: Cam, p: number): Cam => ({ z: a.z + (b.z - a.z) * p, cx: a.cx + (b.cx - a.cx) * p, cy: a.cy + (b.cy - a.cy) * p });
const CAMERA_MOVE = 0.9; // seconds (source time)

export function cameraAt(scene: SceneData, src: number): Cam {
  let from = target(scene, null, 0, 1);
  let to = from;
  let since = -Infinity;
  for (const key of scene.camera) {
    if (key.t > src) break;
    from = mix(from, to, smooth((key.t - since) / CAMERA_MOVE));
    to = target(scene, key.box, key.pad, key.maxZoom);
    since = key.t;
  }
  return mix(from, to, smooth((src - since) / CAMERA_MOVE));
}

/** Page point (CSS px of the recording) → point on the video, through the camera. */
export function toScreen(scene: SceneData, cam: Cam, x: number, y: number) {
  const k = WIDTH / scene.viewport.width;
  return { x: (x - cam.cx) * k * cam.z + WIDTH / 2, y: (y - cam.cy) * k * cam.z + HEIGHT / 2 };
}

/** The frame (and optionally overlays) seen through the camera, filling 1920×1080. */
export function CameraView({ scene, src, children }: { scene: SceneData; src: number; children?: React.ReactNode }) {
  const cam = cameraAt(scene, src);
  const k = WIDTH / scene.viewport.width;
  const transform = `translate(${WIDTH / 2}px, ${HEIGHT / 2}px) scale(${cam.z}) translate(${-cam.cx * k}px, ${-cam.cy * k}px)`;
  return (
    <AbsoluteFill style={{ backgroundColor: colors.page, overflow: "hidden" }}>
      <div style={{ position: "absolute", width: WIDTH, height: HEIGHT, transformOrigin: "0 0", transform }}>
        <Img src={frameAt(scene, src)} style={{ width: WIDTH, height: HEIGHT, display: "block" }} />
        {children}
      </div>
    </AbsoluteFill>
  );
}

/* ---------- overlays inside the camera ---------- */

function Spotlight({ scene, src }: { scene: SceneData; src: number }) {
  const k = WIDTH / scene.viewport.width;
  const active = scene.highlights
    .map((h) => ({ h, a: envelope(src, h.t0, h.t1) * (h.outline ? 0.2 : 0.38) }))
    .filter((x) => x.a > 0.001);
  if (active.length === 0) return null;
  const alpha = Math.max(...active.map((x) => x.a));
  const id = `spot-${scene.id}`;
  return (
    <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
      <defs>
        <mask id={id}>
          <rect width={WIDTH} height={HEIGHT} fill="white" />
          {active.map(({ h }, i) => (
            <rect key={i} x={(h.box.x - 8) * k} y={(h.box.y - 8) * k} width={(h.box.w + 16) * k} height={(h.box.h + 16) * k} rx={14} fill="black" />
          ))}
        </mask>
      </defs>
      <rect width={WIDTH} height={HEIGHT} fill={colors.ink} opacity={alpha} mask={`url(#${id})`} />
    </svg>
  );
}

function Outlines({ scene, src }: { scene: SceneData; src: number }) {
  const k = WIDTH / scene.viewport.width;
  return (
    <>
      {scene.highlights
        .filter((h) => h.outline)
        .map((h, i) => {
          const a = envelope(src, h.t0, h.t1, 0.18);
          if (a <= 0.001) return null;
          const grow = 1 - smooth((src - h.t0) / 0.3); // starts a little bigger, settles
          const pad = 7 + 10 * grow;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: (h.box.x - pad) * k,
                top: (h.box.y - pad) * k,
                width: (h.box.w + 2 * pad) * k,
                height: (h.box.h + 2 * pad) * k,
                border: `4px solid ${colors.brand}`,
                borderRadius: 14,
                boxShadow: `0 0 0 6px ${colors.brandGlow}, 0 8px 30px ${colors.brandGlow}`,
                opacity: a,
              }}
            />
          );
        })}
    </>
  );
}

/* ---------- overlays on the screen ---------- */

function mouseAt(scene: SceneData, src: number) {
  const m = scene.mouse;
  if (m.length === 0) return { x: scene.viewport.width / 2, y: scene.viewport.height / 2 };
  if (src <= m[0].t) return m[0];
  let lo = 0;
  let hi = m.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (m[mid].t <= src) lo = mid;
    else hi = mid - 1;
  }
  const a = m[lo];
  const b = m[Math.min(lo + 1, m.length - 1)];
  const p = b.t > a.t ? clamp((src - a.t) / (b.t - a.t)) : 0;
  return { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
}

/** Big arrow cursor (about 1.8× a normal one) with a ripple on every click. */
function Cursor({ scene, src }: { scene: SceneData; src: number }) {
  const cam = cameraAt(scene, src);
  const p = mouseAt(scene, src);
  const at = toScreen(scene, cam, p.x, p.y);
  // Ripples and the press last a fixed VIDEO time, whatever the playback speed.
  const rate = rateAt(scene, src);
  const ripples = scene.clicks.map((c) => ({ c, age: (src - c.t) / rate })).filter(({ age }) => age >= 0 && age < 0.6);
  const press = scene.clicks.some((c) => {
    const age = (src - c.t) / rate;
    return age >= -0.08 && age < 0.12;
  });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {ripples.map(({ c, age }, i) => {
        const r = toScreen(scene, cam, c.x, c.y);
        const size = 20 + 90 * smooth(age / 0.6);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: r.x - size / 2,
              top: r.y - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              border: `5px solid ${colors.brand}`,
              backgroundColor: colors.brandGlow,
              opacity: 1 - age / 0.6,
            }}
          />
        );
      })}
      <svg
        width={44}
        height={56}
        viewBox="0 0 22 28"
        style={{
          position: "absolute",
          left: at.x - 3,
          top: at.y - 2,
          transform: `scale(${press ? 0.86 : 1})`,
          transformOrigin: "3px 2px",
          filter: "drop-shadow(0 3px 5px rgba(0,0,0,0.35))",
        }}
      >
        <path d="M1.5 1.5 L1.5 22 L7 17 L10.8 25.5 L14.4 24 L10.7 15.6 L18 15.6 Z" fill="#111827" stroke="#ffffff" strokeWidth={1.6} strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  );
}

function CaptionBar({ scene, src }: { scene: SceneData; src: number }) {
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 56, pointerEvents: "none" }}>
      {scene.captions.map((c, i) => {
        const a = envelope(src, c.t0, c.t1, 0.25);
        if (a <= 0.001) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              bottom: 56,
              opacity: a,
              transform: `translateY(${(1 - smooth(a)) * 14}px)`,
              backgroundColor: colors.captionBg,
              color: "#ffffff",
              fontFamily: font,
              fontSize: 46,
              fontWeight: 600,
              lineHeight: 1.3,
              padding: "18px 40px",
              borderRadius: 22,
              boxShadow: "0 12px 40px rgba(15, 23, 42, 0.28)",
              maxWidth: 1500,
              textAlign: "center",
            }}
          >
            {c.text}
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** The scene's footage; frame 0 = the first moment of footage. */
export function Footage({ scene }: { scene: SceneData }) {
  const frame = useCurrentFrame();
  const src = toSource(scene, frame / FPS);
  return (
    <AbsoluteFill>
      <CameraView scene={scene} src={src}>
        <Spotlight scene={scene} src={src} />
        <Outlines scene={scene} src={src} />
      </CameraView>
      <Cursor scene={scene} src={src} />
      <CaptionBar scene={scene} src={src} />
    </AbsoluteFill>
  );
}
