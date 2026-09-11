/** Shared comparison table. Render only when structured column/row data exists. */
export type ProgramFactTableRow = {
  heading: string;
  values: string[];
};

export function ProgramFactTable({
  caption,
  columns,
  rows,
}: {
  caption?: string;
  columns: string[];
  rows: ProgramFactTableRow[];
}) {
  if (columns.length === 0 || rows.length === 0) {
    return null;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="min-w-full border-collapse text-left text-sm sm:text-base">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-hero">
          <tr>
            <th scope="col" className="px-4 py-3 font-semibold text-foreground">
              {"\u00a0"}
            </th>
            {columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="px-4 py-3 font-semibold text-foreground"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.heading} className="border-t border-border">
              <th scope="row" className="px-4 py-3 font-medium text-muted-foreground">
                {row.heading}
              </th>
              {columns.map((column, index) => (
                <td key={`${row.heading}-${column}`} className="px-4 py-3 text-foreground">
                  {row.values[index] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
