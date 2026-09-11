// TRANSPORT: props-only — renders the receipt the mutation returned.

import Link from "next/link";

import ShowcaseLaunchRowPreview from "@/components/home/blueprints/showcase/authoring/showcase-launch-row-preview";
import { MutationAcceptedNotice } from "@/components/home/research-and-development/sections/mutation-feedback";
import type { ShowcaseSubmissionReceipt } from "@/lib/blueprints/showcase-authoring.schemas";
import { formatIsoInstantLabel } from "@/lib/store/format";

/**
 * THE TERMINAL SCREEN, after the launch is stored.
 *
 * ⚠️ STORED IS NOT DECIDED. The launch exists and waits for a moderator; the verdict does not exist.
 * Nothing here names an outcome, promises a timescale or links to a public page, because the receipt
 * carries no slug.
 *
 * ⚠️ AND IT DOES NOT POLL. A person decides, and My Launches shows the decision when it loads.
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
        <MutationAcceptedNotice message="Your launch is saved and waiting for a moderator. It is not in the feed, and nobody else can see it while it is in review." />
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
