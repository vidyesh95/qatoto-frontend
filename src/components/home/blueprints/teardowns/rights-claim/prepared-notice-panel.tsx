// TRANSPORT: props-only — renders a notice built by `@/lib/blueprints/rights-claim-notice`.
"use client";

import { useState } from "react";

import type { RightsClaimNotice } from "@/lib/blueprints/rights-claim-notice";

/**
 * THE PREPARED NOTICE, and the screen that makes this route honest.
 *
 * ⚠️ THERE IS NO RECEIPT HERE BECAUSE NOTHING WAS RECEIVED. Every other write surface in this repo
 * ends on a confirmation; this one ends on a DOCUMENT the claimant now has to send. That asymmetry
 * is the entire design: a rights holder who is told "we have received your claim" and has not been
 * heard by anyone may miss a deadline, or believe the platform is on notice when it is not. A
 * publisher losing a draft is an inconvenience; this is somebody's legal position.
 *
 * ⚠️ THE NOTICE IS SHOWN IN FULL AND IS SELECTABLE. Not summarised, not behind a disclosure, not in
 * a fixed-height box that scrolls two lines at a time. What the claimant is about to send is the
 * thing they must be able to read and check, and a mail client may mangle a long `mailto:` — the
 * visible text plus the copy button is the path that always works.
 *
 * ⚠️ NEITHER CONTROL IS A SUBMIT. The mail button hands the notice to the visitor's own client and
 * the copy button puts it on their clipboard. Both leave Qatoto with nothing, which is why neither
 * is styled as the committed action a submit would be.
 */
export default function PreparedNoticePanel({
  notice,
  onReviseNotice,
}: {
  readonly notice: RightsClaimNotice;
  readonly onReviseNotice: () => void;
}) {
  /**
   * `idle | copied` rather than a boolean plus a timer, and it never resets itself.
   *
   * A confirmation that vanishes after two seconds is one somebody looking at their mail client
   * misses entirely, and then they copy twice and wonder which one took. It clears when they revise.
   */
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopyClick(): Promise<void> {
    try {
      await navigator.clipboard.writeText(notice.body);
      setCopyState("copied");
    } catch {
      // ⚠️ A REFUSED CLIPBOARD IS REPORTED, NOT SWALLOWED. `navigator.clipboard` rejects without a
      // user gesture, over plain http, and under some permission policies — and the notice is
      // already visible above, so the honest fallback is "select it yourself" rather than a button
      // that silently did nothing.
      setCopyState("failed");
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-medium text-foreground lg:text-2xl">Your notice is ready</h1>

      <div className="mt-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Nothing has been sent yet</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Qatoto has not received this and does not have a copy. Nothing you typed left your
          browser. Sending it is the next step, and it is yours to take — use the button below or
          copy the text into your own email.
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Send it to <span className="font-medium text-foreground">{notice.recipientEmail}</span>.
          Keep a copy: it is the record of when you gave notice.
        </p>
      </div>

      <div className="mt-5">
        <p className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">Subject</p>
        <p className="mt-1 text-sm text-foreground">{notice.subject}</p>
      </div>

      <div className="mt-4">
        <p className="text-[11px] tracking-[0.5px] text-muted-foreground uppercase">Notice</p>
        {/*
          `whitespace-pre-wrap` because the body is plain text with meaningful line breaks, and a
          `<pre>` would scroll horizontally on a phone. Sans rather than mono: this is a letter
          somebody reads, not a value they copy exactly.
        */}
        <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-foreground">{notice.body}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
        {/*
          A plain `<a>`, never `next/link`: a `mailto:` is not a route and handing it to the client
          router does nothing. Same call `privacy-request.ts`'s consumers make.
        */}
        <a
          href={notice.mailtoHref}
          className="rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#00393C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Open this in my email
        </a>
        <button
          type="button"
          onClick={() => void handleCopyClick()}
          className="rounded-full border border-[#00696E]/40 px-5 py-2.5 text-sm font-medium text-[#00696E] transition-colors hover:bg-[#00696E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Copy the notice
        </button>
        <button
          type="button"
          onClick={() => {
            setCopyState("idle");
            onReviseNotice();
          }}
          className="rounded-full px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00696E]"
        >
          Change something
        </button>
      </div>

      {copyState === "copied" ? (
        <output className="mt-3 block text-xs text-muted-foreground">
          Copied. Paste it into an email to {notice.recipientEmail}.
        </output>
      ) : null}
      {copyState === "failed" ? (
        <output className="mt-3 block text-xs text-destructive">
          Your browser would not let the page copy that. Select the notice above and copy it
          yourself.
        </output>
      ) : null}

      <p className="mt-5 max-w-prose text-xs leading-5 text-muted-foreground">
        Qatoto has not designated an agent for statutory copyright notices, so this is how to reach
        a person rather than a formal filing. What happens next is a human reading your email.
        Nothing on the teardown changes until somebody has.
      </p>
    </div>
  );
}
