import type { ProgramDirectoryQuery } from "@/lib/programs/filter-programs";

export function DirectoryQueryFields({
  query,
  omit,
}: {
  query: ProgramDirectoryQuery;
  omit: Array<keyof ProgramDirectoryQuery>;
}) {
  const skip = new Set(omit);
  return (
    <>
      {!skip.has("zip") && query.zip ? <input type="hidden" name="zip" value={query.zip} /> : null}
      {!skip.has("query") && query.query ? <input type="hidden" name="q" value={query.query} /> : null}
      {!skip.has("category") && query.category ? (
        <input type="hidden" name="category" value={query.category} />
      ) : null}
      {!skip.has("benefitType") && query.benefitType ? (
        <input type="hidden" name="benefit" value={query.benefitType} />
      ) : null}
      {!skip.has("status") && query.status ? (
        <input type="hidden" name="status" value={query.status} />
      ) : null}
      {!skip.has("sort") && query.sort && query.sort !== "verified" ? (
        <input type="hidden" name="sort" value={query.sort} />
      ) : null}
    </>
  );
}
