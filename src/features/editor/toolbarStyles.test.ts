import { describe, expect, it } from "vitest";
import { SUBJECTS } from "@/subjects/registry";
import { chosenStyle, GEORGIAN_STYLE, orderedStyles } from "./toolbarStyles";

const options = [{ id: "latin" }, { id: "georgian" }, { id: "english" }];

describe("writing styles: Georgian first", () => {
  it("puts the Georgian style first with the Georgian interface, the others first with English", () => {
    expect(orderedStyles(options, "ka").map((o) => o.id)).toEqual(["georgian", "latin", "english"]);
    expect(orderedStyles(options, "en").map((o) => o.id)).toEqual(["latin", "english", "georgian"]);
  });

  it("uses Georgian until the teacher chooses, and then always the saved choice", () => {
    expect(chosenStyle(options, null, "ka")?.id).toBe("georgian");
    expect(chosenStyle(options, null, "en")?.id).toBe("latin");
    expect(chosenStyle(options, "latin", "ka")?.id).toBe("latin");
    expect(chosenStyle(options, "georgian", "en")?.id).toBe("georgian");
    // A saved style that no longer exists → the default again.
    expect(chosenStyle(options, "old-style", "ka")?.id).toBe("georgian");
  });

  it("every subject tab with writing styles offers a Georgian one, so it is the default", () => {
    for (const toolkit of SUBJECTS) {
      for (const tab of toolkit.toolbar) {
        if (!tab.styles) continue;
        expect(tab.styles.options.map((o) => o.id), `${toolkit.id} / ${tab.id}`).toContain(GEORGIAN_STYLE);
        expect(chosenStyle(tab.styles.options, null, "ka")?.id).toBe(GEORGIAN_STYLE);
      }
    }
  });
});
