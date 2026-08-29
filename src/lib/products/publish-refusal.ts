// TRANSPORT: props-only — pure classification of a publish failure. No network.
//
// EVERY PUBLISH RETURNED A 422 THE SELLER COULD NEITHER SEE NOR FIX, and this file is half the fix.
//
// §19.9a made five packaging facts required to publish. The wizard sent none of them and read only
// `apiError.message` from the refusal, so the seller got one sentence naming nothing while the
// tokens that say WHICH field to fill sat unread in `errors.missing`. The other half of the fix is
// the packaging fieldset itself — a message that names five fields is no better than a blank one if
// the form has nowhere to type them.
//
// THE BACKEND SENDS NO DOMAIN CODE. `products.controller.ts` puts only `statusCode`, `message` and
// `errors` on the wire, so `ApiError.code` is the string `"422"` for four different refusals. The
// discriminator is therefore the SHAPE OF `errors`, not a code — which is exactly how
// `src/lib/videos/publish-refusal.ts` already reads the video equivalent.

import { ApiRequestError, type ApiError } from "@/lib/http";

import type { ListingCompleteness, ListingRequirementKey } from "@/lib/products/schemas";

export type ProductPublishRefusal =
  /**
   * `INCOMPLETE_FOR_PUBLISH` or `ACTIVE_LISTING_MISSING_PACKAGE_DIMENSIONS`. Both answer 422 with
   * `errors.missing`, and both mean the same thing to the seller — named fields are empty — so
   * they collapse into one variant carrying the backend's own sentence.
   */
  | {
      readonly kind: "incomplete";
      readonly message: string;
      readonly missingFields: readonly string[];
    }
  /**
   * A schema refusal. Its `message` is the deliberately generic "Please check the highlighted
   * fields." and ALL the information is in the per-field entries — including `form`, the reserved
   * key an object-level `.strict()` refusal arrives under.
   */
  | {
      readonly kind: "invalid";
      readonly message: string;
      readonly fieldMessages: readonly {
        readonly field: string;
        readonly messages: readonly string[];
      }[];
    }
  /** Gating, a 403, a network failure, or anything else. The backend's own message is the best copy. */
  | { readonly kind: "failed"; readonly message: string };

/**
 * Human labels for the tokens `errors.missing` can name.
 *
 * The five packaging tokens are the ones that actually happen: they are required to publish and the
 * wizard had no input for any of them, so every listing created before this change hits all five at
 * once. Rendering the raw camelCase key would tell a seller nothing about which control to go back
 * to — and unlike the video case there are five, so the list has to read as a sentence.
 */
const MISSING_FIELD_LABELS: Record<string, string> = {
  title: "a title",
  price: "a price",
  images: "at least one image",
  samplePriceInCents: "a sample price",
  packageLengthMm: "package length",
  packageWidthMm: "package width",
  packageHeightMm: "package height",
  packageGrossWeightGrams: "package gross weight",
  unitsPerPackage: "units per package",
};

/** Falls back to the raw token, deliberately: an unknown key is still better than silence. */
export function toMissingFieldLabel(fieldName: string): string {
  return MISSING_FIELD_LABELS[fieldName] ?? fieldName;
}

/** What each requirement is asking for, for the seller's checklist. */
export const LISTING_REQUIREMENT_LABELS: Record<ListingRequirementKey, string> = {
  title: "Title",
  price: "Price",
  images: "Images",
  samplePrice: "Sample price",
  shippingFacts: "Package size and weight",
  categoryAttributes: "Required category fields",
};

function joinLabels(fieldNames: readonly string[]): string {
  const labels = fieldNames.map(toMissingFieldLabel);
  if (labels.length <= 1) return labels.join("");
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * Classifies a failed publish.
 *
 * `unknown` rather than `ApiError`, matching `describePublishRefusal`, because the studio wizard is
 * on the THROWING convention: `hooks/products.ts` calls `unwrap`, so what reaches a `catch` is an
 * `ApiRequestError` and not a tagged result. The store hooks keep the tagged `ActionResponse` and
 * would hand this an `ApiError` directly — this signature accepts neither blindly.
 */
export function describeProductPublishRefusal(error: unknown): ProductPublishRefusal {
  if (!(error instanceof ApiRequestError)) {
    return { kind: "failed", message: "Couldn't publish this listing. Please try again." };
  }

  const apiError: ApiError = error.apiError;
  const missingFields = apiError.fieldErrors?.missing;

  if (missingFields !== undefined && missingFields.length > 0) {
    return {
      kind: "incomplete",
      // The backend's own sentence PLUS the fields. The sentence alone sends the seller looking
      // without a destination, which is the bug this file exists to close.
      message: `${apiError.message} Add ${joinLabels(missingFields)}.`,
      missingFields: [...missingFields],
    };
  }

  const fieldEntries = Object.entries(apiError.fieldErrors ?? {});
  if (fieldEntries.length > 0) {
    return {
      kind: "invalid",
      message: apiError.message,
      fieldMessages: fieldEntries.map(([field, messages]) => ({ field, messages: [...messages] })),
    };
  }

  return { kind: "failed", message: apiError.message };
}

/**
 * Why the publish control is disabled BEFORE anything is sent, or `null` when it is not.
 *
 * READ OFF `listingCompleteness`, NEVER RECOMPUTED. The backend derives that projection with
 * `projectListingCompleteness` and feeds the SAME function's output to the 422 behind the button
 * (`products.service.ts:261`, publish gate at `:2057`). Deriving a second opinion here — "does this
 * form state look complete to me?" — is how a button ends up enabled against a server that refuses,
 * or greyed out against one that would have accepted.
 *
 * `not_applicable` requirements are skipped, and that matters: `samplePrice` is `not_applicable`
 * whenever `samplePolicy` is `unavailable`, which is the column default, so for most listings
 * `shippingFacts` is the only requirement actually blocking publish.
 */
export function describeProductPublishBlock(product: {
  readonly listingCompleteness: ListingCompleteness;
}): string | null {
  const { listingCompleteness } = product;
  if (listingCompleteness.isComplete) return null;

  const missingFields = listingCompleteness.requirements
    .filter((requirement) => requirement.state === "missing")
    .flatMap((requirement) => requirement.missingFields);

  if (missingFields.length === 0) {
    // `isComplete` is false but nothing named itself. Do not invent a reason — say only what is
    // known, and let the 422 be the one that names fields.
    return "This listing is not complete enough to publish yet.";
  }

  return `Add ${joinLabels(missingFields)} before publishing.`;
}
