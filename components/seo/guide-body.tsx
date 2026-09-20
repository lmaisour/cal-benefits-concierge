import type { ReactNode } from "react";
import {
  parseBlocks,
  parseGuideBody,
  safeGuideHref,
  type GuideBlock,
} from "@/lib/seo/guide-document";

export { safeGuideHref, parseGuideBody };

const bodyClassName =
  "text-base leading-7 text-foreground sm:text-lg sm:leading-8";

const headingClassName =
  "mb-4 mt-10 border-t border-border pt-7 font-serif text-2xl font-semibold tracking-tight first:mt-0 first:border-0 first:pt-0 sm:text-3xl";

const linkClassName =
  "rounded-sm font-semibold text-primary underline underline-offset-4 break-words focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export function GuideBody({ body }: { body: string }) {
  const parsed = parseGuideBody(body);
  return (
    <div className={bodyClassName}>
      {parsed.sections.map((section, index) => (
        <section key={`${section.heading}-${index}`}>
          {section.heading ? <h2 className={headingClassName}>{section.heading}</h2> : null}
          <GuideBlocks blocks={section.blocks} />
        </section>
      ))}
    </div>
  );
}

export function GuideBlocks({ blocks }: { blocks: GuideBlock[] }) {
  return (
    <>
      {blocks.map((block, index) => (
        <GuideBlockView key={index} block={block} />
      ))}
    </>
  );
}

function GuideBlockView({ block }: { block: GuideBlock }) {
  if (block.type === "paragraph") {
    return <p className="mb-5">{block.text}</p>;
  }
  if (block.type === "list") {
    const ListTag = block.ordered ? "ol" : "ul";
    return (
      <ListTag
        className={
          block.ordered
            ? "mb-5 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-primary"
            : "mb-5 list-disc space-y-2 pl-6 marker:text-primary"
        }
      >
        {block.items.map((item) => (
          <li key={item}>{renderInlineLinks(item)}</li>
        ))}
      </ListTag>
    );
  }
  if (block.type === "links") {
    if (block.items.length === 1) {
      const item = block.items[0];
      return (
        <p className="mb-5">
          <GuideHref href={item.href}>{item.label}</GuideHref>
        </p>
      );
    }
    return (
      <ul className="mb-5 list-none space-y-2 pl-0">
        {block.items.map((item) => (
          <li key={item.href}>
            <GuideHref href={item.href}>{item.label}</GuideHref>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="mb-6">
      <h3 className="mb-2 mt-6 text-lg font-semibold">{block.question}</h3>
      <GuideBlocks blocks={block.answer.length > 0 ? block.answer : parseBlocks([])} />
    </div>
  );
}

function GuideHref({ href, children }: { href: string; children: ReactNode }) {
  if (!safeGuideHref(href)) {
    return <span>{children}</span>;
  }
  const external = /^https?:\/\//i.test(href);
  return (
    <a
      className={linkClassName}
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}

function renderInlineLinks(text: string): ReactNode {
  const match = text.match(/^(.*?)(https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/);
  if (!match) {
    return text;
  }
  const [, prefix, href] = match;
  if (!href || !safeGuideHref(href)) {
    return text;
  }
  return (
    <>
      {prefix}
      <GuideHref href={href}>{href.startsWith("/") ? "Open page" : href}</GuideHref>
    </>
  );
}
