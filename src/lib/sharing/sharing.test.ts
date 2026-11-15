import { describe, expect, it } from "vitest";
import { cleanEmail, initials, linkPath, othersPresent, shareResultOf } from "./sharing";

describe("cleanEmail", () => {
  it("tidies a real address and refuses things that aren't one", () => {
    expect(cleanEmail("  Nino.Beridze@Skola.GE ")).toBe("nino.beridze@skola.ge");
    for (const bad of ["", "nino", "nino@", "@skola.ge", "nino@skola", "ni no@skola.ge", `${"a".repeat(250)}@x.ge`]) expect(cleanEmail(bad)).toBeNull();
  });
});

describe("shareResultOf", () => {
  it("turns the database's refusals into messages the teacher can act on", () => {
    expect(shareResultOf(null)).toBe("ok");
    expect(shareResultOf({ code: "42501" })).toBe("premium");
    expect(shareResultOf({ code: "54000" })).toBe("full");
    expect(shareResultOf({ code: "23503" })).toBe("notSaved");
    expect(shareResultOf({ code: "XX000" })).toBe("failed");
  });
});

describe("othersPresent", () => {
  it("lists the other people once each, without me, sorted by name", () => {
    const state = { me: [{ name: "მე" }], b: [{ name: "ნინო" }, { name: "ნინო" }], a: [{ name: " გიორგი " }], c: [{}], gone: [] };
    expect(othersPresent(state, "me")).toEqual([{ id: "c", name: "" }, { id: "a", name: "გიორგი" }, { id: "b", name: "ნინო" }]);
    expect(othersPresent({ me: [{ name: "მე" }] }, "me")).toEqual([]);
  });
});

describe("initials and links", () => {
  it("makes a two-letter badge", () => {
    expect(initials("ნინო ბერიძე")).toBe("ნბ");
    expect(initials("nino")).toBe("NI");
    expect(initials("  ")).toBe("?");
    expect(initials("Ana Maria Lopez")).toBe("AL");
  });
  it("puts the token in the address", () => {
    expect(linkPath("abc")).toBe("/shared/abc");
  });
});
