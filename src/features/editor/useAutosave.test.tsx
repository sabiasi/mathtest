/**
 * Leaving right after typing: the words typed during autosave's short wait
 * must be handed over, and the browser must be told when work is still unsaved.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localTestsBackend, readLocalTests } from "@/lib/storage/localTests";
import {
  createTest, flushDrafts, getTest, hasUnsavedChanges, startSync, stopSync, waitUntilAllSaved, type TestsBackend,
} from "@/lib/storage/testsRepository";
import type { Test } from "@/lib/storage/types";
import { useAutosave } from "./useAutosave";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** A pretend cloud; `online = false` makes every save fail. */
function fakeCloud() {
  const rows = new Map<string, Test>();
  const state = { online: true };
  const backend: TestsBackend = {
    kind: "cloud",
    list: async () => [...rows.values()],
    upsert: async (test) => {
      if (!state.online) throw new Error("offline");
      rows.set(test.id, test);
    },
    remove: async (id) => { rows.delete(id); },
  };
  return { backend, rows, state };
}

function Editor({ test, dirty, markSaved }: { test: Test; dirty: boolean; markSaved: () => void }) {
  useAutosave(test, dirty, markSaved);
  return null;
}

let root: Root;
let host: HTMLDivElement;
const markSaved = vi.fn();
const show = (test: Test, dirty: boolean) => act(() => root.render(<Editor test={test} dirty={dirty} markSaved={markSaved} />));
const settle = () => act(() => vi.advanceTimersByTimeAsync(0));
/** What the browser does when the tab is closed or reloaded; true = "it will ask before leaving". */
function leavePage(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

beforeEach(() => {
  stopSync();
  localStorage.clear();
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
  markSaved.mockClear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  stopSync();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useAutosave: leaving before the typing pause is over", () => {
  it("account: closing the tab hands the words over and makes the browser ask", async () => {
    const cloud = fakeCloud();
    await startSync(cloud.backend);
    const test = createTest({ title: "ძველი" });
    await settle();
    await show({ ...test, title: "ახალი" }, true);
    await act(() => vi.advanceTimersByTimeAsync(100)); // less than the 600 ms wait
    expect(getTest(test.id)?.title).toBe("ძველი");

    expect(leavePage()).toBe(true); // the upload has only started
    expect(getTest(test.id)?.title).toBe("ახალი");
    expect(markSaved).toHaveBeenCalled();
    await settle();
    expect(cloud.rows.get(test.id)?.title).toBe("ახალი");
    expect(leavePage()).toBe(false); // everything arrived: no question any more
  });

  it("guest: the words are in the browser's storage at once, with no question", async () => {
    await startSync(localTestsBackend());
    const test = createTest({ title: "ძველი" });
    await settle();
    await show({ ...test, title: "ახალი" }, true);

    expect(leavePage()).toBe(false);
    expect(readLocalTests()[0].title).toBe("ახალი");
  });

  it("guest: a full browser storage makes the browser ask", async () => {
    await startSync(localTestsBackend());
    const test = createTest({ title: "ძველი" });
    await settle();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("full", "QuotaExceededError"); });
    await show({ ...test, title: "ახალი" }, true);
    await act(() => vi.advanceTimersByTimeAsync(700)); // the save was tried and refused
    expect(leavePage()).toBe(true);
    expect(readLocalTests()[0].title).toBe("ძველი"); // the old copy is untouched
  });

  it("hiding the tab (phones) saves without waiting", async () => {
    const cloud = fakeCloud();
    await startSync(cloud.backend);
    const test = createTest();
    await settle();
    await show({ ...test, title: "ტელეფონი" }, true);
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    await settle();
    expect(cloud.rows.get(test.id)?.title).toBe("ტელეფონი");
  });

  it("going to another page of the app saves once", async () => {
    const cloud = fakeCloud();
    await startSync(cloud.backend);
    const test = createTest();
    await settle();
    await show({ ...test, title: "გასვლა" }, true);
    act(() => root.unmount());
    await settle();
    expect(cloud.rows.get(test.id)?.title).toBe("გასვლა");
    root = createRoot(host);
  });

  it("sign-out: drafts are handed over, and a failing save is reported as not saved", async () => {
    const cloud = fakeCloud();
    await startSync(cloud.backend);
    const test = createTest();
    await settle();

    await show({ ...test, title: "ერთი" }, true);
    act(() => flushDrafts());
    const saved = waitUntilAllSaved(5000);
    await settle();
    expect(await saved).toBe(true);
    expect(cloud.rows.get(test.id)?.title).toBe("ერთი");

    cloud.state.online = false;
    await show({ ...test, title: "ორი" }, true);
    act(() => flushDrafts());
    const offline = waitUntilAllSaved(5000);
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(await offline).toBe(false);
    expect(hasUnsavedChanges()).toBe(true);
    expect(cloud.rows.get(test.id)?.title).toBe("ერთი");
  });
});
