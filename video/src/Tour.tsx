/** The whole tour: intro → (title card + footage) × scenes → recap. Silent. */
import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { Intro, Recap, TitleCard } from "./Cards";
import { Footage } from "./Footage";
import { colors } from "./theme";
import { FPS, INTRO, RECAP, TITLE, layout } from "./timeline";

const f = (seconds: number) => Math.round(seconds * FPS);

export function Tour() {
  const { placed, recapStart } = layout();
  return (
    <AbsoluteFill style={{ backgroundColor: colors.page }}>
      <Sequence durationInFrames={f(INTRO)} name="Intro">
        <Intro />
      </Sequence>
      {placed.map((p) => (
        <React.Fragment key={p.scene.id}>
          <Sequence from={f(p.footageStart)} durationInFrames={f(p.footage)} name={`${p.index + 1}. ${p.scene.id}`}>
            <Footage scene={p.scene} />
          </Sequence>
          {/* After the footage, so the card sits on top while they cross-fade. */}
          <Sequence from={f(p.start)} durationInFrames={f(TITLE)} name={`title: ${p.scene.id}`}>
            <TitleCard index={p.index} title={p.scene.title} />
          </Sequence>
        </React.Fragment>
      ))}
      <Sequence from={f(recapStart)} durationInFrames={f(RECAP)} name="Recap">
        <Recap />
      </Sequence>
    </AbsoluteFill>
  );
}
