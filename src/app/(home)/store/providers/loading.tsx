// Covers `/store/providers` and `/store/providers/[organizationSlug]`. The directory is a list of
// rows; the detail page opens with a header and a metrics block, which the record-detail shape
// holds better — but one skeleton per subtree is the house pattern and the directory is the entry
// point, so the list shape is the one that matches what a visitor sees first.
import WorkQueueSkeleton from "@/components/home/store/skeletons/work-queue-skeleton";

export default function Loading() {
  return <WorkQueueSkeleton />;
}
