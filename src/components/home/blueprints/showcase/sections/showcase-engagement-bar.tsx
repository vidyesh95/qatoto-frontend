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
// THE VOTE GUTTER IS NOT PART OF THIS BAR AND MUST NOT BE FOLDED INTO IT. `ShowcaseVoteBox` is the
// fixed 40×44 stacked caret beside the title — the Launch YC shape that distinguishes a showcase
// from a teardown at a glance. Squaring it into a row pill would flatten the one piece of layout
// this arm does not share with the other two.
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
      <BlueprintStatReadout icon="comment" count={showcase.commentCount} noun="comments" />
      <BlueprintStatReadout icon="favorite" count={showcase.likeCount} noun="likes" />
      <BlueprintShareButton blueprint={showcase} />
    </div>
  );
}
