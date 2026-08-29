// The wire contract for the store-category ADMIN surface (`/admin/store-categories`).
//
// Separate from `catalog.schemas.ts`, which holds the PUBLIC category shape a shopper
// receives. The two are not the same row: the admin view carries `state`, the search
// synonyms and the two usage counts that decide whether a category can be retired, and none
// of that is a visitor's business. Keeping them apart is what stops a public component from
// accidentally rendering a draft.

import { z } from "zod";

import {
  CATEGORY_ATTRIBUTE_VALUE_KINDS,
  CategoryAttributeChoiceSchema,
  type CategoryAttributeValueKind,
} from "@/lib/store/catalog.schemas";

/**
 * The states a category can hold.
 *
 * `snake_case`-free by coincidence, not by exception — these are Postgres `pgEnum` labels
 * and are sent verbatim in both directions. Do not "correct" the spelling of an enum value.
 */
export const COMMERCE_CATEGORY_STATES = ["draft", "active", "retired"] as const;
export const CommerceCategoryStateSchema = z.enum(COMMERCE_CATEGORY_STATES);
export type CommerceCategoryState = z.infer<typeof CommerceCategoryStateSchema>;

export const COMMERCE_CATEGORY_REQUEST_STATES = ["pending", "approved", "rejected"] as const;
export const CommerceCategoryRequestStateSchema = z.enum(COMMERCE_CATEGORY_REQUEST_STATES);
export type CommerceCategoryRequestState = z.infer<typeof CommerceCategoryRequestStateSchema>;

/**
 * One node as the admin console sees it.
 *
 * `childCount` and `productCount` are DERIVED server-side and appear in no request body. A
 * client able to set them could talk the retire guard into letting a category with listings
 * disappear from browse.
 */
export const AdminStoreCategorySchema = z
  .object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    parentCategoryId: z.string().nullable(),
    siblingOrder: z.number().int(),
    imageUrl: z.string().nullable(),
    state: CommerceCategoryStateSchema,
    searchSynonyms: z.array(z.string()),
    childCount: z.number().int(),
    productCount: z.number().int(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strip();

/**
 * One seller request as the moderation queue renders it.
 *
 * `waitingProducts` are the listings THIS request would rehome — drawn from the request
 * link, never from everything sitting in `misc`. They are NAMED rather than counted because
 * the titles are what let a moderator notice one of them belongs in a category that already
 * exists and route it there instead.
 */
export const CommerceCategoryRequestSchema = z
  .object({
    id: z.string(),
    requestedByUserId: z.string().nullable(),
    requestedOrganizationId: z.string().nullable(),
    proposedName: z.string(),
    proposedParentCategoryId: z.string().nullable(),
    justification: z.string().nullable(),
    state: CommerceCategoryRequestStateSchema,
    reviewedByUserId: z.string().nullable(),
    reviewedAt: z.string().nullable(),
    reviewNote: z.string().nullable(),
    resultingCategoryId: z.string().nullable(),
    waitingProducts: z.array(z.object({ id: z.string(), title: z.string() }).strip()),
    createdAt: z.string(),
  })
  .strip();

export type AdminStoreCategory = z.infer<typeof AdminStoreCategorySchema>;
export type CommerceCategoryRequest = z.infer<typeof CommerceCategoryRequestSchema>;

/**
 * Create input. `imageFile` is OPTIONAL — `image_url` is nullable on the row and `misc`
 * ships without art, so demanding a file here would be a stricter rule than the backend's.
 */
export interface CreateStoreCategoryInput {
  readonly name: string;
  readonly slug: string;
  readonly parentCategoryId: string | null;
  readonly searchSynonyms: readonly string[];
  readonly state: "draft" | "active";
  readonly imageFile: File | null;
}

/**
 * The metadata patch.
 *
 * `slug` IS ABSENT, matching the backend's `.strict()` body. A slug is a public URL
 * identity: it is linked and indexed the moment the category is published, so renaming it
 * silently breaks every one of those. A category that needs a different slug is a new one.
 *
 * `parentCategoryId: null` means "make this a root"; absent means "leave it where it is".
 */
export interface UpdateStoreCategoryInput {
  readonly name?: string;
  readonly parentCategoryId?: string | null;
  readonly searchSynonyms?: readonly string[];
  readonly state?: CommerceCategoryState;
}

export interface SubmitStoreCategoryRequestInput {
  readonly proposedName: string;
  readonly proposedParentCategoryId: string | null;
  readonly justification: string | null;
}

/** Where one waiting listing should land, overriding the verdict's default target. */
export interface StoreCategoryProductAssignment {
  readonly productId: string;
  readonly categoryId: string;
}

/**
 * The verdict, mirroring the backend's discriminated union rather than a looser shape: a
 * rejection REQUIRES a note, an approval does not, and `slug` exists only on the approve arm
 * because a slug is a public URL identity the moderator chooses, not the requester.
 */
export type DecideStoreCategoryRequestInput =
  | {
      readonly decision: "approve";
      readonly name?: string;
      readonly slug: string;
      readonly parentCategoryId?: string | null;
      readonly note?: string;
      readonly productAssignments?: readonly StoreCategoryProductAssignment[];
    }
  | {
      readonly decision: "reject";
      readonly note: string;
      readonly productAssignments?: readonly StoreCategoryProductAssignment[];
    };

/**
 * Turn a display name into the slug the create form proposes.
 *
 * A CONVENIENCE, NOT AN AUTHORITY. The field stays editable and the server re-validates
 * against its own `commerce_category_slug_ck`; this only saves typing. It must match that
 * check's shape — lowercase alphanumeric groups joined by single hyphens — or the form
 * offers a default the backend rejects.
 */
export function toCategorySlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

// --- Category attributes (STORE §20) ---------------------------------------

/**
 * One attribute as the ADMIN console sees it.
 *
 * Two fields the public read does not carry, and both are why this shape is separate:
 * `valueCount` is what the delete guard reads — a definition any listing has answered cannot be
 * removed — and `isInherited` says the row belongs to an ANCESTOR category, so editing it here
 * would rewrite a parent's vocabulary for every sibling leaf.
 */
export const AdminCategoryAttributeSchema = z
  .object({
    id: z.string(),
    categoryId: z.string(),
    attributeKey: z.string(),
    label: z.string(),
    groupLabel: z.string().nullable(),
    valueKind: z.enum(CATEGORY_ATTRIBUTE_VALUE_KINDS),
    unitLabel: z.string().nullable(),
    numericScale: z.number().int().nullable(),
    isFilterable: z.boolean(),
    isRequiredForPublish: z.boolean(),
    position: z.number().int(),
    choices: z.array(CategoryAttributeChoiceSchema),
    valueCount: z.number().int(),
    isInherited: z.boolean(),
  })
  .strip();

export type AdminCategoryAttribute = z.infer<typeof AdminCategoryAttributeSchema>;

/**
 * Create input.
 *
 * ⚠️ THREE FIELDS ARE IDENTITY AND EXIST ONLY HERE, never on the patch: `attributeKey` is what a
 * stored value points at and a saved filter link names; `valueKind` and `numericScale` decide
 * which column every answer lives in and what its integer means. An attribute needing a different
 * one of those is a NEW attribute.
 */
export interface CreateCategoryAttributeInput {
  readonly attributeKey: string;
  readonly label: string;
  readonly groupLabel: string | null;
  readonly valueKind: CategoryAttributeValueKind;
  readonly unitLabel: string | null;
  readonly numericScale: number | null;
  readonly isFilterable: boolean;
  readonly isRequiredForPublish: boolean;
  readonly choices: readonly { readonly choiceValue: string; readonly label: string }[];
}

/** The patch. Presentation and flags only — see the create input for what is missing and why. */
export interface UpdateCategoryAttributeInput {
  readonly label?: string;
  readonly groupLabel?: string | null;
  readonly unitLabel?: string | null;
  readonly isFilterable?: boolean;
  readonly isRequiredForPublish?: boolean;
  readonly choices?: readonly { readonly choiceValue: string; readonly label: string }[];
}

/**
 * A display name into the `attributeKey` the create form proposes.
 *
 * ⚠️ SNAKE_CASE, NOT KEBAB, unlike `toCategorySlug` right above it — and the difference is not
 * cosmetic. A slug is a URL segment, where `-` is the web's word break. An `attributeKey` is a
 * wire identity in the same class as a pgEnum label, and the backend's own CHECK is
 * `^[a-z0-9]+(_[a-z0-9]+)*$`. Producing kebab here would offer a default the server rejects.
 */
export function toAttributeKey(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}
