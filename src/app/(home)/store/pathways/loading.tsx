// Covers `/store/pathways` and `/store/pathways/[pathwaySlug]`. The index is a tile grid; the set
// page opens with a hero and a summary card, which the directory shape holds close enough — and the
// index is the entry point, so its shape is the one a visitor sees first.
import DirectorySkeleton from "@/components/home/store/skeletons/directory-skeleton";

export default function Loading() {
  return <DirectorySkeleton />;
}
