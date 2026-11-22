/** The promo video: intro → (title card + footage) × scenes → outro. Silent, no captions. */
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Footage } from "../Footage";
import { colors } from "../theme";
import { FPS } from "../timeline";
import { PromoIntro, PromoOutro, PromoTitle } from "./PromoCards";
import { INTRO, OUTRO, TITLE, promoLayout } from "./timeline";

const f = (seconds: number) => Math.round(seconds * FPS);

export function Promo() {
  const { placed, outroStart } = promoLayout();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.page }}>
      <Sequence durationInFrames={f(INTRO)} name="Intro">
        <PromoIntro />
      </Sequence>
      {placed.map((p) => (
        <React.Fragment key={p.scene.id}>
          <Sequence from={f(p.footageStart)} durationInFrames={f(p.footage)} name={`${p.index + 1}. ${p.scene.id}`}>
            <Footage scene={p.scene} />
          </Sequence>
          {/* After the footage, so the card sits on top while they cross-fade. */}
          <Sequence from={f(p.start)} durationInFrames={f(TITLE)} name={`title: ${p.scene.id}`}>
            <PromoTitle index={p.index} title={p.scene.title} accent={p.scene.accent} />
          </Sequence>
        </React.Fragment>
      ))}
      <Sequence from={f(outroStart)} durationInFrames={f(OUTRO)} name="Outro">
        <PromoOutro />
      </Sequence>
    </AbsoluteFill>
  );
}
