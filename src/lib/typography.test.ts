import { describe, expect, it } from "vitest";
import { georgianTypography } from "./typography";

describe("georgianTypography", () => {
  it("turns any quotation marks into Georgian ones", () => {
    expect(georgianTypography('მან თქვა: "წავიდეთ".')).toBe("მან თქვა: „წავიდეთ“.");
    expect(georgianTypography("“ვეფხისტყაოსანი”")).toBe("„ვეფხისტყაოსანი“");
    expect(georgianTypography("«სიტყვა»")).toBe("„სიტყვა“");
    expect(georgianTypography("„უკვე სწორია“")).toBe("„უკვე სწორია“");
  });

  it("uses the long dash between words and for dialogue", () => {
    expect(georgianTypography("ზაფხული - დასვენება")).toBe("ზაფხული — დასვენება");
    expect(georgianTypography("ერთი -- ორი")).toBe("ერთი — ორი");
    expect(georgianTypography("- მოდი!\n– წავედი.")).toBe("— მოდი!\n— წავედი.");
  });

  it("leaves ranges and hyphenated words alone", () => {
    expect(georgianTypography("1801–1804 წწ.")).toBe("1801–1804 წწ.");
    expect(georgianTypography("ვინმე-ვინმე")).toBe("ვინმე-ვინმე");
  });

  it("writes … instead of three dots", () => {
    expect(georgianTypography("და მერე...")).toBe("და მერე…");
  });
});
