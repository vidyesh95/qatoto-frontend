// TRANSPORT: props-only — renders the receipt the mutation returned.

import Link from "next/link";

import ShowcaseLaunchRowPreview from "@/components/home/blueprints/showcase/authoring/showcase-launch-row-preview";
import { MutationAcceptedNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import type { ShowcaseSubmissionReceipt } from "@/lib/blueprints/showcase-authoring.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

/**
 * THE TERMINAL SCREEN, and the one place the launch flow admits what it is.
 *
 * ⚠️ A 202 IS NOT A RESULT. The launch was accepted; the verdict does not exist. Nothing here names an
 * outcome, promises a timescale or links to a public page, because the receipt carries no slug.
 *
 * ⚠️ THE DISCLOSURE IS NOT OPTIONAL COPY AND LIVES ONLY HERE, as on `submission-receipt.tsx`. Said
 * once, after posting, it is read; repeated across the form it is not. It also says the heading image
 * never left the browser, which the picker deliberately does not repeat.
 *
 * ⚠️ AND IT DOES NOT POLL. There is no queue to poll.
 */
export default function ShowcaseLaunchReceipt({
  receipt,
  rowPreviewProps,
  onPostAnother,
}: {
  readonly receipt: ShowcaseSubmissionReceipt;
  readonly rowPreviewProps: React.ComponentProps<typeof ShowcaseLaunchRowPreview>;
  readonly onPostAnother: () => void;
}) {
  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-medium text-foreground lg:text-2xl">Posted for review</h1>

      <div className="mt-4">
        <MutationAcceptedNotice message="Your launch has been accepted for review. It is not in the feed, and a moderator decides whether it appears there." />
      </div>

      <dl className="mt-4">
        <div className="border-t border-border py-2">
          <dt className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">Launch</dt>
          <dd className="mt-0.5 font-mono text-sm text-foreground">{receipt.submissionId}</dd>
        </div>
        <div className="border-t border-border py-2">
          <dt className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">Received</dt>
          <dd className="mt-0.5 text-sm text-foreground">
            {formatIsoInstantLabel(receipt.receivedAt)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">
          How it would look in the feed
        </p>
        <div className="mt-3">
          <ShowcaseLaunchRowPreview {...rowPreviewProps} />
        </div>
      </div>

      <div className="mt-5 rounded-xl border border-destructive/40 bg-destructive/5 p-4">
        <h2 className="text-sm font-medium text-destructive">
          Nothing was actually stored, and you should know that before you close this
        </h2>
        <p className="mt-2 text-sm leading-6 text-foreground">
          Qatoto cannot accept launches yet. There is no database behind this form and no queue of
          moderators reading launches. Everything you typed was checked against the real rules and
          then discarded when you pressed Post. Your heading image never left your browser. Keep
          your own copy.
        </p>
        <p className="mt-2 text-sm leading-6 text-foreground">
          This exists so the process can be walked and argued with before it is real. This launch
          will not appear in My Launches.
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onPostAnother}
          className="rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Post another launch
        </button>
        <Link
          href="/studio/launches"
          className="rounded-full border border-[#00696E]/40 px-5 py-2.5 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          See your launches
        </Link>
      </div>
    </div>
  );
}
