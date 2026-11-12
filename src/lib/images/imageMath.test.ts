import { describe, expect, it } from "vitest";
import type { Test } from "@/lib/storage/types";
import { outputType, targetSize, unusedImageIds, usedImageIds } from "./imageMath";

describe("targetSize", () => {
  it("leaves small pictures alone", () => {
    expect(targetSize(800, 600)).toEqual({ width: 800, height: 600, scaled: false });
  });
  it("shrinks big pictures, keeping their shape", () => {
    expect(targetSize(4800, 3600)).toEqual({ width: 2400, height: 1800, scaled: true });
    expect(targetSize(1000, 6000)).toEqual({ width: 400, height: 2400, scaled: true });
  });
});

describe("outputType", () => {
  it("keeps photos as JPEG and everything else as sharp PNG", () => {
    expect(outputType("image/jpeg")).toBe("image/jpeg");
    expect(outputType("image/png")).toBe("image/png");
    expect(outputType("image/webp")).toBe("image/png");
  });
});

const testWith = (imageIds: string[]) =>
  ({
    questions: [{ images: imageIds.map((imageId, i) => ({ id: `p${i}`, imageId })) }],
  }) as unknown as Test;

describe("usedImageIds / unusedImageIds", () => {
  it("collects pictures from every test and question", () => {
    expect([...usedImageIds([testWith(["a", "b"]), testWith(["b", "c"])])].sort()).toEqual(["a", "b", "c"]);
  });

  it("finds unused pictures, but keeps very new ones", () => {
    const now = 1_000_000_000;
    const stored = [
      { id: "a", createdAt: 0 }, // used
      { id: "old", createdAt: 0 }, // unused, old → delete
      { id: "new", createdAt: now - 1000 }, // unused but new → keep for now
    ];
    expect(unusedImageIds(stored, [testWith(["a"])], now)).toEqual(["old"]);
  });

  it("keeps a picture shared by a copied test", () => {
    expect(unusedImageIds([{ id: "a", createdAt: 0 }], [testWith([]), testWith(["a"])], 1e12)).toEqual([]);
  });
});
