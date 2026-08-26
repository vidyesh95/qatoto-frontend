// TRANSPORT: props-only — authored copy over links. Fetches nothing.
//
// A HUB, NOT NEW POLICY. Five policy pages already exist under `(disclaimers)` and the reporting
// flow already works; what was missing was a single place that says which is which. Writing fresh
// rules here would create a sixth document to keep in sync with the five.
//
// THREE THINGS THIS PAGE MUST NOT CONTRADICT, each asserted somewhere else already:
//
//  1. "ACTIONED" IS NOT SPELLED "REMOVED". `content-reports.api.ts` is explicit — a 201 is not a
//     verdict, there is no automatic hide on this platform, and a moderator decides every report by
//     hand because a video is a creator's livelihood. Copy here says "we will review it".
//  2. A REPORTER LEARNS THE OUTCOME AND NOTHING ELSE. Not who moderated, not what note they left,
//     not how many others reported the same video. Naming the moderator makes a takedown personal;
//     publishing the count makes brigading measurable.
//  3. The eight report reasons are Postgres enum labels. Do not restate them here as prose that
//     drifts from the picker — point at the picker instead.
import Link from "next/link";

export default function PoliciesAndSafety() {
  return (
    <main>
      <h1 className="px-6 py-6 text-xl md:px-25">Policies and Safety</h1>
      <dl className="space-y-4 px-6 pb-25 text-justify text-sm md:px-25">
        <div>
          <dt>What this page is</dt>
          <dd>
            An index. The rules themselves live in the documents below, and this exists so you do
            not have to guess which one covers your situation.
          </dd>
        </div>

        <div>
          <dt>How to behave here</dt>
          <dd>
            The{" "}
            <Link href="/community-guidelines" className="underline">
              Community Guidelines
            </Link>{" "}
            cover harassment, hate speech, illegal and adult content, privacy, spam and
            misinformation, and what happens to accounts that ignore them.
          </dd>
        </div>

        <div>
          <dt>Reporting a video</dt>
          <dd>
            The report control is on the video itself, under the player. You pick a reason from a
            fixed list and may add detail.
          </dd>
        </div>

        <div>
          <dt>What happens after you report</dt>
          <dd>
            A person reads it. Nothing is hidden automatically — a video is a creator&apos;s
            livelihood, and an automatic takedown on an unreviewed report would make the report
            button a weapon. So filing one is not a verdict, and the video stays up while it is
            looked at.
            <br />
            You can see the state of everything you have filed in{" "}
            <Link href="/report-history" className="underline">
              Report history
            </Link>
            : waiting for review, action taken, or no action taken. You will not be told who
            reviewed it, what they wrote, or how many other people reported the same video — the
            first would make a decision personal, and the second would tell an organised group
            whether their campaign was working.
          </dd>
        </div>

        <div>
          <dt>Someone used your work without permission</dt>
          <dd>
            That is a copyright matter rather than a guidelines one, and it has its own process,
            including what a takedown notice must contain. See the{" "}
            <Link href="/copyright-policy" className="underline">
              Copyright Policy
            </Link>
            .
          </dd>
        </div>

        <div>
          <dt>Your data</dt>
          <dd>
            What is collected, why, how long it is kept, and how to get it out or have it deleted
            are all in the{" "}
            <Link href="/privacy-policy" className="underline">
              Privacy Policy
            </Link>
            .
          </dd>
        </div>

        <div>
          <dt>You found a security hole</dt>
          <dd>
            Please report it under the{" "}
            <Link href="/vulnerability-disclosure-policy" className="underline">
              Vulnerability Disclosure Policy
            </Link>
            , which sets out scope and safe harbour. Do not use the ordinary report control for it.
          </dd>
        </div>

        <div>
          <dt>The agreement itself</dt>
          <dd>
            The{" "}
            <Link href="/terms-and-conditions" className="underline">
              Terms and Conditions
            </Link>{" "}
            govern your use of Qatoto.
          </dd>
        </div>

        <div>
          <dt>Something else went wrong</dt>
          <dd>
            For an order, a dispute or your account, start at{" "}
            <Link href="/customer-service" className="underline">
              Customer Service
            </Link>
            .
          </dd>
        </div>
      </dl>
    </main>
  );
}
