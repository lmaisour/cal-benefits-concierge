export const CONSUMER_HEADLINE_MAX = 80;
export const ADMINISTRATOR_DISPLAY_NAME_MAX = 60;
export const AUDIENCE_TAG_MAX_COUNT = 6;
export const AUDIENCE_TAG_MAX_LENGTH = 32;

export type ProgramPresentationSource = {
  name: string;
  administrator?: string | null;
  consumer_headline?: string | null;
  consumerHeadline?: string | null;
  administrator_display_name?: string | null;
  administratorDisplayName?: string | null;
  audience_tags?: string[] | null;
  audienceTags?: string[] | null;
};

export type ProgramPresentation = {
  primaryTitle: string;
  officialName: string;
  showOfficialSubtitle: boolean;
  administratorLabel: string | null;
  administratorByline: string | null;
  tags: string[];
};

export function cleanOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function sanitizeAudienceTags(value: string[] | null | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const tag = item.trim().replace(/\s+/g, " ");
    if (!tag) {
      continue;
    }
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tags.push(tag);
  }
  return tags;
}

export function normalizeAudienceTags(value: string[] | null | undefined): string[] {
  return sanitizeAudienceTags(value).slice(0, AUDIENCE_TAG_MAX_COUNT);
}

export function parseAudienceTagsInput(raw: string): string[] {
  return sanitizeAudienceTags(
    raw
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

export function programPresentation(source: ProgramPresentationSource): ProgramPresentation {
  const officialName = source.name;
  const headline = cleanOptionalText(source.consumer_headline ?? source.consumerHeadline);
  const administratorLabel =
    cleanOptionalText(
      source.administrator_display_name ?? source.administratorDisplayName,
    ) ?? cleanOptionalText(source.administrator);
  return {
    primaryTitle: headline ?? officialName,
    officialName,
    showOfficialSubtitle: headline !== null,
    administratorLabel,
    administratorByline: administratorLabel ? `by ${administratorLabel}` : null,
    tags: normalizeAudienceTags(source.audience_tags ?? source.audienceTags),
  };
}
