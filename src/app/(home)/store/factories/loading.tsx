// Covers `/store/factories` and everything under it. The directory is a list of rows and is the
// entry point to the subtree, so the list shape is the one that matches what a visitor sees first —
// the same call `providers/loading.tsx` makes for the same reason.
import WorkQueueSkeleton from "@/components/home/store/skeletons/work-queue-skeleton";

export default function Loading() {
  return <WorkQueueSkeleton />;
}
