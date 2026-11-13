import { describe, expect, it } from "vitest";
import { parseSchoolRequest } from "./schoolRequest";

const valid = { contact_name: " Nino  Beridze ", school_name: "Tbilisi Public School 1", email: "nino@school.ge" };

describe("parseSchoolRequest", () => {
  it("cleans a valid request", () => {
    expect(parseSchoolRequest({ ...valid, teachers: "25", message: "Hello\nthere", language: "en" })).toEqual({
      contact_name: "Nino Beridze",
      school_name: "Tbilisi Public School 1",
      city: "",
      teachers: 25,
      email: "nino@school.ge",
      phone: "",
      message: "Hello\nthere",
      language: "en",
    });
  });

  it("refuses a missing name, school or a wrong email", () => {
    expect(parseSchoolRequest(null)).toBeNull();
    expect(parseSchoolRequest({ ...valid, contact_name: " " })).toBeNull();
    expect(parseSchoolRequest({ ...valid, school_name: "" })).toBeNull();
    expect(parseSchoolRequest({ ...valid, email: "nino.school.ge" })).toBeNull();
  });

  it("ignores odd numbers of teachers and cuts very long text", () => {
    expect(parseSchoolRequest({ ...valid, teachers: -3 })?.teachers).toBeNull();
    expect(parseSchoolRequest({ ...valid, teachers: "lots" })?.teachers).toBeNull();
    expect(parseSchoolRequest({ ...valid, message: "x".repeat(5000) })?.message).toHaveLength(3000);
    expect(parseSchoolRequest({ ...valid, language: "fr" })?.language).toBe("ka");
  });
});
