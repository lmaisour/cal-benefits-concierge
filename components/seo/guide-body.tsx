const headings = new Set([
  "Overview", "What you get", "Who may qualify", "How to apply",
  "Documents", "Important notes", "FAQs", "Official source", "Related",
]);

export function safeGuideHref(value: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(value) || /^\/(?!\/)[^\s]*$/.test(value);
}

/** Render the existing plain-text publishing format without interpreting HTML. */
export function GuideBody({ body }: { body: string }) {
  const blocks = body.trim().split(/\n\s*\n/);
  return <div className="text-base leading-7 text-foreground sm:text-lg sm:leading-8">
    {blocks.map((block, index) => {
      const lines = block.split("\n");
      if (headings.has(block)) {
        return <h2 key={index} className="mb-4 mt-10 border-t border-border pt-7 font-serif text-2xl font-semibold tracking-tight first:mt-0 first:border-0 first:pt-0 sm:text-3xl">{block}</h2>;
      }
      if (lines.every((line) => /^[-•] /.test(line))) {
        return <ul key={index} className="mb-5 list-disc space-y-2 pl-6 marker:text-primary">{lines.map((line, i) => <li key={i}>{line.slice(2)}</li>)}</ul>;
      }
      if (lines.length === 2 && safeGuideHref(lines[1])) {
        return <p key={index} className="mb-5"><a className="font-semibold text-primary underline underline-offset-4" href={lines[1]}>{lines[0]}</a></p>;
      }
      return <div key={index} className="mb-5">{lines.map((line, i) => {
        if (/^[-•] /.test(line)) return <ul key={i} className="list-disc pl-6"><li>{line.slice(2)}</li></ul>;
        if (safeGuideHref(line)) return <p key={i} className="break-words"><a href={line} className="text-primary underline underline-offset-4">{line}</a></p>;
        if (/^\d+\. .*\?$/.test(line)) return <h3 key={i} className="mb-2 mt-6 text-lg font-semibold">{line.replace(/^\d+\. /, "")}</h3>;
        return <p key={i}>{line}</p>;
      })}</div>;
    })}
  </div>;
}
