// TRANSPORT: props-only — the provenance object arrives on the teardown.

import Link from "next/link";

import TeardownProvenanceChipBadge from "@/components/home/blueprints/teardowns/sections/teardown-provenance-chip";
import {
  TEARDOWN_SURVEY_METHOD_LABELS,
  TEARDOWN_SURVEY_METHOD_NOTES,
  TEARDOWN_SURVEY_METHODS,
  TEARDOWN_UNIT_ACQUISITION_LABELS,
  type TeardownProvenance,
  type TeardownProvenanceChip,
} from "@/lib/blueprints/schemas";
import { formatIsoDateLabel } from "@/lib/store/format";

/**
 * THE ORIGIN BLOCK. What unit was surveyed, how it was obtained, by what methods, and under whose
 * attestation.
 *
 * ⚠️ IT RENDERS ABOVE THE BILL OF MATERIALS AND ABOVE EVERY FILE, and that ordering is the feature
 * rather than a layout taste. The files are the thing a reader might take away and send to a
 * factory; a provenance claim that arrives after them is a disclaimer, and a disclaimer is what a
 * reader has already scrolled past. Put in front of them it is a heading — it says what kind of
 * document this is before the reader decides what to do with it.
 *
 * ⚠️ NOTHING HERE SAYS QATOTO CHECKED ANYTHING. Qatoto runs no patent search, no clearance opinion
 * and no verification of the publisher's account of their own bench. Every line is attributed to
 * the publisher, and the one sentence about jurisdiction tells the reader what THEY still have to
 * do. PRODUCT.md's rule that an unattributed figure reads as invented applies with more force to an
 * unattributed legal opinion.
 *
 * ⚠️ THE SURVEY METHODS ARE PRINTED IN ENUM ORDER, NEVER IN THE ORDER THE PUBLISHER LISTED THEM.
 * Same call `TEARDOWN_MANUFACTURING_FILE_KIND_SHORT_LABELS` makes on the index card: the order is a
 * property of the vocabulary, not of one row, and two rows that list the same three methods must
 * read identically or a scanner starts seeing a difference that is not there.
 *
 * NOT A BORDERED PANEL INSIDE A BORDERED PANEL (`docs/Design.md` §4). It is a hairline-topped
 * section on the page ground, like every other section on this page.
 */
export default function TeardownProvenanceBlock({
  provenance,
  chip,
  teardownSlug,
}: {
  readonly provenance: TeardownProvenance;
  readonly chip: TeardownProvenanceChip;
  readonly teardownSlug: string;
}) {
  // Enum order, deduped by construction: the contract allows a repeat and the vocabulary does not.
  const orderedSurveyMethods = TEARDOWN_SURVEY_METHODS.filter((method) =>
    provenance.surveyMethods.includes(method),
  );

  return (
    <section className="mt-8 border-t border-border pt-5" aria-labelledby="teardown-provenance">
      <h2 id="teardown-provenance" className="text-sm font-medium text-foreground">
        Where this came from
      </h2>

      <div className="mt-3">
        <TeardownProvenanceChipBadge chip={chip} shouldShowNote />
      </div>

      <dl className="mt-4 max-w-2xl">
        <div className="border-t border-black/5 py-2">
          <dt className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
            Unit surveyed
          </dt>
          <dd className="mt-0.5 text-sm text-foreground">{provenance.subjectProductName}</dd>
        </div>
        <div className="border-t border-black/5 py-2">
          <dt className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
            How it was obtained
          </dt>
          <dd className="mt-0.5 text-sm text-foreground">
            {TEARDOWN_UNIT_ACQUISITION_LABELS[provenance.unitAcquisition]}
          </dd>
        </div>
        <div className="border-t border-black/5 py-2">
          <dt className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">Surveyed</dt>
          <dd className="mt-0.5 text-sm text-foreground">
            {formatIsoDateLabel(provenance.surveyedAt)}
          </dd>
        </div>
        {provenance.licence === null ? null : (
          <div className="border-t border-black/5 py-2">
            <dt className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
              Licence
            </dt>
            <dd className="mt-0.5 text-sm">
              {/*
                THE LICENCE IS A LINK BECAUSE THE CHIP TELLS THE READER TO READ IT. A named licence
                the reader cannot open is the same unverifiable claim as an unattributed number.
                `rel="noreferrer"` and a new tab: it is somebody else's document.
              */}
              <a
                href={provenance.licence.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[#00696E] transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
              >
                {provenance.licence.name}
              </a>
            </dd>
          </div>
        )}
      </dl>

      <h3 className="mt-5 text-[11px] font-medium tracking-[0.5px] text-muted-foreground uppercase">
        Methods
      </h3>
      <ul className="mt-2 max-w-2xl">
        {orderedSurveyMethods.map((method) => (
          <li key={method} className="border-t border-black/5 py-2">
            <p className="text-sm text-foreground">{TEARDOWN_SURVEY_METHOD_LABELS[method]}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {TEARDOWN_SURVEY_METHOD_NOTES[method]}
            </p>
          </li>
        ))}
      </ul>

      {provenance.notes === null ? null : (
        <p className="mt-4 max-w-prose text-sm leading-6 text-muted-foreground">
          {provenance.notes}
        </p>
      )}

      {/*
        THE STANDING LINE, ONCE PER TEARDOWN. It is the sentence that makes every file above and
        below it legible as what it is, and it is not negotiable copy: a survey page that does not
        say the unit was bought is a page that reads as a leak.
      */}
      <p className="mt-4 max-w-prose text-sm leading-6 text-muted-foreground">
        Everything published here is the publisher&rsquo;s own measurement of a legally acquired,
        off-the-shelf commercial unit. Qatoto does not host manufacturer-internal documents and
        makes no clearance assessment of its own.
      </p>

      <p className="mt-3 text-sm">
        {/*
          A REAL DESTINATION, NOT A FORM WITH NO ENDPOINT. `/copyright-policy` is a live page that
          states how a claim is made, and linking to it promises exactly what Qatoto can do today.
          The expedited claim route — claim kind, claimant identity, the specific file or part —
          needs a table to write to, so it ships with that table and not before (`todo.md`
          §Blueprint rights claims). Shipping the form first would be a control whose write has no
          backing table, which is the one thing this surface refuses everywhere else.
        */}
        <Link
          href="/copyright-policy"
          className="inline-flex items-center gap-1 font-medium text-destructive transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
        >
          Report an IP concern about this teardown
          <span aria-hidden="true">&rarr;</span>
        </Link>
        <span className="sr-only"> ({teardownSlug})</span>
      </p>

      <p className="mt-3 text-xs text-muted-foreground">
        Publisher attested on {formatIsoDateLabel(provenance.attestationAcceptedAt)} that the unit
        was lawfully obtained, that the data was gathered by measurement and standard disassembly,
        and that no vendor-confidential material was used.
      </p>
    </section>
  );
}
