import { beforeEach, expect, it, vi } from "vitest";
import { normalizeTest } from "./storage/migrate";
import { STORAGE_KEY, readLocalTests } from "./storage/localTests";
import { moveGuestTestsIntoAccount } from "./onboarding";

const mocks = vi.hoisted(() => ({ images: vi.fn(), removeImages: vi.fn(), imported: vi.fn(), saved: vi.fn() }));
vi.mock("./images/imageStore", () => ({ moveDeviceImagesToAccount: mocks.images, removeDeviceImages: mocks.removeImages }));
vi.mock("./storage/testsRepository", () => ({ importTests: mocks.imported, waitUntilSaved: mocks.saved }));
const math = normalizeTest({ id: "m", subjectId: "math", title: "Math", questions: [] })!;
const physics = normalizeTest({ id: "p", subjectId: "physics", title: "Physics", questions: [] })!;

beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([math, physics]));
  mocks.images.mockResolvedValue(undefined);
  mocks.removeImages.mockResolvedValue(undefined);
  mocks.imported.mockImplementation((tests) => tests);
  mocks.saved.mockResolvedValue(true);
});

it("imports only allowed subjects and preserves the other tests and their pictures locally", async () => {
  expect(await moveGuestTestsIntoAccount(["math"])).toBe(1);
  expect(mocks.imported).toHaveBeenCalledWith([math]);
  expect(readLocalTests()).toEqual([physics]);
  expect(mocks.removeImages).toHaveBeenCalledWith([math], [physics]);
});
it("does not remove guest work when confirmed image upload fails", async () => {
  mocks.images.mockRejectedValue(new Error("offline"));
  await expect(moveGuestTestsIntoAccount(["math"])).rejects.toThrow("offline");
  expect(mocks.imported).not.toHaveBeenCalled();
  expect(readLocalTests()).toHaveLength(2);
  expect(mocks.removeImages).not.toHaveBeenCalled();
});
it("does not remove guest work when the account changes during test saving", async () => {
  mocks.saved.mockResolvedValue(false);
  expect(await moveGuestTestsIntoAccount(["math"])).toBe(0);
  expect(readLocalTests()).toHaveLength(2);
});
it("does not import into a new account after a session switch during image upload", async () => {
  let current = true;
  mocks.images.mockImplementation(async () => { current = false; });
  expect(await moveGuestTestsIntoAccount(["math"], () => current)).toBe(0);
  expect(mocks.imported).not.toHaveBeenCalled();
  expect(readLocalTests()).toHaveLength(2);
});
it("does not overwrite a guest test edited in another tab during migration", async () => {
  mocks.saved.mockImplementation(async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ ...math, updatedAt: "2099-01-01T00:00:00Z" }, physics]));
    return true;
  });
  await moveGuestTestsIntoAccount(["math"]);
  expect(readLocalTests()).toHaveLength(2);
  expect(mocks.removeImages.mock.calls[0][1]).toHaveLength(2);
});
