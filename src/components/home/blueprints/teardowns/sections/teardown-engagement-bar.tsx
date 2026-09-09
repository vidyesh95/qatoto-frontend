// TRANSPORT: props-only
//
// The watch page's four-up engagement row, rebuilt for a teardown — and THREE OF THE FOUR ARE NOT
// CONTROLS. `VideoEngagementBar` can ship four buttons because every one of them has a route behind
// it (`PUT /videos/:videoId/like`, `/save`, `POST /share`, and a comment thread). A blueprint has
// none: every engagement table in the backend is hard-FK'd to `video.id` or `product.id`, every
// route param is `z.uuid()`-gated so a kebab slug 422s before a query runs, and there is no
// blueprints content table for a row to reference in the first place.
//
// So the counts are `BlueprintStatReadout`s — bare spans — and only Share is a button. That
// asymmetry is the honest render and it is deliberately visible: a reader can tell at a glance which
// one does something, which is exactly what four identical pills would hide.
//
// A SERVER COMPONENT. Only the share trigger needs JavaScript, and it is its own island.
//
// Order follows the watch bar (comment · like · bookmark · share) so a reader who just came from a
// video finds the same shape in the same place.

import BlueprintShareButton from "@/components/home/blueprints/sections/blueprint-share-button";
import BlueprintStatReadout from "@/components/home/blueprints/sections/blueprint-stat-readout";
import type { TeardownBlueprint } from "@/lib/blueprints/schemas";

export default function TeardownEngagementBar({
  teardown,
}: {
  readonly teardown: TeardownBlueprint;
}) {
  return (
    <div className="mt-4 flex max-w-2xl flex-wrap items-center gap-x-1 gap-y-2">
      <BlueprintStatReadout icon="comment" count={teardown.commentCount} noun="comments" />
      <BlueprintStatReadout icon="favorite" count={teardown.likeCount} noun="likes" />
      <BlueprintStatReadout icon="bookmark" count={teardown.saveCount} noun="saves" />
      <BlueprintShareButton blueprint={teardown} />
    </div>
  );
}
