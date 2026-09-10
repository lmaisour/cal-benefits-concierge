"use client";

import { sanitizeAnalyticsPayload } from "@/lib/analytics/sanitize";
import type { AnalyticsEvent, AnalyticsProps } from "@/lib/analytics/events";

type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: GtagFn;
    dataLayer?: unknown[];
  }
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (typeof window === "undefined") {
    return;
  }
  const payload = sanitizeAnalyticsPayload(event, props);
  if (!payload) {
    return;
  }
  if (typeof window.gtag !== "function") {
    return;
  }
  if (payload.props) {
    window.gtag("event", payload.event, payload.props);
    return;
  }
  window.gtag("event", payload.event);
}

