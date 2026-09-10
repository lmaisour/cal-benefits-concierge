"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics/track";
import type { AnalyticsEvent, AnalyticsProps } from "@/lib/analytics/events";

export function TrackView({
  event,
  props,
}: {
  event: AnalyticsEvent;
  props?: AnalyticsProps;
}) {
  const programSlug = props?.program_slug ?? "";
  const guideSlug = props?.guide_slug ?? "";
  const stepId = props?.step_id ?? "";
  const linkKind = props?.link_kind ?? "";

  useEffect(() => {
    const nextProps: AnalyticsProps = {};
    if (programSlug) nextProps.program_slug = programSlug;
    if (guideSlug) nextProps.guide_slug = guideSlug;
    if (stepId) nextProps.step_id = stepId;
    if (linkKind) nextProps.link_kind = linkKind;
    track(event, Object.keys(nextProps).length > 0 ? nextProps : undefined);
  }, [event, programSlug, guideSlug, stepId, linkKind]);
  return null;
}
