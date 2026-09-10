// TRANSPORT: props-only — renders the receipt the mutation returned.

import Link from "next/link";

import { MutationAcceptedNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import type { TeardownSubmissionReceipt } from "@/lib/blueprints/authoring.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

/**
 * THE TERMINAL SCREEN, and the one place this surface admits what it is.
 *
 * ⚠️ A 202 IS NOT A RESULT. The submission was accepted; the verdict does not exist. Nothing here
 * may name an outcome, promise a timescale, or hand back a public link — `TeardownSubmissionReceipt`
 * deliberately carries no slug, because a link to a page that answers 404 reads as work having been
 * lost. `MutationAcceptedNotice` is the repo's component for exactly this branch and it says so in
 * its own doc: "accepted, not decided."
 *
 * ⚠️ THE SECOND PARAGRAPH IS THE HONEST DISCLOSURE AND IT IS NOT OPTIONAL COPY. Nothing was stored.
 * There is no `blueprint` table, no submission endpoint and no review queue, so this validated a
 * real payload against the real contract and then let it go. Saying that once, here, is what makes
 * the whole wizard something other than a ghost control — and it is said HERE rather than as a
 * banner on every step, because a warning repeated five times is a warning nobody finishes reading.
 *
 * ⚠️ AND IT DOES NOT POLL. The R&D surfaces poll a 202 to a verdict, and copying that here would
 * re-read the same fixture forever while implying somebody is reviewing. There is no queue. The
 * copy says that rather than a spinner implying otherwise.
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

      <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <h2 className="text-sm font-medium text-destructive">
          Nothing was actually stored, and you should know that before you close this
        </h2>
        <p className="mt-2 text-sm leading-6 text-foreground">
          Qatoto cannot accept teardowns yet. There is no database behind this form and no queue of
          moderators reading submissions. Everything you typed was checked against the real rules —
          the same ones a published teardown obeys — and then discarded when you pressed submit.
          Keep your own copy.
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">
          This exists so the process can be walked and argued with before it is real. When
          submissions open, this screen will hand you a way to track yours.
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
