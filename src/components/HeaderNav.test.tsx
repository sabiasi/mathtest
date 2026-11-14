import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HeaderNav } from "./HeaderNav";

const state = vi.hoisted(() => ({ status: "loading", guest: false, hasTests: false }));
vi.mock("@/features/auth/AuthProvider", () => ({ useAuth: () => state }));
vi.mock("@/lib/storage/useTests", () => ({ useTests: () => state.hasTests ? [{ id: "fixture" }] : [] }));
vi.mock("@/i18n/language", () => ({ useT: () => (key: string) => key }));
vi.mock("next/navigation", () => ({ usePathname: () => "/tests" }));

let root: Root | undefined;
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("HeaderNav hydration", () => {
  for (const signedIn of [true, false]) {
    it(`hydrates when ${signedIn ? "sign-in" : "guest tests"} loads before the header boundary`, async () => {
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
      Object.assign(state, { status: "loading", guest: false, hasTests: false });
      const container = document.createElement("div");
      container.innerHTML = renderToString(<HeaderNav />);
      document.body.append(container);
      expect(container.innerHTML).toBe("");

      // The parent provider can finish loading while this Suspense boundary
      // is still waiting to hydrate. Its first client render must stay empty.
      Object.assign(state, { status: signedIn ? "signed-in" : "signed-out", guest: !signedIn, hasTests: true });
      const onRecoverableError = vi.fn();
      await act(async () => {
        root = hydrateRoot(container, <HeaderNav />, { onRecoverableError });
      });
      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(container.querySelector('a[href="/tests"]')?.getAttribute("aria-current")).toBe("page");
    });
  }
});
