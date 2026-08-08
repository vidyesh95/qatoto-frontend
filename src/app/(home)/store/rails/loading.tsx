// A rail page is a card grid, so it takes the catalog-results shape — minus nothing, since that
// skeleton's chip row reads as the strategy caption's line at this size.
import CatalogResultsSkeleton from "@/components/home/store/skeletons/catalog-results-skeleton";

export default function Loading() {
  return <CatalogResultsSkeleton />;
}
