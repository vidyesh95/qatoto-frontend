// TRANSPORT: client-query — `GET /blueprints/drafts` through `@/hooks/blueprints/drafts`.
"use client";

// THE SAVED-BUT-NOT-SENT LIST, and the reason it exists is that without it the draft store was a
// one-way door.
//
// ⚠️ **A DRAFT USED TO BE UNREACHABLE ONCE SAVED.** The wizard could always resume one — it reads
// `?draftId=` — but nothing in the app ever built that link, and the submissions list beside this
// section shows work already SENT to a moderator. So an author pressed "Save draft", navigated
// away, and never saw it again. Three hooks for listing, reading and deleting a draft had been
// written and had no caller anywhere. This is their caller.
//
// ⚠️ **AND THE STORE HAS A CEILING.** `MAX_BLUEPRINT_DRAFTS_PER_AUTHOR` is 25. With no list and no
// delete, an author who reached it was permanently locked out of saving with nothing they could do
// about it. That is why Delete ships in the same change as the list rather than after it.
//
// ⚠️ **"DRAFT" MEANS TWO DIFFERENT THINGS ON THIS PAGE, WHICH IS WHY THIS SECTION IS NOT CALLED
// ONE.** The submissions list below has rows whose `moderationState` is `draft`: those were SENT
// and are waiting on something. These were never sent at all. Heading them both "Drafts" would
// merge two states an author has to tell apart, so this one says what is actually true of it —
// nothing here has been submitted.
//
// ONE COMPONENT, THREE PAGES. `/studio/blueprints`, `/studio/launches` and `/studio/case-studies`
// are the same template, and the draft store is keyed by `arm`, so the caller passes its arm and
// the address its composer lives at. A single combined drafts page was considered and rejected:
// `BlueprintDraftSummary` carries no title, only `label`, so a mixed list would show one arm's
// naming convention under every heading.

import { useState } from "react";

import Link from "next/link";

import RelativeTime from "@/components/home/shared/relative-time";
import { useDeleteDraftMutation, useMyDraftsQuery } from "@/hooks/blueprints/drafts";
import type { BlueprintDraftArm } from "@/lib/blueprints/drafts.schemas";

export default function UnsubmittedDraftsSection({
  arm,
  composerHref,
  emptyLabelFallback,
}: {
  readonly arm: BlueprintDraftArm;
  /** Where a row resumes to. `?draftId=` is appended, so this carries no query of its own. */
  readonly composerHref: string;
  /** What a row shows when the author saved before typing anything worth labelling. */
  readonly emptyLabelFallback: string;
}) {
  const draftsQuery = useMyDraftsQuery(arm);
  const deleteDraftMutation = useDeleteDraftMutation();
  const [draftIdAwaitingConfirm, setDraftIdAwaitingConfirm] = useState<string | null>(null);

  // RENDERS NOTHING UNTIL THERE IS SOMETHING TO SHOW — no skeleton, no empty card, no error panel.
  // Most authors have no drafts and this section is not what they came for; a permanent box
  // reporting its own emptiness is noise above the list they did come for. A failed read is
  // silent for the same reason: the submissions list below is the page, and it renders its own
  // failure. The one thing that must never be silent is a failed DELETE, which is handled below.
  if (!draftsQuery.isSuccess || draftsQuery.data.length === 0) return null;

  return (
    <section aria-label="Saved but not submitted" className="mt-6 max-w-3xl">
      <h2 className="text-sm font-medium text-foreground">Not submitted yet</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Saved to your account and visible only to you. Nothing here has been sent to a moderator.
      </p>

      <ul className="mt-3">
        {draftsQuery.data.map((draftSummary) => {
          const isAwaitingConfirm = draftIdAwaitingConfirm === draftSummary.draftId;
          const isDeletingThisDraft =
            deleteDraftMutation.isPending && deleteDraftMutation.variables === draftSummary.draftId;

          return (
            <li key={draftSummary.draftId} className="border-t border-border py-4">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {draftSummary.label ?? emptyLabelFallback}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {/* RELATIVE, AND A CLIENT COMPONENT ON PURPOSE — see `relative-time.tsx`.
                        "Edited 2 hours ago" computed during a server render bakes into the cache
                        entry and then argues with the browser. */}
                    Edited <RelativeTime isoInstant={draftSummary.updatedAt} />
                  </p>
                </div>

                <span className="flex shrink-0 items-center gap-4">
                  <Link
                    href={`${composerHref}?draftId=${encodeURIComponent(draftSummary.draftId)}`}
                    className="cursor-pointer text-sm font-medium text-primary-imprint transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint"
                  >
                    Resume
                  </Link>

                  {/* TWO-STEP INLINE, NEVER `window.confirm` — oxlint's `no-alert` forbids it, and
                      the repo settles on this shape in `products-page.tsx`. Deleting a draft is
                      irreversible and there is no undo route. */}
                  {isAwaitingConfirm ? (
                    <>
                      <button
                        type="button"
                        disabled={deleteDraftMutation.isPending}
                        onClick={() =>
                          deleteDraftMutation.mutate(draftSummary.draftId, {
                            onSettled: () => setDraftIdAwaitingConfirm(null),
                          })
                        }
                        className="cursor-pointer text-sm font-medium text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isDeletingThisDraft ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDraftIdAwaitingConfirm(null)}
                        className="cursor-pointer text-sm text-muted-foreground hover:underline"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDraftIdAwaitingConfirm(draftSummary.draftId)}
                      className="cursor-pointer text-sm text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      {/* A FAILED DELETE IS THE ONE THING THIS SECTION SAYS OUT LOUD. The row is still there, so
          silence would read as the button doing nothing — and the likeliest cause is a draft
          already deleted in another tab, which the server's own sentence explains better than any
          paraphrase. */}
      {deleteDraftMutation.isError && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          That draft could not be deleted. Refresh the page and try again.
        </p>
      )}
    </section>
  );
}
