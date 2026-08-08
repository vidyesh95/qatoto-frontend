// Covers `/store/find-cofounder` and everything under it. The directory is a list of rows and is the
// entry point to the subtree, so the list shape is what matches what a visitor sees first.
import WorkQueueSkeleton from "@/components/home/store/skeletons/work-queue-skeleton";

export default function Loading() {
  return <WorkQueueSkeleton />;
}
