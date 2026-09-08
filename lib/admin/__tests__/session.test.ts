import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  passwordMatches,
  verifySessionToken,
} from "@/lib/admin/session";

const SECRET = "test-admin-password";

describe("admin session helpers", () => {
  it("accepts the correct password and rejects others", () => {
    expect(passwordMatches(SECRET, SECRET)).toBe(true);
    expect(passwordMatches("wrong", SECRET)).toBe(false);
    expect(passwordMatches("", SECRET)).toBe(false);
    expect(passwordMatches(SECRET, `${SECRET}x`)).toBe(false);
  });

  it("creates a token that verifies with the same secret", () => {
    const now = 1_700_000_000_000;
    const token = createSessionToken(SECRET, now, 60_000);
    expect(verifySessionToken(token, SECRET, now)).toBe(true);
    expect(verifySessionToken(token, SECRET, now + 59_000)).toBe(true);
  });

  it("rejects expired, missing, and tampered tokens", () => {
    const now = 1_700_000_000_000;
    const token = createSessionToken(SECRET, now, 60_000);

    expect(verifySessionToken(token, SECRET, now + 60_000)).toBe(false);
    expect(verifySessionToken(undefined, SECRET, now)).toBe(false);
    expect(verifySessionToken("", SECRET, now)).toBe(false);
    expect(verifySessionToken("not-a-token", SECRET, now)).toBe(false);
    expect(verifySessionToken(token, "other-secret", now)).toBe(false);

    const parts = token.split(".");
    parts[2] = "0".repeat(parts[2].length);
    expect(verifySessionToken(parts.join("."), SECRET, now)).toBe(false);

    const longExpiry = token.split(".");
    longExpiry[1] = String(now + 999_999_999);
    expect(verifySessionToken(longExpiry.join("."), SECRET, now)).toBe(false);
  });
});
