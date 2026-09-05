// TRANSPORT: props-only — pure contract. Zod schemas for the /blueprints hero carousel.
//
// Every object is `.strip()`, so a backend that adds a field in a minor release does not
// blank the surface (CLAUDE.md Pattern 2).

import { z } from "zod";

import {
  createHttpsOrSiteRelativeUrlSchema,
  createSitePathSchema,
} from "@/lib/blueprints/url-source.schemas";

/** Mirrors MAX_BLUEPRINT_HERO_SLIDES in the backend's `blueprint-hero.service.ts`. */
export const MAX_BLUEPRINT_HERO_SLIDES = 12;

/**
 * A slide's image source: an https Cloudinary URL for anything an admin uploaded, or a
 * SITE-RELATIVE path for the rows seeded with migration 0149.
 *
 * THE REFINEMENTS LIVE IN `url-source.schemas.ts` and are shared with the rest of the Blueprints
 * surface — a teardown's video poster and document links take the same kind of value from the
 * same backend, and a security check that exists twice is a check that drifts once. That file
 * carries the argument for why `startsWith("/")` alone is not enough.
 */
const HeroImageSourceSchema = createHttpsOrSiteRelativeUrlSchema(2048);

/** Same rule minus the https arm — the Blueprints hero never links off-site. */
const HeroDestinationPathSchema = createSitePathSchema(512);

/**
 * What `GET /blueprints/hero-slides` returns.
 *
 * No `position` — the array order IS the order. `title` is both the overlay caption and the
 * image's alt text, which is what the mock this replaces already did.
 */
export const PublicBlueprintHeroSlideSchema = z
  .object({
    id: z.string().min(1),
    imageUrl: HeroImageSourceSchema,
    title: z.string(),
    destinationPath: HeroDestinationPathSchema.nullable(),
  })
  .strip();
export type PublicBlueprintHeroSlide = z.infer<typeof PublicBlueprintHeroSlideSchema>;

/** What `GET /blueprints/admin/hero-slides` returns — retired and scheduled rows included. */
export const AdminBlueprintHeroSlideSchema = PublicBlueprintHeroSlideSchema.extend({
  position: z.number().int().nonnegative(),
  isActive: z.boolean(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  updatedByUserId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).strip();
export type AdminBlueprintHeroSlide = z.infer<typeof AdminBlueprintHeroSlideSchema>;

/**
 * Create input. The image is a `File`, so this travels as multipart — one round trip, not a
 * create-then-upload pair that could leave an image-less row behind.
 *
 * `startsAt` / `endsAt` are ISO 8601 strings because that is what the backend's
 * `z.iso.datetime()` accepts. `destinationPath` is `null` for a decorative slide.
 */
export interface CreateBlueprintHeroSlideInput {
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
export interface UpdateBlueprintHeroSlideInput {
  readonly title?: string;
  readonly destinationPath?: string | null;
  readonly isActive?: boolean;
  readonly startsAt?: string | null;
  readonly endsAt?: string | null;
}
