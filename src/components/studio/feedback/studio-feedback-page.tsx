// TRANSPORT: server-fetch — reads the auth cookie so the list section paints the right thing on
// first render; the routing copy above it fetches nothing.
//
// ## WHAT CHANGED, AND WHY THIS IS NO LONGER A `StudioPlannedPage`
//
// The stub promised two things. The first, "send a bug report or a suggestion from inside the
// Studio", was already true and badly delivered: the only composer in the product sits inside
// the account dropdown, and `AlphaBanner`'s "Encountered an issue?" mailto is mounted by the
// `(home)` layout alone, so somebody working in Studio never sees either prompt.
//
// The second, "tell you when something you reported changed", was not true at all. `POST
// /feedback` was the whole domain: no read, no status anybody could move, no notification.
// `GET /feedback/mine` and the triage route shipped with this page, which is what makes the
// list below something other than decoration.
//
// ⚠️ **AND THE PROMISE STILL CHANGED, BECAUSE "TELL YOU" IS A PUSH.** Nothing emails anybody
// and no notification kind exists for feedback. What is here is a PULL: come back and look.
// The header says that in as many words, and the roadmap summary was rewritten to match rather
// than left describing a feature that would have to be built to make it true.
//
// ## THE THREE CHANNELS, NAMED ONCE
//
// Feedback, a support case and an item report are three different things with three different
// endings, and the reason this page leads with the difference is that only one of them answers
// you. Somebody blocked right now who leaves a note here has chosen the channel that cannot
// help them, and they will not find that out.

import { Suspense } from "react";

import Link from "next/link";

import PlatformFeedbackComposer from "@/components/home/shared/platform-feedback-composer";
import OwnFeedbackIsland from "@/components/studio/feedback/own-feedback-island";
import { hasCallerSession } from "@/lib/server-http";

export default function StudioFeedbackPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">Feedback</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        What is broken, and what would make this better. A person reads what comes in. Nothing here
        sends a reply and nothing will email you, so what you sent and what was done with it is on
        this page.
      </p>

      <section aria-label="Which channel" className="mt-8">
        <h2 className="text-sm font-medium text-foreground">Is this the right place?</h2>
        <dl className="mt-3 max-w-2xl space-y-3">
          <div className="rounded-xl border border-border px-4 py-3">
            <dt className="text-sm font-medium text-foreground">
              Something on Qatoto is broken, or could be better
            </dt>
            <dd className="mt-1 text-sm leading-5 text-muted-foreground">
              Yes, here. Nobody answers it, and nothing is promised in return.
            </dd>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <dt className="text-sm font-medium text-foreground">
              Something is blocking you right now
            </dt>
            <dd className="mt-1 text-sm leading-5 text-muted-foreground">
              Open a case from{" "}
              <Link href="/studio/support" className="underline">
                Support
              </Link>{" "}
              instead. A case is a conversation: a person answers it, you get a notification, and
              the thread stays on your account. Feedback is none of those things.
            </dd>
          </div>
          <div className="rounded-xl border border-border px-4 py-3">
            <dt className="text-sm font-medium text-foreground">
              A video, a profile or a listing that should not be on Qatoto
            </dt>
            <dd className="mt-1 text-sm leading-5 text-muted-foreground">
              Use the report control on that item. A report reaches a moderator who can act on the
              thing itself, which is something no note here can do.
            </dd>
          </div>
        </dl>
      </section>

      <section aria-label="Send feedback" className="mt-10">
        <h2 className="text-sm font-medium text-foreground">Send feedback</h2>
        <div className="mt-3 max-w-2xl">
          <PlatformFeedbackComposer
            pagePathNote={
              <>
                Your browser details are sent along. The page path recorded with this will be{" "}
                <span className="text-foreground">/studio/feedback</span>, which says nothing about
                where a problem was, so if this is about one particular screen it is worth sending
                from there: <span className="text-foreground">Send feedback</span> in the account
                menu attaches the page you were on.
              </>
            }
          />
        </div>
      </section>

      <section aria-label="What you have sent" className="mt-10">
        <h2 className="text-sm font-medium text-foreground">What you have sent</h2>
        <p className="mt-1 max-w-2xl text-xs leading-4 text-muted-foreground">
          &ldquo;Read by the team&rdquo; means somebody marked it read. It is not a promise that
          anything will change.
        </p>
        <div className="mt-3 max-w-2xl">
          {/*
            THE COOKIE READ IS CONTAINED IN THIS SUBTREE, the containment `customer-service-page`
            documents: awaiting `hasCallerSession()` above the authored copy would make the whole
            route dynamic for the sake of one section. The fallback is the SIGNED-OUT component
            rather than a skeleton, so the shift when the real answer lands is a prompt becoming
            a list, never a layout jump.
          */}
          <Suspense fallback={<OwnFeedbackIsland isViewerSignedIn={false} />}>
            <OwnFeedbackSlot />
          </Suspense>
        </div>
      </section>
    </div>
  );
}

async function OwnFeedbackSlot() {
  return <OwnFeedbackIsland isViewerSignedIn={await hasCallerSession()} />;
}
