// TRANSPORT: props-only, with two client islands inside it.
//
// The watch page's four-up engagement row, rebuilt for a teardown. This header used to say "THREE
// OF THE FOUR ARE NOT CONTROLS", because no blueprint engagement table existed — every one was
// hard-FK'd to `video.id` or `product.id`. `teardown_like`, `teardown_save` and `teardown_comment`
// exist now, so LIKE AND SAVE ARE CONTROLS for a signed-in reader.
//
// ⚠️ COMMENT IS STILL A READOUT, AND THAT IS NOT AN OMISSION. The number belongs to the discussion
// section further down the page, which the byline already links to; a second control over the same
// count would be two numbers that can disagree. Share is still its own island.
//
// ⚠️ AND A SIGNED-OUT READER STILL SEES FOUR READOUTS. `TeardownEngagementControls` renders nothing
// without a session, so the bar falls back to the shape it always had. A disabled pill would say
// "you cannot do this"; a readout says "this is a number", which is the true statement for somebody
// with no account. The same applies to a flagged or quarantined teardown — the server gates those
// writes on `published` alone.
//
// STILL A SERVER COMPONENT. The controls and the share trigger are islands; the row is not.
//
// Order follows the watch bar (comment · like · bookmark · share) so a reader who just came from a
// video finds the same shape in the same place.

import BlueprintShareButton from "@/components/home/blueprints/sections/blueprint-share-button";
import BlueprintStatReadout from "@/components/home/blueprints/sections/blueprint-stat-readout";
import TeardownEngagementControls from "@/components/home/blueprints/teardowns/sections/teardown-engagement-controls";
import type { TeardownBlueprint } from "@/lib/blueprints/schemas";

export default function TeardownEngagementBar({
  teardown,
  isViewerSignedIn,
}: {
  readonly teardown: TeardownBlueprint;
  readonly isViewerSignedIn: boolean;
}) {
  // Like and save are gated on `published` alone by the server; the readouts below are the fallback.
  const canEngage = teardown.moderationState === "published";
  return (
    <div className="mt-4 grid max-w-2xl grid-cols-4 items-center gap-2 lg:flex lg:flex-row">
      <BlueprintStatReadout icon="comment" count={teardown.commentCount} noun="comments" />
      {/*
        The island renders the two control pills, or nothing — in which case the two readouts below
        stand in for them. Exactly one of the two branches draws each slot, so the grid keeps its
        four columns either way.
      */}
      <TeardownEngagementControls
        slug={teardown.slug}
        likeCount={teardown.likeCount}
        saveCount={teardown.saveCount}
        isViewerSignedIn={isViewerSignedIn}
        canEngage={canEngage}
      />
      {isViewerSignedIn && canEngage ? null : (
        <>
          <BlueprintStatReadout icon="favorite" count={teardown.likeCount} noun="likes" />
          <BlueprintStatReadout icon="bookmark" count={teardown.saveCount} noun="saves" />
        </>
      )}
      <BlueprintShareButton blueprint={teardown} />
    </div>
  );
}
