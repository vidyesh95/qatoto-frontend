// TRANSPORT: props-only — pure contract. Zod schemas for the /anime hero carousel and the
// public anime catalogue.
//
// Every object is `.strip()`, so a backend that adds a field in a minor release does not
// blank the surface (CLAUDE.md Pattern 2).

import { z } from "zod";

/** Mirrors MAX_ANIME_HERO_SLIDES in the backend's `anime-hero.service.ts`. */
export const MAX_ANIME_HERO_SLIDES = 12;

/**
 * A slide's image source: an https Cloudinary URL for anything an admin uploaded, or a
 * SITE-RELATIVE path for the rows seeded with migration 0149.
 *
 * THE SECOND REFINEMENT IS NOT PARANOIA. This value becomes a `next/image` src on a public
 * page. `//evil.tld/x` starts with "/" — so the obvious `startsWith("/")` check passes it —
 * and a browser reads it as protocol-relative and leaves the site. `z.url()` alone would not
 * help either: it accepts `javascript:alert(1)` as a well-formed URL, which React renders
 * verbatim.
 *
 * THE BACKEND OWNS THIS RULE and re-validates it on every write (CLAUDE.md §1.1); this is
 * the second line of defence. A bad row failing the contract, so the carousel renders
 * nothing, is the correct failure.
 */
const HeroImageSourceSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (source) => source.startsWith("https://") || source.startsWith("/"),
    "An image must be an https URL or a path on this site.",
  )
  .refine(
    (source) => !source.startsWith("//") && !source.startsWith("/\\"),
    "A protocol-relative path leaves the site.",
  );

/** Same rule minus the https arm — the anime hero never links off-site. */
const HeroDestinationPathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine((path) => path.startsWith("/"), "A destination must start with a slash.")
  .refine(
    (path) => !path.startsWith("//") && !path.startsWith("/\\"),
    "A protocol-relative path leaves the site.",
  );

/**
 * What `GET /anime/hero-slides` returns.
 *
 * No `position` — the array order IS the order. `title` is both the overlay caption and the
 * image's alt text, which is what the mock this replaces already did.
 */
export const PublicAnimeHeroSlideSchema = z
  .object({
    id: z.string().min(1),
    imageUrl: HeroImageSourceSchema,
    title: z.string(),
    destinationPath: HeroDestinationPathSchema.nullable(),
  })
  .strip();
export type PublicAnimeHeroSlide = z.infer<typeof PublicAnimeHeroSlideSchema>;

/** What `GET /anime/admin/hero-slides` returns — retired and scheduled rows included. */
export const AdminAnimeHeroSlideSchema = PublicAnimeHeroSlideSchema.extend({
  position: z.number().int().nonnegative(),
  isActive: z.boolean(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  updatedByUserId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strip();
export type AdminAnimeHeroSlide = z.infer<typeof AdminAnimeHeroSlideSchema>;

/**
 * Create input. The image is a `File`, so this travels as multipart — one round trip, not a
 * create-then-upload pair that could leave an image-less row behind.
 *
 * `startsAt` / `endsAt` are ISO 8601 strings because that is what the backend's
 * `z.iso.datetime()` accepts. `destinationPath` is `null` for a decorative slide.
 */
export interface CreateAnimeHeroSlideInput {
  readonly imageFile: File;
  readonly title: string;
  readonly destinationPath: string | null;
  readonly isActive: boolean;
  readonly startsAt?: string;
  readonly endsAt?: string;
}

/**
 * Metadata patch. `null` on the link or a schedule bound CLEARS it; omitting the key leaves
 * it alone. Those are different edits, so the two are not collapsed.
 */
export interface UpdateAnimeHeroSlideInput {
  readonly title?: string;
  readonly destinationPath?: string | null;
  readonly isActive?: boolean;
  readonly startsAt?: string | null;
  readonly endsAt?: string | null;
}

// ---------------------------------------------------------------------------------------
// The public anime catalogue.
// ---------------------------------------------------------------------------------------

export const ANIME_SERIES_STATUSES = ["ongoing", "completed", "hiatus"] as const;
export const AnimeSeriesStatusSchema = z.enum(ANIME_SERIES_STATUSES);
export type AnimeSeriesStatus = z.infer<typeof AnimeSeriesStatusSchema>;

/**
 * snake_case pgEnum labels, sent verbatim in both directions. Never "sub"/"dub".
 * `src/lib/series/schemas.ts` holds the studio-side copy of the same tuple.
 */
export const ANIME_AUDIO_MODES = ["subbed", "dubbed"] as const;
export const AnimeAudioModeSchema = z.enum(ANIME_AUDIO_MODES);

export const ANIME_SERIES_STATUS_LABELS: Readonly<Record<AnimeSeriesStatus, string>> = {
  ongoing: "Ongoing",
  completed: "Completed",
  hiatus: "On hiatus",
};

/**
 * One episode on the detail page.
 *
 * `videoId` IS NOT NULLABLE, unlike the column. The backend lists only episodes whose video
 * is publicly servable — an unreleased one is omitted entirely rather than shown greyed,
 * because an episode title is unreleased content. A nullable field here would invite a UI
 * for a row the server can never send.
 */
export const PublicAnimeEpisodeSchema = z
  .object({
    episodeId: z.string().min(1),
    videoId: z.string().min(1),
    episodeNumber: z.number().int(),
    episodeTitle: z.string(),
    thumbnailUrl: z.string().nullable(),
    durationSeconds: z.number().int().nullable(),
    audioMode: AnimeAudioModeSchema.nullable(),
    audioLanguage: z.string().nullable(),
    ageRating: z.string().nullable(),
    releasedAt: z.string().nullable(),
  })
  .strip();
export type PublicAnimeEpisode = z.infer<typeof PublicAnimeEpisodeSchema>;

export const PublicAnimeSeasonSchema = z
  .object({
    seasonId: z.string().min(1),
    seasonLabel: z.string(),
    position: z.number().int(),
    episodes: z.array(PublicAnimeEpisodeSchema),
  })
  .strip();
export type PublicAnimeSeason = z.infer<typeof PublicAnimeSeasonSchema>;

/** What `GET /anime/series/:seriesSlug` returns. */
export const PublicAnimeSeriesDetailSchema = z
  .object({
    seriesSlug: z.string().min(1),
    title: z.string(),
    description: z.string().nullable(),
    posterUrl: z.string().nullable(),
    genreTags: z.array(z.string()),
    status: AnimeSeriesStatusSchema,
    seasons: z.array(PublicAnimeSeasonSchema),
    updatedAt: z.string(),
  })
  .strip();
export type PublicAnimeSeriesDetail = z.infer<typeof PublicAnimeSeriesDetailSchema>;

/** One row of `GET /anime/series`. Narrower than the tree on purpose. */
export const PublicAnimeSeriesCardSchema = z
  .object({
    seriesSlug: z.string().min(1),
    title: z.string(),
    posterUrl: z.string().nullable(),
    genreTags: z.array(z.string()),
    status: AnimeSeriesStatusSchema,
    watchableEpisodeCount: z.number().int().nonnegative(),
    updatedAt: z.string(),
  })
  .strip();
export type PublicAnimeSeriesCard = z.infer<typeof PublicAnimeSeriesCardSchema>;

/** `GET /anime/series` takes page and limit and NOTHING else — its schema is `.strict()`. */
export interface ListPublicAnimeSeriesFilter {
  readonly page?: number;
  readonly limit?: number;
}
