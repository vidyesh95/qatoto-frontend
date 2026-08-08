// Covers both `/store/categories` and `/store/categories/[...slug]`: the index is a tile
// directory and the drill-down opens with a tile grid of children, so one shape holds the
// space for both. The catalog-results skeleton would animate a filter row that neither route
// renders.
import DirectorySkeleton from "@/components/home/store/skeletons/directory-skeleton";

export default function Loading() {
  return <DirectorySkeleton />;
}
