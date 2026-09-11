/** Reusable process steps renderer API. Do not invent steps from how_to_apply prose. */
export type ProcessTimelineStep = {
  title: string;
  detail?: string;
};

export function processTimelineSteps(
  steps: ProcessTimelineStep[] | null | undefined,
): ProcessTimelineStep[] | null {
  if (!steps || steps.length === 0) {
    return null;
  }
  const usable = steps
    .map((step) => ({
      title: step.title.trim(),
      detail: step.detail?.trim() ? step.detail.trim() : undefined,
    }))
    .filter((step) => step.title.length > 0);
  return usable.length > 0 ? usable : null;
}
