// @vitest-environment node
import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/i18n/dictionaries";
import { EMAIL_KINDS, renderEmail, type EmailData } from "./templates";

const data: EmailData = {
  siteUrl: "https://mathtest.example",
  date: "15 დეკემბერი 2026",
  amount: "15 ₾",
  plan: "Premium",
  receiptNumber: "MT-000042",
  school: "51-ე საჯარო სკოლა",
  inviter: "ნინო",
};

describe("email templates", () => {
  it.each(EMAIL_KINDS.flatMap((kind) => LANGUAGES.map((language) => [kind, language] as const)))("%s (%s) is complete", (kind, language) => {
    const email = renderEmail(kind, language, data);
    expect(email.subject.length).toBeGreaterThan(5);
    expect(email.text.length).toBeGreaterThan(40);
    // Every placeholder was filled in.
    for (const part of [email.subject, email.text, email.html]) expect(part).not.toMatch(/\{\w+\}/);
    // A link back to our site, in both versions.
    expect(email.text).toContain("https://mathtest.example/");
    expect(email.html).toContain('href="https://mathtest.example/');
    expect(email.html).toContain(`<html lang="${language}">`);
  });

  it("Georgian emails are in Georgian, English ones in English", () => {
    for (const kind of EMAIL_KINDS) {
      expect(renderEmail(kind, "ka", data).subject, kind).toMatch(/[ა-ჰ]/);
      expect(renderEmail(kind, "en", { ...data, date: "15 Dec 2026", school: "School 51", inviter: "Nino" }).text, kind).not.toMatch(/[ა-ჰ]/);
    }
  });

  it("the receipt email carries the amount, the receipt number and its link", () => {
    const email = renderEmail("paymentReceived", "en", { ...data, link: "https://mathtest.example/billing/receipt/abc" });
    expect(email.subject).toBe("Payment received — receipt no. MT-000042");
    expect(email.text).toContain("15 ₾");
    expect(email.text).toContain("https://mathtest.example/billing/receipt/abc");
    expect(email.html).toContain('href="https://mathtest.example/billing/receipt/abc"');
  });

  it("the failed-payment email links to the place to fix it", () => {
    for (const kind of ["paymentFailed", "graceEnding"] as const) {
      expect(renderEmail(kind, "ka", data).text).toContain("https://mathtest.example/settings#plan");
    }
  });

  it("text from people is escaped in the HTML version", () => {
    const email = renderEmail("schoolInvite", "en", { ...data, school: `<script>alert("x")</script>`, inviter: "A & B" });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("A &amp; B");
    expect(email.text).toContain("A & B"); // plain text stays as written
  });

  it("never promises that a plan ending deletes anything", () => {
    for (const language of LANGUAGES) {
      const text = renderEmail("planEnded", language, data).text;
      expect(text).toMatch(language === "ka" ? /არაფერი წაშლილა/ : /Nothing was deleted/);
    }
  });
});
