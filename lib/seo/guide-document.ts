export const GUIDE_SECTION_HEADINGS = [
  "Overview",
  "What you get",
  "Who may qualify",
  "How to apply",
  "Documents",
  "Important notes",
  "FAQs",
  "Official source",
  "Related",
] as const;

export type GuideSectionHeading = (typeof GUIDE_SECTION_HEADINGS)[number];

const HEADING_SET = new Set<string>(GUIDE_SECTION_HEADINGS);

export type GuideLink = {
  label: string;
  href: string;
};

export type GuideBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "links"; items: GuideLink[] }
  | { type: "faq"; question: string; answer: GuideBlock[] };

export type GuideSection = {
  heading: GuideSectionHeading | "";
  blocks: GuideBlock[];
};

export type ParsedGuideBody = {
  sections: GuideSection[];
  overviewParagraphs: string[];
  benefitSummary: string | null;
  eligibilityItems: string[];
  approvalWarning: string | null;
  officialCta: GuideLink | null;
  officialSources: GuideLink[];
  relatedLinks: GuideLink[];
};

const APPROVAL_WARNING =
  /\b(approval is required before|apply and receive approval before|apply before (purchasing|buying|leasing)|incentive is not retroactive)\b/i;

export function safeGuideHref(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value) || /^\/(?!\/)[^\s]*$/.test(value);
}

export function isInternalStatusCopy(value: string): boolean {
  return /\b(program status in our records|listed as active\b|structured catalog|not fully modeled)\b/i.test(
    value,
  );
}

export function consumerHeroSummary(
  excerpt: string | null | undefined,
  parsed: ParsedGuideBody,
): string {
  const cleaned = (excerpt ?? "")
    .replace(/\s*Program status in our records:[^.]*\./gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned && !isInternalStatusCopy(cleaned)) {
    return cleaned;
  }
  return parsed.overviewParagraphs[0] ?? cleaned;
}

export function descriptiveLinkLabel(href: string, provided?: string): string {
  const label = provided?.trim() ?? "";
  if (label && !looksLikeExposedPath(label)) {
    return label;
  }
  if (href.startsWith("/programs/") && href !== "/programs") {
    return "Program details";
  }
  if (href === "/programs") {
    return "Browse programs";
  }
  if (href === "/check") {
    return "Check what you may qualify for";
  }
  if (href === "/guides") {
    return "Guides";
  }
  try {
    if (/^https?:\/\//i.test(href)) {
      const url = new URL(href);
      return url.hostname.replace(/^www\./, "");
    }
  } catch {
    /* fall through */
  }
  return "Official source";
}

function looksLikeExposedPath(value: string): boolean {
  return /^\/[a-z0-9/_-]+$/i.test(value.trim()) || /^https?:\/\/\S+$/i.test(value.trim());
}

export function parseGuideBody(body: string): ParsedGuideBody {
  const sections = splitSections(body);
  const parsedSections = sections.map((section) => ({
    heading: section.heading,
    blocks:
      section.heading === "FAQs"
        ? parseFaqBlocks(section.lines)
        : parseBlocks(section.lines),
  }));

  const byHeading = new Map<string, GuideSection>();
  for (const section of parsedSections) {
    if (section.heading) {
      byHeading.set(section.heading, section);
    }
  }

  const overview = byHeading.get("Overview");
  const benefit = byHeading.get("What you get");
  const qualify = byHeading.get("Who may qualify");
  const apply = byHeading.get("How to apply");
  const official = byHeading.get("Official source");
  const related = byHeading.get("Related");

  const officialLinks = [
    ...linksFromBlocks(official?.blocks ?? []),
    ...linksFromBlocks(apply?.blocks ?? []),
  ];
  const officialCta =
    officialLinks.find((item) => /^https?:\/\//i.test(item.href)) ??
    officialLinks[0] ??
    null;
  const officialSources = uniqueLinks(
    officialLinks.filter((item) => item.href !== officialCta?.href),
  );

  return {
    sections: parsedSections.filter(
      (section) => section.heading !== "" || section.blocks.length > 0,
    ),
    overviewParagraphs: paragraphsFrom(overview?.blocks ?? []),
    benefitSummary: firstSummary(benefit?.blocks ?? []),
    eligibilityItems: listItemsFrom(qualify?.blocks ?? []).slice(0, 6),
    approvalWarning: findApprovalWarning([
      ...(apply?.blocks ?? []),
      ...(qualify?.blocks ?? []),
      ...(overview?.blocks ?? []),
    ]),
    officialCta: officialCta
      ? { ...officialCta, label: descriptiveLinkLabel(officialCta.href, officialCta.label) }
      : null,
    officialSources: officialSources.map((item) => ({
      ...item,
      label: descriptiveLinkLabel(item.href, item.label),
    })),
    relatedLinks: uniqueLinks(linksFromBlocks(related?.blocks ?? [])).map((item) => ({
      ...item,
      label: descriptiveLinkLabel(item.href, item.label),
    })),
  };
}

function splitSections(
  body: string,
): Array<{ heading: GuideSectionHeading | ""; lines: string[] }> {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const sections: Array<{ heading: GuideSectionHeading | ""; lines: string[] }> = [];
  let current: { heading: GuideSectionHeading | ""; lines: string[] } = {
    heading: "",
    lines: [],
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (HEADING_SET.has(trimmed)) {
      if (current.heading || current.lines.some((item) => item.trim())) {
        sections.push(current);
      }
      current = { heading: trimmed as GuideSectionHeading, lines: [] };
      continue;
    }
    current.lines.push(line);
  }
  if (current.heading || current.lines.some((item) => item.trim())) {
    sections.push(current);
  }
  return sections;
}

export function parseBlocks(lines: string[]): GuideBlock[] {
  const blocks: GuideBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isBullet(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && isBullet((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().replace(/^[-•] /, ""));
        index += 1;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (isNumberedStep(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && isNumberedStep((lines[index] ?? "").trim())) {
        items.push((lines[index] ?? "").trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const next = (lines[index + 1] ?? "").trim();
    if (!safeGuideHref(trimmed) && safeGuideHref(next)) {
      const items: GuideLink[] = [];
      while (index < lines.length) {
        const label = (lines[index] ?? "").trim();
        const href = (lines[index + 1] ?? "").trim();
        if (!label || safeGuideHref(label) || !safeGuideHref(href)) {
          break;
        }
        items.push({
          label: descriptiveLinkLabel(href, label),
          href,
        });
        index += 2;
        while (index < lines.length && !(lines[index] ?? "").trim()) {
          index += 1;
        }
      }
      if (items.length > 0) {
        blocks.push({ type: "links", items });
        continue;
      }
    }

    if (safeGuideHref(trimmed)) {
      blocks.push({
        type: "links",
        items: [{ label: descriptiveLinkLabel(trimmed), href: trimmed }],
      });
      index += 1;
      continue;
    }

    blocks.push({ type: "paragraph", text: trimmed });
    index += 1;
  }

  return mergeAdjacent(blocks);
}

function parseFaqBlocks(lines: string[]): GuideBlock[] {
  const blocks: GuideBlock[] = [];
  let index = 0;
  while (index < lines.length) {
    const trimmed = (lines[index] ?? "").trim();
    if (!trimmed) {
      index += 1;
      continue;
    }
    if (/^\d+\.\s+.+\?$/.test(trimmed)) {
      const question = trimmed.replace(/^\d+\.\s+/, "");
      index += 1;
      const answerLines: string[] = [];
      while (index < lines.length) {
        const next = (lines[index] ?? "").trim();
        if (/^\d+\.\s+.+\?$/.test(next)) {
          break;
        }
        answerLines.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({
        type: "faq",
        question,
        answer: parseBlocks(answerLines),
      });
      continue;
    }
    for (const block of parseBlocks([trimmed])) {
      blocks.push(block);
    }
    index += 1;
  }
  return blocks;
}

function mergeAdjacent(blocks: GuideBlock[]): GuideBlock[] {
  const merged: GuideBlock[] = [];
  for (const block of blocks) {
    const previous = merged[merged.length - 1];
    if (
      block.type === "list" &&
      previous?.type === "list" &&
      previous.ordered === block.ordered
    ) {
      previous.items.push(...block.items);
      continue;
    }
    if (block.type === "links" && previous?.type === "links") {
      previous.items.push(...block.items);
      continue;
    }
    merged.push(block);
  }
  return merged;
}

function isBullet(value: string): boolean {
  return /^[-•] /.test(value);
}

function isNumberedStep(value: string): boolean {
  return /^\d+\.\s+/.test(value) && !/^\d+\.\s+.+\?$/.test(value);
}

function linksFromBlocks(blocks: GuideBlock[]): GuideLink[] {
  const links: GuideLink[] = [];
  for (const block of blocks) {
    if (block.type === "links") {
      links.push(...block.items);
    }
    if (block.type === "faq") {
      links.push(...linksFromBlocks(block.answer));
    }
  }
  return links;
}

function uniqueLinks(links: GuideLink[]): GuideLink[] {
  const seen = new Set<string>();
  const unique: GuideLink[] = [];
  for (const link of links) {
    if (seen.has(link.href)) {
      continue;
    }
    seen.add(link.href);
    unique.push(link);
  }
  return unique;
}

function paragraphsFrom(blocks: GuideBlock[]): string[] {
  return blocks
    .filter((block): block is Extract<GuideBlock, { type: "paragraph" }> => block.type === "paragraph")
    .map((block) => block.text)
    .filter(Boolean);
}

function listItemsFrom(blocks: GuideBlock[]): string[] {
  return blocks.flatMap((block) => (block.type === "list" ? block.items : []));
}

function firstSummary(blocks: GuideBlock[]): string | null {
  const paragraph = paragraphsFrom(blocks)[0];
  if (paragraph) {
    return paragraph;
  }
  const items = listItemsFrom(blocks);
  return items[0] ?? null;
}

function findApprovalWarning(blocks: GuideBlock[]): string | null {
  for (const block of blocks) {
    if (block.type === "paragraph" && APPROVAL_WARNING.test(block.text)) {
      return block.text;
    }
    if (block.type === "list") {
      const match = block.items.find((item) => APPROVAL_WARNING.test(item));
      if (match) {
        return match;
      }
    }
    if (block.type === "faq") {
      const nested = findApprovalWarning(block.answer);
      if (nested) {
        return nested;
      }
    }
  }
  return null;
}
