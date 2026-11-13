import { describe, expect, it } from "vitest";
import { authErrorKey, looksLikeEmail } from "./errors";

describe("authErrorKey", () => {
  it("knows the common Supabase errors", () => {
    expect(authErrorKey({ code: "invalid_credentials" })).toBe("authError.invalidCredentials");
    expect(authErrorKey({ code: "user_already_exists" })).toBe("authError.alreadyExists");
    expect(authErrorKey({ code: "weak_password" })).toBe("authError.weakPassword");
    expect(authErrorKey({ code: "over_email_send_rate_limit" })).toBe("authError.tooManyEmails");
  });
  it("recognises network problems", () => {
    expect(authErrorKey({ name: "AuthRetryableFetchError", message: "Failed to fetch" })).toBe("authError.network");
    expect(authErrorKey({ message: "TypeError: Failed to fetch" })).toBe("authError.network");
  });
  it("falls back to a general message", () => {
    expect(authErrorKey({ code: "something_new" })).toBe("authError.unknown");
    expect(authErrorKey(null)).toBe("authError.unknown");
  });
});

describe("looksLikeEmail", () => {
  it("accepts normal addresses and rejects obvious typos", () => {
    expect(looksLikeEmail("nino@school.ge")).toBe(true);
    expect(looksLikeEmail(" nino@school.ge ")).toBe(true);
    for (const bad of ["nino", "nino@", "nino@school", "@school.ge", "ni no@school.ge"]) expect(looksLikeEmail(bad)).toBe(false);
  });
});
