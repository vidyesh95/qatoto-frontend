// TRANSPORT: props-only — authored copy over a link. Fetches nothing, and there is nothing to fetch.
//
// THE HONEST PLACEHOLDER, and the reason it exists rather than a bare `<h1>`.
//
// Studio routes are listed in the sidebar with nothing distinguishing them from the ones that work.
// A creator clicks one and gets a naked heading — the navigation made a promise the page did not
// keep, which is exactly what `site-capabilities.ts` refuses to let the roadmap do and there is no
// reason the sidebar should be held to a lower standard.
//
// ⚠️ THE COUNT IS NOT WRITTEN DOWN HERE ANY MORE. This comment said "Twelve", then the caller list
// fell to nine, then six, then four, and every one of those numbers was stale before anybody read
// it. `rg -l "^import StudioPlannedPage" "src/app/(studio)"` is the answer that cannot drift.
//
// THIS IS NOT A SHIPPED FEATURE AND MUST NOT BE COUNTED AS ONE. Every one of these routes stays
// `kind: "planned"` in `site-roadmap.ts`. Explaining an absence well is not the same as filling it,
// and flipping the roadmap here would make the map claim a capability that does not exist.
//
// `summary` IS COPIED FROM THE ROADMAP ENTRY VERBATIM, so the card on `/roadmap` and this page
// cannot drift into describing the same route differently.
//
// `insteadFor` IS OPTIONAL, AND ABSENT WHENEVER THERE IS GENUINELY NOWHERE TO SEND ANYONE.
// Inventing a destination there would be the same failure in a smaller font — a link that does not
// answer the need costs more than no link, because it spends the reader's trust. `/studio/subtitles`
// is the current example: captions belong to the player Qatoto embeds, so there is no second page
// that does this.
//
// ⚠️ AN `insteadFor` THAT FITS TOO WELL IS A SIGN THE ROUTE IS READY TO GRADUATE, NOT A REASON TO
// KEEP THE STUB. `/studio/support` pointed at `/customer-service` and described, in its own
// `whatItWillDo` bullets, two things that page already did. Once the backend it was waiting on
// shipped, the honest move was to build the route, not to keep explaining the absence well.
import Link from "next/link";

export default function StudioPlannedPage({
  title,
  summary,
  whatItWillDo,
  insteadFor,
}: {
  readonly title: string;
  readonly summary: string;
  readonly whatItWillDo: readonly string[];
  readonly insteadFor?: {
    readonly label: string;
    readonly href: string;
    readonly note: string;
  };
}) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{summary}</p>

      <div className="mt-6 max-w-2xl rounded-2xl border border-dashed border-border p-6">
        <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Not built yet
        </p>
        <p className="mt-2 text-sm text-foreground">
          This page is on the roadmap and has no working version. It is listed in the sidebar so the
          shape of the Studio is visible, not because there is something here to use.
        </p>

        {whatItWillDo.length > 0 && (
          <>
            <p className="mt-4 text-sm font-medium text-foreground">What it will do</p>
            <ul className="mt-1 list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {whatItWillDo.map((capability) => (
                <li key={capability}>{capability}</li>
              ))}
            </ul>
          </>
        )}

        {insteadFor === undefined ? (
          // Said out loud rather than left as silence: a reader who has just been told "not yet"
          // will look for the workaround, and the honest answer is that there is not one.
          <p className="mt-4 text-sm text-muted-foreground">
            There is nowhere else on Qatoto that does this today.
          </p>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            {insteadFor.note}{" "}
            <Link href={insteadFor.href} className="text-foreground underline">
              {insteadFor.label}
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
