// TRANSPORT: props-only — categories come from `feed-shell`'s server read. Fetches nothing.
//
// "What's on your mind?" — the tile grid.
//
// THE TILES ARE A SUBSET OF THE CHIPS, NOT THE SAME LIST. `GET /feed/categories` returns every
// active category, and each row carries `isTile` and a NULLABLE `imageUrl`. A chip-only
// category legitimately has no image, and rendering it here would put a hole in the grid —
// so `toCategoryTiles` filters on both and narrows `imageUrl` to a plain string in the
// process, which is why no call site here needs a non-null assertion.

import SectionDivider from "@/components/home/feed/section-divider";
import VideoCategoryCard from "@/components/home/feed/video-category-card";
import { toCategoryTiles, type ContentCategory } from "@/lib/feed/schemas";
import { buildFilterHref, type RawSearchParams } from "@/lib/filter-href";

/**
 * Hover tints, cycled by position.
 *
 * PRESENTATION, NOT DATA. The backend's `content_category` table carries an image and a sort
 * order and deliberately no colour — a tint is a theme decision that should change with a
 * redesign, not with a migration. Cycling by index keeps adjacent tiles distinct without
 * anyone having to assign one per category.
 */
const TILE_HOVER_BACKGROUNDS = [
  "group-hover:bg-sky-100",
  "group-hover:bg-emerald-100",
  "group-hover:bg-amber-100",
  "group-hover:bg-violet-100",
  "group-hover:bg-rose-100",
  "group-hover:bg-teal-100",
] as const;

export default function CategoryTilesSection({
  categories,
  searchParams,
}: {
  readonly categories: ContentCategory[];
  readonly searchParams: RawSearchParams;
}) {
  const tiles = toCategoryTiles(categories);

  // No tiles is not a section worth a heading. Unlike the video grids there is no useful empty
  // state here — "no categories" is an operator problem, and an empty bordered panel under a
  // big heading just draws attention to it on every visitor's homepage.
  if (tiles.length === 0) return null;

  return (
    <div>
      <SectionDivider title="WHAT'S ON YOUR MIND?" />
      <div className="grid grid-cols-3 gap-x-3 gap-y-6 px-4 py-2 sm:grid-cols-4 lg:grid-cols-5 lg:px-6 xl:grid-cols-6">
        {tiles.map((tile, index) => (
          <VideoCategoryCard
            key={tile.id}
            imageSrc={tile.imageUrl}
            name={tile.label}
            hoverBg={TILE_HOVER_BACKGROUNDS[index % TILE_HOVER_BACKGROUNDS.length]}
            // Selecting a topic clears `mode` for the same reason a chip does: `?mode=trending`
            // plus a category is a narrower feed than the tile promises.
            href={buildFilterHref(searchParams, { category: tile.slug, mode: undefined })}
          />
        ))}
      </div>
    </div>
  );
}
