import React from "react";
import { Composition, registerRoot } from "remotion";
import { Tour } from "./Tour";
import { FPS, HEIGHT, WIDTH, layout } from "./timeline";

function Root() {
  return React.createElement(Composition, {
    id: "Tour",
    component: Tour,
    durationInFrames: Math.round(layout().total * FPS),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
  });
}

registerRoot(Root);
