import { describe, expect, it } from "vitest";
import { formatLatinName } from "./latin";

describe("formatLatinName", () => {
  it("writes the genus with a capital letter and the rest small", () => {
    expect(formatLatinName("homo SAPIENS")).toBe("Homo sapiens");
    expect(formatLatinName("  Quercus   robur ")).toBe("Quercus robur");
    expect(formatLatinName("e. coli")).toBe("E. coli");
    expect(formatLatinName("")).toBe("");
  });
});
