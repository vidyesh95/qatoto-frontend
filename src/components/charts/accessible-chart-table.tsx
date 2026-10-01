export interface AccessibleChartTableRow {
  readonly key: string;
  readonly label: string;
  readonly cells: readonly (string | number)[];
}

export interface AccessibleChartTableProps {
  readonly caption: string;
  readonly rowHeaderColumnLabel: string;
  readonly valueColumnLabels: readonly string[];
  readonly tableRows: readonly AccessibleChartTableRow[];
}

export function AccessibleChartTable({
  caption,
  rowHeaderColumnLabel,
  valueColumnLabels,
  tableRows,
}: AccessibleChartTableProps) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{rowHeaderColumnLabel}</th>
          {valueColumnLabels.map((columnLabel) => (
            <th key={columnLabel} scope="col">
              {columnLabel}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {tableRows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.label}</th>
            {row.cells.map((cell, cellIndex) => (
              <td key={`${row.key}-${valueColumnLabels[cellIndex] ?? String(cellIndex)}`}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
