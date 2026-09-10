import {
  ANALYTICS_EVENTS,
  ANALYTICS_PROP_KEYS,
  BLOCKED_ANALYTICS_KEYS,
  type AnalyticsEvent,
  type AnalyticsProps,
} from "@/lib/analytics/events";

const MAX_VALUE_LENGTH = 80;
const ALLOWED_EVENT_SET = new Set<string>(ANALYTICS_EVENTS);
const ALLOWED_PROP_SET = new Set<string>(ANALYTICS_PROP_KEYS);
const BLOCKED_KEY_SET = new Set<string>(BLOCKED_ANALYTICS_KEYS);

export type SanitizedAnalyticsPayload = {
  event: AnalyticsEvent;
  props?: AnalyticsProps;
};

export function isAnalyticsEvent(value: string): value is AnalyticsEvent {
  return ALLOWED_EVENT_SET.has(value);
}

export function sanitizeAnalyticsPayload(
  event: string,
  props?: Record<string, unknown>,
): SanitizedAnalyticsPayload | null {
  if (!isAnalyticsEvent(event)) {
    return null;
  }

  if (!props) {
    return { event };
  }

  const sanitized: AnalyticsProps = {};
  for (const [rawKey, rawValue] of Object.entries(props)) {
    const key = rawKey.trim();
    if (BLOCKED_KEY_SET.has(key) || !ALLOWED_PROP_SET.has(key)) {
      continue;
    }
    if (typeof rawValue !== "string") {
      continue;
    }
    const value = rawValue.trim().slice(0, MAX_VALUE_LENGTH);
    if (!value) {
      continue;
    }
    sanitized[key as keyof AnalyticsProps] = value;
  }

  return Object.keys(sanitized).length > 0 ? { event, props: sanitized } : { event };
}
