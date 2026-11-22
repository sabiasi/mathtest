import React from "react";
import { Composition, registerRoot } from "remotion";
import { Tour } from "./Tour";
import { Promo } from "./promo/Promo";
import { promoLayout } from "./promo/timeline";
import { FPS, HEIGHT, WIDTH, layout } from "./timeline";

function Root() {
  return React.createElement(
    React.Fragment,
    null,
    React.createElement(Composition, { id: "Tour", component: Tour, durationInFrames: Math.round(layout().total * FPS), fps: FPS, width: WIDTH, height: HEIGHT }),
    React.createElement(Composition, { id: "Promo", component: Promo, durationInFrames: Math.round(promoLayout().total * FPS), fps: FPS, width: WIDTH, height: HEIGHT }),
  );
}

registerRoot(Root);
