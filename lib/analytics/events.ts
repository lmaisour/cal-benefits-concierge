export const ANALYTICS_EVENTS = [
  "homepage_check_clicked",
  "featured_program_clicked",
  "browse_programs_clicked",
  "questionnaire_started",
  "question_answered",
  "questionnaire_completed",
  "results_viewed",
  "program_viewed",
  "official_application_clicked",
  "guide_viewed",
  "guide_program_clicked",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

export const ANALYTICS_PROP_KEYS = [
  "program_slug",
  "guide_slug",
  "step_id",
  "link_kind",
] as const;

export type AnalyticsPropKey = (typeof ANALYTICS_PROP_KEYS)[number];

export type AnalyticsProps = Partial<Record<AnalyticsPropKey, string>>;

export const BLOCKED_ANALYTICS_KEYS = [
  "zip",
  "income",
  "household_income",
  "household_size",
  "disability",
  "veteran",
  "utilities",
  "electric_utility",
  "gas_utility",
  "profile",
  "answer",
  "answers",
  "questionnaire",
  "household",
] as const;
