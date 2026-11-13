import { describe, expect, it } from "vitest";
import { centuryOf, toRoman } from "./roman";

describe("toRoman", () => {
  it("writes centuries the way history books do", () => {
    expect(toRoman(1)).toBe("I");
    expect(toRoman(4)).toBe("IV");
    expect(toRoman(9)).toBe("IX");
    expect(toRoman(12)).toBe("XII");
    expect(toRoman(19)).toBe("XIX");
    expect(toRoman(21)).toBe("XXI");
    expect(toRoman(1121)).toBe("MCXXI");
  });
  it("gives nothing for numbers it can't write", () => {
    for (const bad of [0, -3, 4000, 2.5, NaN]) expect(toRoman(bad)).toBe("");
  });
});

describe("centuryOf", () => {
  it("knows that 1900 is still the 19th century", () => {
    expect(centuryOf(1121)).toBe(12);
    expect(centuryOf(1900)).toBe(19);
    expect(centuryOf(1901)).toBe(20);
    expect(centuryOf(-66)).toBe(1);
  });
});
