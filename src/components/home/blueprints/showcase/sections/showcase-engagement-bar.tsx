// TRANSPORT: props-only
//
// The showcase's engagement row — the sibling of `TeardownEngagementBar`, same asymmetry and same
// reason. Two of the three cells are NOT CONTROLS: there is no comment route and no like route for a
// blueprint, because every engagement table in the backend is hard-FK'd to `video.id` or
// `product.id` and no blueprints content table exists for a row to reference. Only Share is a
// button, and it navigates and writes nothing.
//
// THREE CELLS, NOT FOUR, so this is `grid-cols-3` where the teardown bar is `grid-cols-4`. A
// showcase has no save count — `saveCount` is on the teardown arm only, and inventing one here to
// square the grid would be a number with nothing behind it.
//
// ⚠️ `commentCount` COUNTS THE THREAD `BlueprintCommentThread` RENDERS FURTHER DOWN THE SAME PAGE.
// The two are read from the same fixture set and must agree; `blueprints-mocks.ts` records that as
// the standing constraint on the fixtures.
//
// THE MIDDLE CELL IS THE UPVOTE, NOT A LIKE, AND IT IS THE PAGE'S ONLY COPY OF THAT NUMBER. The
// detail page used to carry `ShowcaseVoteBox` — the fixed 40×44 stacked caret in a gutter beside
// the title — and moving the upvote here retires it FROM THIS PAGE, because one launch showing
// `upvoteCount` twice, 200px apart, is two readings of one number that a reader has to reconcile
// for no reason. `ShowcaseVoteBox` still renders on `showcase-feed-row.tsx`, where it is the list
// shape and has no competitor. Restoring the gutter is one import and one line if the Launch YC
// silhouette turns out to matter more than the duplication.
//
// `likeCount` WENT BACK TO THE FOOTER when the upvote took this slot. It is a shared field with a
// renderer on every arm, so it cannot simply be dropped, and a launch that showed both a like count
// and an upvote count would be asking a reader to tell two approval numbers apart.
//
// ⚠️ IT IS STILL A `<span>`, AND CALLING IT AN UPVOTE DOES NOT CHANGE THAT. There is no vote route:
// `upvoteCount`'s own schema comment says so — "a counter a client can increment is a business rule
// enforced on an untrusted layer, which CLAUDE.md §1.1 forbids outright". The pill chrome is
// deliberate and matches the counts either side of it; the click handler is the part that cannot
// exist yet. Wiring one is `todo.md` §Blueprint discussion, and it needs a table first.
//
// A SERVER COMPONENT. Only the share trigger needs JavaScript, and it is its own island.

import BlueprintShareButton from "@/components/home/blueprints/sections/blueprint-share-button";
import BlueprintStatReadout from "@/components/home/blueprints/sections/blueprint-stat-readout";
import type { ShowcaseBlueprint } from "@/lib/blueprints/schemas";

export default function ShowcaseEngagementBar({
  showcase,
}: {
  readonly showcase: ShowcaseBlueprint;
}) {
  return (
    <div className="mt-5 grid max-w-2xl grid-cols-3 items-center gap-2 lg:flex lg:flex-row">
      <BlueprintStatReadout icon="arrow_upward" count={showcase.upvoteCount} noun="upvotes" />
      <BlueprintStatReadout icon="comment" count={showcase.commentCount} noun="comments" />
      <BlueprintShareButton blueprint={showcase} />
    </div>
  );
}
