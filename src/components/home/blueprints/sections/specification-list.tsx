// TRANSPORT: props-only — the rows arrive already built from whichever detail page rendered them.

/**
 * One specification row.
 *
 * A ROW WITH NO VALUE DOES NOT RENDER. An absent CAD format or an uncosted bill of materials is
 * an absence, and printing "—" against a label invents a fact the publisher never stated. The
 * caller filters before mapping rather than this returning `null`, so the list never contains a
 * gap it has to style around.
 *
 * HOISTED out of `blueprint-detail-page.tsx` when that page split three ways. All three detail
 * layouts render a spec list, and they must agree about what an absence looks like.
 */
export interface SpecificationRow {
  readonly label: string;
  readonly value: string;
}

export default function SpecificationList({
  specifications,
  className = "mt-6 max-w-md",
}: {
  readonly specifications: readonly SpecificationRow[];
  readonly className?: string;
}) {
  if (specifications.length === 0) return null;

  return (
    <dl className={className}>
      {specifications.map((specification) => (
        <div key={specification.label} className="border-t border-black/5 py-2">
          <dt className="text-[11px] tracking-[0.5px] text-[#6F7979] uppercase">
            {specification.label}
          </dt>
          <dd className="mt-0.5 text-sm text-foreground">{specification.value}</dd>
        </div>
      ))}
    </dl>
  );
}
