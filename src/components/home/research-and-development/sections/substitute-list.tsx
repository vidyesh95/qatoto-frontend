// TRANSPORT: props-only — presentational. Fetches nothing.

import Link from "next/link";

import type { DomesticSubstitute } from "@/lib/rnd/import-intelligence.schemas";
import {
  DOMESTIC_SUBSTITUTE_KIND_LABELS,
  DOMESTIC_SUBSTITUTE_MATURITY_LABELS,
} from "@/lib/rnd/labels";

/** How proven a substitute is, as a badge. Ordered darkest-at-most-proven. */
const MATURITY_BADGE_CLASSES: Record<string, string> = {
  lab_scale: "bg-muted text-muted-foreground",
  pilot_scale: "bg-muted text-muted-foreground",
  commercial: "bg-[#00696E]/10 text-[#00696E]",
  mature: "bg-[#00696E]/20 text-[#00696E]",
};

/**
 * What could be made domestically instead of importing this.
 *
 * ⚠️ A SUBSTITUTE WITH NO SUPPLIER CAPABILITY IS SHOWN, AND SAYS SO. A null
 * `supplierCapabilitySlug` means no capability in the curated go-to-market vocabulary
 * covers it yet — a real finding about the supply base, not a gap in the row. Hiding those
 * rows would make the surface look like substitution is better covered than it is.
 *
 * An EMPTY list is the ordinary case for most commodities and is not a failure. It is also
 * the most actionable state on the page, so it links to where a moderator can fix it.
 */
export default function SubstituteList({
  substitutes,
}: {
  substitutes: readonly DomesticSubstitute[];
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-lg">Domestic substitutes</h2>

      {substitutes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nobody has published a domestic substitute for this commodity yet. Substitutes are
          curated, so an empty list means nothing has been recorded — not that no substitute exists.
        </p>
      ) : (
        <ul className="space-y-3">
          {substitutes.map((substitute) => (
            <li
              key={substitute.id}
              className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="text-sm font-medium">{substitute.substituteLabel}</p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                    MATURITY_BADGE_CLASSES[substitute.maturityLevel] ?? "bg-muted"
                  }`}
                >
                  {DOMESTIC_SUBSTITUTE_MATURITY_LABELS[substitute.maturityLevel]}
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {DOMESTIC_SUBSTITUTE_KIND_LABELS[substitute.substituteKind]}
              </p>

              {substitute.substituteNotes === null ? null : (
                <p className="text-sm text-muted-foreground">{substitute.substituteNotes}</p>
              )}

              <p className="text-xs">
                {substitute.supplierCapabilitySlug === null ? (
                  // The absence is the finding. Say it plainly rather than omitting the line.
                  <span className="text-muted-foreground">
                    No supplier capability covers this yet
                  </span>
                ) : (
                  <Link
                    href={`/research-and-development/go-to-market?capability=${substitute.supplierCapabilitySlug}`}
                    className="text-[#00696E] hover:underline"
                  >
                    Find suppliers who can do this →
                  </Link>
                )}
              </p>

              {substitute.evidenceSourceName === null ? null : (
                <p className="text-xs text-muted-foreground">
                  Source: {substitute.evidenceSourceName}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
