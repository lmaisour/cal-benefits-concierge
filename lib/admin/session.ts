import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "cbf_admin_session";
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
export const ADMIN_SESSION_COOKIE_PATH = "/admin";

const TOKEN_VERSION = "v1";

export function passwordMatches(provided: string, expected: string): boolean {
  const left = createHash("sha256").update(provided).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function createSessionToken(
  secret: string,
  nowMs = Date.now(),
  ttlMs = ADMIN_SESSION_TTL_MS,
): string {
  const expiresAtMs = nowMs + ttlMs;
  const payload = `${TOKEN_VERSION}.${expiresAtMs}`;
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

export function verifySessionToken(
  token: string | undefined,
  secret: string,
  nowMs = Date.now(),
): boolean {
  if (!token || !secret) {
    return false;
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return false;
  }

  const [version, expiresRaw, signature] = parts;
  if (version !== TOKEN_VERSION || !expiresRaw || !signature) {
    return false;
  }

  const expiresAtMs = Number(expiresRaw);
  if (!Number.isInteger(expiresAtMs) || expiresAtMs <= nowMs) {
    return false;
  }

  const expected = sign(`${version}.${expiresRaw}`, secret);
  const actualBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(actualBuf, expectedBuf);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}
