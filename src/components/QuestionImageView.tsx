"use client";

import { useEffect, useState } from "react";
import { getImageUrl } from "@/lib/images/imageStore";
import type { QuestionImage } from "@/lib/storage/types";
import { DiagramView } from "@/subjects/physics/diagrams/DiagramView";

/** The address of a stored picture, or null while it loads (or if it's gone). */
export function useImageUrl(imageId: string): string | null {
  const [url, setUrl] = useState<{ id: string; url: string | null } | null>(null);
  useEffect(() => {
    let alive = true;
    getImageUrl(imageId).then((value) => {
      if (alive) setUrl({ id: imageId, url: value });
    });
    return () => {
      alive = false;
    };
  }, [imageId]);
  return url?.id === imageId ? url.url : null;
}

/**
 * A stored picture at its saved shape. The box has the right height even
 * before the picture arrives (thanks to `aspect-ratio`), so page layout can
 * be measured without waiting for pictures to load.
 */
export function QuestionImageView({ image, className = "" }: { image: QuestionImage; className?: string }) {
  // A diagram (circuit, forces…) is drawn from its data; a picture is loaded.
  if (image.diagram) {
    return (
      <div className={`w-full ${className}`} style={{ aspectRatio: `${image.width} / ${image.height}` }}>
        <DiagramView diagram={image.diagram} />
      </div>
    );
  }
  return <StoredPicture image={image} className={className} />;
}

function StoredPicture({ image, className }: { image: QuestionImage; className: string }) {
  const url = useImageUrl(image.imageId);
  const style = { aspectRatio: `${image.width} / ${image.height}` };
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- stored pictures (blob:/data: URLs), not site assets
    <img src={url} alt="" className={`block h-auto w-full ${className}`} style={style} draggable={false} />
  ) : (
    <div className={`w-full bg-muted ${className}`} style={style} aria-hidden="true" />
  );
}
