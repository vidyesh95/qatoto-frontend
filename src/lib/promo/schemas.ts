import { z } from "zod";

/**
 * Wire shapes for the home-page promotional carousel.
 *
 * Every object is `.strip()`, so a backend that adds a field in a minor release does not
 * break the front page (CLAUDE.md Pattern 2).
 */

/**
 * The destination discriminator. These are Postgres `pgEnum` labels and travel VERBATIM in
 * both directions — snake_case, never kebab. `z.enum([...]).safeParse("internal-path")`
 * fails, which is the point.
 */
export const PROMOTIONAL_DESTINATION_KINDS = ["internal_path", "external_url"] as const;

export const PromotionalDestinationKindSchema = z.enum(PROMOTIONAL_DESTINATION_KINDS);
export type PromotionalDestinationKind = z.infer<typeof PromotionalDestinationKindSchema>;

/**
 * A same-site path.
 *
 * THE SECOND LINE OF DEFENCE, not the first. The backend owns this rule and re-validates it
 * on every write (CLAUDE.md §1.1) — but this value becomes an `href` on the front page, and
 * if a protocol-relative `//evil.tld` ever reached `<Link href>` the browser would leave the
 * site. Refusing it at the parse boundary means a bad row fails the contract and the
 * carousel renders nothing, which is the correct failure.
 */
const InternalPathSchema = z
  .string()
  .min(1)
  .max(512)
  .refine((path) => path.startsWith("/"), "An internal destination must start with a slash.")
  .refine(
    (path) => !path.startsWith("//") && !path.startsWith("/\\"),
    "A protocol-relative path leaves the site.",
  );

/**
 * An external advertiser URL.
 *
 * The `https://` prefix check is not redundant with `z.url()`: `z.url()` accepts
 * `javascript:alert(1)` as a well-formed URL, and React renders an `href` verbatim. That is
 * stored XSS on the most-visited page on the site if it ever gets through.
 */
const ExternalUrlSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine((url) => url.startsWith("https://"), "An external destination must use https.")
  .refine((url) => z.url().safeParse(url).success, "That is not a valid web address.");

/**
 * The flat wire row's destination half, parsed as a discriminated union so each arm can
 * carry its own rules. The backend sends `destinationKind` + `destinationValue` as two
 * sibling fields, which is why this is intersected into the row schemas below rather than
 * nested under a key.
 */
const DestinationSchema = z.discriminatedUnion("destinationKind", [
  z.object({
    destinationKind: z.literal("internal_path"),
    destinationValue: InternalPathSchema,
  }),
  z.object({
    destinationKind: z.literal("external_url"),
    destinationValue: ExternalUrlSchema,
  }),
]);

const SlideIdentitySchema = z.object({
  id: z.string().min(1),
  imageUrl: z.url(),
  imageWidthPx: z.number().int().positive(),
  imageHeightPx: z.number().int().positive(),
  altText: z.string(),
});

/** What `GET /promotions/slides` returns. No `position` — the array order IS the order. */
export const PublicPromotionalSlideSchema = SlideIdentitySchema.and(DestinationSchema);
export type PublicPromotionalSlide = z.infer<typeof PublicPromotionalSlideSchema>;

/** What `GET /promotions/admin/slides` returns — retired and scheduled rows included. */
export const AdminPromotionalSlideSchema = SlideIdentitySchema.extend({
  position: z.number().int().nonnegative(),
  isActive: z.boolean(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  createdByUserId: z.string().nullable(),
  updatedByUserId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
}).and(DestinationSchema);
export type AdminPromotionalSlide = z.infer<typeof AdminPromotionalSlideSchema>;

/**
 * The destination as the CAROUSEL wants it — one field per arm, so the component's switch
 * reads `destination.path` or `destination.url` rather than re-deriving which one applies.
 */
export type PromotionalSlideDestination =
  | { readonly kind: "internal_path"; readonly path: string }
  | { readonly kind: "external_url"; readonly url: string };

export function toPromotionalSlideDestination(row: {
  readonly destinationKind: PromotionalDestinationKind;
  readonly destinationValue: string;
}): PromotionalSlideDestination {
  return row.destinationKind === "internal_path"
    ? { kind: "internal_path", path: row.destinationValue }
    : { kind: "external_url", url: row.destinationValue };
}

/** What the carousel component actually renders. Nothing it does not need. */
export interface PromotionalCarouselSlide {
  readonly id: string;
  readonly imageUrl: string;
  readonly imageWidthPx: number;
  readonly imageHeightPx: number;
  readonly altText: string;
  readonly destination: PromotionalSlideDestination;
}

export function toPromotionalCarouselSlide(
  slide: PublicPromotionalSlide,
): PromotionalCarouselSlide {
  return {
    id: slide.id,
    imageUrl: slide.imageUrl,
    imageWidthPx: slide.imageWidthPx,
    imageHeightPx: slide.imageHeightPx,
    altText: slide.altText,
    destination: toPromotionalSlideDestination(slide),
  };
}

/**
 * Create input. The image is a `File`, so this travels as multipart — one round trip, not a
 * create-then-upload pair that could leave an image-less row behind.
 *
 * `startsAt` / `endsAt` are ISO 8601 strings because that is what the backend's
 * `z.iso.datetime()` accepts.
 */
export interface CreatePromotionalSlideInput {
  readonly imageFile: File;
  readonly altText: string;
  readonly destinationKind: PromotionalDestinationKind;
  readonly destinationValue: string;
  readonly isActive: boolean;
  readonly startsAt?: string;
  readonly endsAt?: string;
}

/**
 * Metadata patch. `null` on a schedule bound CLEARS it; omitting the key leaves it alone.
 * Those are different edits, so the two are not collapsed.
 *
 * `destinationKind` and `destinationValue` must be sent together or not at all — the
 * backend 422s otherwise, because a kind with no value cannot be validated.
 */
export interface UpdatePromotionalSlideInput {
  readonly altText?: string;
  readonly destinationKind?: PromotionalDestinationKind;
  readonly destinationValue?: string;
  readonly isActive?: boolean;
  readonly startsAt?: string | null;
  readonly endsAt?: string | null;
}
