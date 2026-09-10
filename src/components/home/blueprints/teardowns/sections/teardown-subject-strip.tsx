// TRANSPORT: props-only — the provenance object arrives on the teardown.

import {
  TEARDOWN_SURVEY_METHOD_LABELS,
  TEARDOWN_SURVEY_METHODS,
  TEARDOWN_UNIT_ACQUISITION_LABELS,
  type TeardownProvenance,
} from "@/lib/blueprints/schemas";
import { formatIsoInstantAsDateLabel } from "@/lib/store/format";

/**
 * WHAT UNIT THIS IS A SURVEY OF, and under what permission — the origin claim, above the fold.
 *
 * ⚠️ IT EXISTS BECAUSE OF ONE ORDERING RULE: the origin block renders above the files AND above the
 * bill of materials. The four subject facts used to live only in `TeardownProvenanceBlock`, which
 * sits below the decision row — and the decision row's first cell is "Parts cost", which IS the BOM
 * band. So a reader met the cost of building the thing before they met any claim about where the
 * survey came from, which is the ordering that rule exists to prevent. Lifting the origin half up
 * here fixes it without pushing a paragraph of licence and attestation prose above the four facts a
 * founder came for.
 *
 * ⚠️ THE SPLIT IS ORIGIN HERE, RIGHTS BELOW, and it is not arbitrary. This strip states WHAT was
 * surveyed, HOW it was obtained, WHEN, BY WHAT METHODS and UNDER WHAT PERMISSION — five facts, each
 * one word or one phrase, all checkable. `TeardownProvenanceBlock` keeps what needs sentences: the
 * limit of that permission, the publisher's notes, the attestation, the standing line and the
 * report control. Neither section may print the other's facts; two sections repeating each other is
 * how a reader learns to skip both.
 *
 * ⚠️ THE METHODS PRINT IN ENUM ORDER, never in the order the publisher listed them — the same call
 * `TEARDOWN_MANUFACTURING_FILE_KIND_SHORT_LABELS` makes on the index card. The order is a property
 * of the vocabulary, not of one row, and two rows naming the same three methods must read
 * identically or a scanner starts seeing a difference that is not there.
 *
 * NOT A `<dl>`, though the decision row directly beneath it is one. Two definition lists stacked
 * would read as one table broken in half. Labels and chips here, definition rows there.
 */
export default function TeardownSubjectStrip({
  provenance,
}: {
  readonly provenance: TeardownProvenance;
}) {
  const orderedSurveyMethods = TEARDOWN_SURVEY_METHODS.filter((method) =>
    provenance.surveyMethods.includes(method),
  );

  /**
   * The permission, in as few words as it can honestly be put.
   *
   * ⚠️ THE MANUFACTURER ARM NAMES NO DOCUMENT, because there is none. It says a permission exists
   * and stops; what that permission is worth to the reader needs a sentence, and the sentence is in
   * the provenance block. Printing `authorizationNote` here would put a paragraph in a strip of
   * one-line facts and, worse, would let a private arrangement sit in the same visual slot a public
   * licence name occupies.
   */
  const permissionLabel =
    provenance.licence !== null
      ? provenance.licence.name
      : provenance.authorizationNote !== null
        ? "Authorized by the manufacturer"
        : null;

  return (
    <section className="mt-3 border-t border-border pt-3" aria-label="What was surveyed">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
          Survey of
        </span>
        <span className="text-sm font-medium text-foreground">{provenance.subjectProductName}</span>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">
        {TEARDOWN_UNIT_ACQUISITION_LABELS[provenance.unitAcquisition]} &middot; surveyed{" "}
        {formatIsoInstantAsDateLabel(provenance.surveyedAt)}
        {/*
          `null` PRINTS NOTHING — no "unlicensed", no "none". A community survey carries no
          permission and saying so twice (here and in the chip a few pixels up) would be nagging
          rather than informing.
        */}
        {permissionLabel === null ? null : ` · ${permissionLabel}`}
      </p>

      <ul className="mt-2 flex flex-wrap gap-1.5">
        {orderedSurveyMethods.map((method) => (
          <li
            key={method}
            className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground"
          >
            {TEARDOWN_SURVEY_METHOD_LABELS[method]}
          </li>
        ))}
      </ul>
    </section>
  );
}
