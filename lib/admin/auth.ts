import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAdminPassword } from "@/lib/supabase/env";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_COOKIE_PATH,
  ADMIN_SESSION_TTL_MS,
  createSessionToken,
  passwordMatches,
  verifySessionToken,
} from "@/lib/admin/session";

export function adminPasswordConfigured(): boolean {
  return getAdminPassword() !== null;
}

export async function hasAdminSession(): Promise<boolean> {
  const password = getAdminPassword();
  if (!password) {
    return false;
  }
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_SESSION_COOKIE)?.value, password);
}

export async function requireAdminSession(): Promise<void> {
  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }
}

export function verifyAdminPassword(provided: string): boolean {
  const expected = getAdminPassword();
  if (!expected) {
    return false;
  }
  return passwordMatches(provided, expected);
}

export async function createAdminSession(): Promise<void> {
  const password = getAdminPassword();
  if (!password) {
    throw new Error("ADMIN_PASSWORD is not configured.");
  }
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, createSessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_SESSION_COOKIE_PATH,
    maxAge: Math.floor(ADMIN_SESSION_TTL_MS / 1000),
  });
}

export async function destroyAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_SESSION_COOKIE_PATH,
    maxAge: 0,
  });
}
