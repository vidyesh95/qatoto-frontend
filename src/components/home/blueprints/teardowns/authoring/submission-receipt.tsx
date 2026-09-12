// TRANSPORT: props-only — renders the receipt the mutation returned.

import Link from "next/link";

import { MutationAcceptedNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import type { TeardownSubmissionReceipt } from "@/lib/blueprints/authoring.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

/**
 * THE TERMINAL SCREEN.
 *
 * ⚠️ A 202 IS NOT A RESULT. The submission was accepted; the verdict does not exist. Nothing here
 * may name an outcome, promise a timescale, or hand back a public link — `TeardownSubmissionReceipt`
 * deliberately carries no slug, because a link to a page that answers 404 reads as work having been
 * lost. `MutationAcceptedNotice` is the repo's component for exactly this branch and it says so in
 * its own doc: "accepted, not decided."
 *
 * ⚠️ THIS SCREEN USED TO CARRY A DESTRUCTIVE PANEL SAYING NOTHING WAS STORED, and it was the right
 * copy for as long as it was true: there was no table, no route and no queue, and saying so once
 * here is what kept the wizard from being a ghost control. All three exist now, so the panel is
 * gone rather than softened. What replaced it is the two things that are still true, in plain
 * prose, because neither is alarming.
 *
 * ⚠️ AND IT DOES NOT POLL. The R&D surfaces poll a 202 to a verdict; copying that here would put a
 * spinner in front of an author implying somebody is reading their survey this minute. A moderator
 * reads it when they read it, and My teardowns is where the answer appears.
 */
export default function SubmissionReceipt({
  receipt,
  onStartAnother,
}: {
  readonly receipt: TeardownSubmissionReceipt;
  readonly onStartAnother: () => void;
}) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-medium text-foreground lg:text-2xl">Submitted for review</h1>

      <div className="mt-4">
        <MutationAcceptedNotice message="Your survey has been accepted for review. It is not public, and a moderator decides whether it is published." />
      </div>

      <dl className="mt-4">
        <div className="border-t border-black/5 py-2">
          <dt className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
            Submission
          </dt>
          <dd className="mt-0.5 font-mono text-sm text-foreground">{receipt.submissionId}</dd>
        </div>
        <div className="border-t border-black/5 py-2">
          <dt className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">Received</dt>
          <dd className="mt-0.5 text-sm text-foreground">
            {formatIsoInstantLabel(receipt.receivedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-5 max-w-prose">
        <h2 className="text-sm font-medium text-foreground">What happens next</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A moderator reads it. There is no queue position to watch and nothing will email you — the
          decision shows up on My teardowns, whenever you next look.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Qatoto stored your survey, not your files. Every file here is a link to where it already
          lives, so keep those links working.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onStartAnother}
          className="rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Start another survey
        </button>
        <Link
          href="/studio/blueprints"
          className="rounded-full border border-[#00696E]/40 px-5 py-2.5 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          See your submissions
        </Link>
      </div>
    </div>
  );
}
