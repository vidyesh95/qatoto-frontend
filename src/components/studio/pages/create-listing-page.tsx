"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStoreCategoryAttributesQuery } from "@/hooks/store/categories";
import type { CategoryAttribute } from "@/lib/store/catalog.schemas";
import {
  useCreateListingMutation,
  useProductQuery,
  useUpdateListingMutation,
  type PendingProductDocument,
  type SaveProgress,
} from "@/hooks/products";
import {
  ListingCategoryPicker,
  type ListingCategoryChoice,
} from "@/components/studio/listing/listing-category-picker";
import { COUNTRY_OPTIONS } from "@/components/home/account/menus/location-menu";
import { toOptionalCountryCode } from "@/components/commerce/composer/composer-input";
import PathwayCandidatePicker from "@/components/studio/pathways/pathway-candidate-picker";
import { countryLabelFromCode } from "@/lib/store/format";
import {
  PRODUCT_RELATION_KINDS,
  PRODUCT_RELATION_KIND_LABELS,
} from "@/lib/store/merchandising.schemas";
import type { SellerProductRelation } from "@/lib/products/schemas";
import {
  centsToDollarString,
  CONDITION_LABEL_TO_SLUG,
  CONDITION_LABELS,
  dollarsToCents,
  PACKAGE_DIMENSION_MM_MAX,
  PACKAGE_GROSS_WEIGHT_GRAMS_MAX,
  PRODUCT_HIGHLIGHT_BODY_MAX_LENGTH,
  PRODUCT_HIGHLIGHT_MAX_COUNT,
  PRODUCT_HIGHLIGHT_TITLE_MAX_LENGTH,
  PRODUCT_SPECIFICATION_GROUP_MAX_LENGTH,
  PRODUCT_SPECIFICATION_KEY_MAX_LENGTH,
  PRODUCT_SPECIFICATION_MAX_COUNT,
  PRODUCT_SPECIFICATION_VALUE_MAX_LENGTH,
  type ProductCustomizationOptionInput,
  PRODUCT_CUSTOMIZATION_CHOICE_MAX_COUNT,
  PRODUCT_CUSTOMIZATION_MEDIA_TYPE_MAX_COUNT,
  PRODUCT_CUSTOMIZATION_SLOT_KEY_PATTERN,
  PRODUCT_CUSTOMIZATION_SLOT_MAX_COUNT,
  PRODUCT_VARIANT_MAX_COUNT,
  PRODUCT_VARIANT_NAME_MAX_LENGTH,
  PRODUCT_VARIANT_SKU_MAX_LENGTH,
  PRODUCT_VARIANT_SLUG_MAX_LENGTH,
  SLUG_TO_CONDITION_LABEL,
  UNITS_PER_PACKAGE_MAX,
  type CreateProductInput,
  type ListingCompleteness,
  type ProductAttributeValueInput,
  type ProductHighlightInput,
  type ProductPricingTierInput,
  type ProductVariantInput,
  type SellerProductDocument,
} from "@/lib/products/schemas";
import {
  type ProductCustomizationKind,
  PRODUCT_CUSTOMIZATION_KINDS,
  PRODUCT_DOCUMENT_KIND_LABELS,
  PRODUCT_DOCUMENT_KINDS,
  ProductDocumentKindSchema,
} from "@/lib/store/products.schemas";
import {
  PRODUCT_SAMPLE_POLICIES,
  PRODUCT_SELLING_STATES,
  ProductSamplePolicySchema,
  ProductSellingStateSchema,
  SAMPLE_POLICY_LABELS,
  type ProductSamplePolicy,
  type ProductSellingState,
} from "@/lib/store/organizations.schemas";
import {
  describeProductPublishBlock,
  describeProductPublishRefusal,
  LISTING_REQUIREMENT_LABELS,
  type ProductPublishRefusal,
} from "@/lib/products/publish-refusal";

/** STORE §21.3. Mirrors `MAX_PRODUCT_DOCUMENTS` in the service; the server is the authority. */
const PRODUCT_DOCUMENT_MAX_COUNT = 5;

/** Bytes to something a seller reads. Same three-branch shape the watch page uses for videos. */
function formatDocumentSizeLabel(byteSize: number): string {
  if (byteSize < 1024) return `${String(byteSize)} B`;
  if (byteSize < 1024 * 1024) return `${(byteSize / 1024).toFixed(0)} KB`;
  return `${(byteSize / (1024 * 1024)).toFixed(1)} MB`;
}

const LISTING_STEPS = [
  { id: "identity", label: "Product Identity" },
  { id: "images", label: "Images & Media" },
  { id: "description", label: "Description" },
  { id: "specifications", label: "Specifications" },
  { id: "highlights", label: "Highlights" },
  { id: "documents", label: "Documents" },
  { id: "pricing", label: "Pricing & Inventory" },
  { id: "variants", label: "Variants" },
  { id: "customization", label: "Customization" },
  { id: "relations", label: "Related products" },
  { id: "review", label: "Review & Publish" },
] as const;

type ListingStepId = (typeof LISTING_STEPS)[number]["id"];

/**
 * Where a step sits, BY ID.
 *
 * Every "Edit" link on the review step and every "Add" link on the publish checklist used to
 * carry a hardcoded ordinal, so inserting `specifications` at index 3 silently pointed all of
 * them one step to the left — a wrong jump, not a crash, which is the kind that ships. Reading
 * the position out of the array means the next inserted step cannot reintroduce it, and a stale
 * id is a compile error rather than a wrong number.
 */
function stepIndexOf(stepId: ListingStepId): number {
  return LISTING_STEPS.findIndex((step) => step.id === stepId);
}

const PRODUCT_CONDITIONS = CONDITION_LABELS;

const PRODUCT_TITLE_MAX_LENGTH = 200;
const MAX_PRODUCT_IMAGES = 9;

/** Backend bounds on the two free-text identity fields (`productFieldShapes`), mirrored. */
const PRODUCT_MODEL_NUMBER_MAX_LENGTH = 120;
const PRODUCT_UNIT_OF_MEASURE_MAX_LENGTH = 40;

/**
 * Common units, offered as autocomplete only.
 *
 * NOT AN ENUM, and it must not become a `<select>`. `unitOfMeasure` is free text up to 40
 * characters on the wire, so a closed list here would refuse units the backend accepts — "reel",
 * "linear foot", "gross" — and a seller with an unusual unit would have nowhere to put it.
 */
/**
 * §21.2. The seller's own words for the three states, which are NOT the buyer's words.
 * `SELLING_STATE_LABELS` in the schemas file is what a shopper reads on a card ("Discontinued");
 * this is what the person deciding reads on a form. Two audiences, two vocabularies, and one map
 * serving both would end up bad at each.
 */
const SELLING_STATE_OPTION_LABELS: Record<ProductSellingState, string> = {
  selling: "Yes — available to order",
  paused: "Paused — temporarily not selling",
  discontinued: "Discontinued — not coming back",
};

/** What each choice actually does, said plainly, because two of the three stop orders. */
const SELLING_STATE_HELP_TEXT: Record<ProductSellingState, string> = {
  selling: "Buyers can order this as normal.",
  paused:
    "The page stays live and buyers can still find it, but nothing can be ordered until you switch this back.",
  discontinued:
    "The page stays live so existing links keep working, and it points buyers at any replacement you have listed. Nothing can be ordered.",
};

const UNIT_OF_MEASURE_SUGGESTIONS = [
  "piece",
  "pair",
  "set",
  "pack",
  "box",
  "carton",
  "pallet",
  "roll",
  "metre",
  "square metre",
  "kilogram",
  "litre",
] as const;

/** A pricing tier as typed in the form (dollar/quantity strings). */
interface PricingTierDraft {
  /** Stable per-row key for the React list; generated on create/hydrate, never sent to the backend. */
  id: string;
  unitPriceInDollars: string;
  minimumOrderQuantity: string;
  /**
   * A27. This band's own maximum lead time, as a form string. EMPTY MEANS "the product's applies",
   * which is what a NULL on the wire means and what every pre-Phase-15 row means.
   *
   * ⚠️ IT HAS TO BE HERE OR THE FORM DESTROYS IT. This ladder is sent as a replace-set on every
   * save, so a field the draft cannot hold is a field the next save overwrites with null.
   */
  leadTimeDays: string;
}

function makeEmptyTierDraft(): PricingTierDraft {
  return {
    id: crypto.randomUUID(),
    unitPriceInDollars: "",
    minimumOrderQuantity: "",
    leadTimeDays: "",
  };
}

/** Hydrates one saved band into its form strings, NULL lead time becoming an empty control. */
function toTierDraft(
  tier: { unitPriceInCents: number; minimumOrderQuantity: number; leadTimeDays: number | null },
  keyPrefix: string,
  tierIndex: number,
): PricingTierDraft {
  return {
    id: `${keyPrefix}-${String(tierIndex)}`,
    unitPriceInDollars: centsToDollarString(tier.unitPriceInCents),
    minimumOrderQuantity: String(tier.minimumOrderQuantity),
    leadTimeDays: tier.leadTimeDays === null ? "" : String(tier.leadTimeDays),
  };
}

/**
 * Form strings to wire values for ONE ladder, shared by the product's and every variant's.
 *
 * A blank row is skipped — an untouched "Add tier" press is not a band. Anything else that will not
 * parse is refused, and `label` says whose ladder is at fault so the message can name it.
 *
 * ⚠️ `leadTimeDays` IS OMITTED WHEN BLANK, NEVER SENT AS NULL — the write schema is `.optional()`
 * inside a `.strict()` object, so a null is a 422 that fails the whole save.
 */
function collectTierDrafts(
  drafts: readonly PricingTierDraft[],
  label: string,
): { tiers: ProductPricingTierInput[] } | { error: string } {
  const tiers: ProductPricingTierInput[] = [];
  for (const tier of drafts) {
    const rawLeadTime = tier.leadTimeDays.trim();
    const isBlankRow =
      tier.unitPriceInDollars.trim().length === 0 &&
      tier.minimumOrderQuantity.trim().length === 0 &&
      rawLeadTime.length === 0;
    if (isBlankRow) continue;

    const unitPriceInCents = dollarsToCents(tier.unitPriceInDollars);
    const minimumOrderQuantity = Number.parseInt(tier.minimumOrderQuantity, 10);
    if (
      unitPriceInCents === null ||
      !Number.isFinite(minimumOrderQuantity) ||
      minimumOrderQuantity < 1
    ) {
      return {
        error: `Each pricing tier ${label} needs a valid unit price and a minimum quantity of at least 1.`,
      };
    }
    const leadTimeDays = Number.parseInt(rawLeadTime, 10);
    if (rawLeadTime.length > 0 && (!Number.isInteger(leadTimeDays) || leadTimeDays < 0)) {
      return { error: `A lead time ${label} must be a whole number of days, or blank.` };
    }
    tiers.push({
      unitPriceInCents,
      minimumOrderQuantity,
      ...(rawLeadTime.length === 0 ? {} : { leadTimeDays }),
    });
  }
  return { tiers };
}

/**
 * A1. One variation as typed in the form.
 *
 * ⚠️ `publicSlug` IS THE IDENTITY THE BACKEND UPSERTS ON, not `savedId`. A slug that changes retires
 * the old row and creates a new one, so `isSlugEdited` exists to stop the name from silently driving
 * it: a NEW row's slug follows what is typed until the seller touches it, and a HYDRATED row's slug
 * is frozen and rendered read-only. Renaming "Sea blue" to "Ocean blue" must not orphan the orders
 * that bought Sea blue.
 *
 * Money and counts are held as STRINGS, like every other numeric control in this form — an input has
 * no number, and the conversion happens once in `collectVariants`.
 */
interface VariantDraft {
  /** Stable per-row key for the React list; generated on create/hydrate, never sent. */
  localId: string;
  /** The server's id when this row was hydrated. Distinguishes an edit from an addition. */
  savedId: string | null;
  name: string;
  publicSlug: string;
  isSlugEdited: boolean;
  sku: string;
  priceInDollars: string;
  stockQuantity: string;
  minimumOrderQuantity: string;
  /**
   * A1. THIS VARIANT'S OWN LADDER, and an empty array means it has none — in which case it falls
   * back to the listing's at price resolution (`commerce-pricing.ts:365-377`).
   *
   * ⚠️ IT IS SENT ON EVERY SAVE AND OMITTING IT DELETES. The backend field is `.default([])`, so
   * an absent key is an empty one, and `replaceProductVariants` deletes this variant's bands
   * unconditionally before re-inserting. Hydrating it is therefore not a convenience — it is what
   * stops a save from wiping a ladder the seller never touched.
   */
  pricingTiers: PricingTierDraft[];
}

/**
 * A18. One customization slot as typed in the form.
 *
 * ⚠️ `slotKey` IS THE IDENTITY THE BACKEND UPSERTS ON — the role `publicSlug` plays for a variant,
 * and the same hazard. A key that changes retires the old slot and creates a new one, so
 * `isSlotKeyEdited` stops the label from silently driving it: a NEW row's key follows what is typed
 * until the seller touches it, and a HYDRATED row's key is frozen and rendered read-only.
 *
 * ⚠️ IT IS SNAKE_CASE, NOT KEBAB. `toVariantSlug` below produces kebab and would be refused by the
 * backend's `/^[a-z0-9]+(_[a-z0-9]+)*$/`, so this has its own deriver.
 *
 * THE TWO LISTS ARE MUTUALLY EXCLUSIVE and only the one matching `customizationKind` is ever sent —
 * the backend refuses a slot carrying both. They are held separately rather than in one field so
 * that switching kind and switching back does not discard what was already typed.
 *
 * `minimumOrderQuantity` is a STRING like every other numeric control here; an input has no number,
 * and the conversion happens once in `collectCustomizationSlots`.
 */
interface CustomizationSlotDraft {
  localId: string;
  savedId: string | null;
  slotKey: string;
  isSlotKeyEdited: boolean;
  label: string;
  customizationKind: ProductCustomizationKind;
  acceptedMediaTypes: string[];
  choiceValues: string[];
  minimumOrderQuantity: string;
}

/** A18. The backend's key shape — snake_case, unlike `toVariantSlug`'s kebab one below. */
function toSlotKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/**
 * The kebab-case slug the backend demands, derived from a name.
 *
 * Client-side only to spare a pointless round trip — `products.schemas.ts` refuses anything that is
 * not kebab-case with a 422, and this produces what it accepts. It is never applied to a hydrated
 * row: see `VariantDraft`.
 */
function toVariantSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PRODUCT_VARIANT_SLUG_MAX_LENGTH);
}

/**
 * One related product the seller is declaring.
 *
 * ⚠️ **ONLY `seller_declared` ROWS LIVE HERE.** Curated and derived relations come back on the read
 * and are shown read-only — resending a curated edge is a 409, and the seller cannot edit a
 * moderator's decision anyway.
 */
interface RelationDraft {
  readonly localKey: string;
  readonly toProductId: string;
  readonly toProductTitle: string;
  readonly relationKind: (typeof PRODUCT_RELATION_KINDS)[number];
}

/**
 * The related-products editor.
 *
 * ⚠️ **THE COLLECT REFUSES A HALF-FILLED ROW RATHER THAN SKIPPING IT** — but there is no such row
 * to refuse, because a row cannot exist without a picked product: the picker creates it. That is
 * the same protection `collectVariants` buys with an explicit error, obtained by construction
 * instead. A dropped relation is a DELETED declaration, not absent content.
 */
function RelationRows({
  relations,
  readOnlyRelations,
  onRelationsChange,
}: {
  readonly relations: readonly RelationDraft[];
  readonly readOnlyRelations: readonly SellerProductRelation[];
  readonly onRelationsChange: (relations: RelationDraft[]) => void;
}) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <div className="space-y-3">
      {relations.length === 0 && readOnlyRelations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Nothing linked yet. Until something is, the “View similar” button stays hidden on your
          listing — two buttons that open empty sheets would be worse than none.
        </p>
      )}

      <ul className="space-y-2">
        {relations.map((relation, relationIndex) => (
          <li
            key={relation.localKey}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border px-3 py-2"
          >
            <span className="flex-1 text-sm">{relation.toProductTitle}</span>
            <select
              value={relation.relationKind}
              onChange={(changeEvent) => {
                const chosen = PRODUCT_RELATION_KINDS.find(
                  (kind) => kind === changeEvent.target.value,
                );
                if (chosen === undefined) return;
                onRelationsChange(
                  relations.map((other, otherIndex) =>
                    otherIndex === relationIndex ? { ...other, relationKind: chosen } : other,
                  ),
                );
              }}
              className="rounded-lg border border-border px-2 py-1.5 text-xs"
            >
              {PRODUCT_RELATION_KINDS.map((relationKind) => (
                <option key={relationKind} value={relationKind}>
                  {PRODUCT_RELATION_KIND_LABELS[relationKind]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                onRelationsChange(relations.filter((_, index) => index !== relationIndex))
              }
              className="cursor-pointer text-xs text-[#8C1D18]"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {readOnlyRelations.length > 0 && (
        <div className="rounded-xl bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium">Confirmed by a moderator, or found automatically</p>
          {/*
            ⚠️ SHOWN BUT NOT EDITABLE, AND SAYING SO IS THE POINT. These survive your saves — the
            server only replaces your own declarations — and re-sending one is refused outright.
            Hiding them would leave a seller wondering why a link they can see is not in their list.
          */}
          <ul className="mt-1 space-y-0.5">
            {readOnlyRelations.map((relation) => (
              <li key={relation.id} className="text-xs text-muted-foreground">
                {relation.toProductTitle} · {PRODUCT_RELATION_KIND_LABELS[relation.relationKind]}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-muted-foreground">These stay whatever you do here.</p>
        </div>
      )}

      {isPickerOpen ? (
        <PathwayCandidatePicker
          onClose={() => setIsPickerOpen(false)}
          onCandidatePicked={(candidate) => {
            const isAlreadyLinked =
              relations.some((other) => other.toProductId === candidate.productId) ||
              readOnlyRelations.some((other) => other.toProductId === candidate.productId);
            if (!isAlreadyLinked) {
              onRelationsChange([
                ...relations,
                {
                  localKey: crypto.randomUUID(),
                  toProductId: candidate.productId,
                  toProductTitle: candidate.productTitle,
                  relationKind: "complements",
                },
              ]);
            }
            setIsPickerOpen(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setIsPickerOpen(true)}
          className="cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium outline -outline-offset-1 outline-border"
        >
          Link a product
        </button>
      )}
    </div>
  );
}

/** An image already stored on the backend (edit mode). */
interface ExistingImage {
  id: string;
  url: string;
}

/**
 * One spec-sheet row as typed in the form.
 *
 * `group` is held as a STRING, never as `string | null`, because a text input has no null. The
 * conversion back to "omit the key" happens once, in `collectListingInput` — sending a hydrated
 * `null` straight back is a 422 against the backend's `.strict()` write schema.
 */
/**
 * One long-form block as typed in the form.
 *
 * `savedId` is the row's server id, present only for a block that came back from a previous save.
 * It is echoed on the next PUT so the block's uploaded image survives an edit to its text —
 * without it the replace-set cannot tell the row survived and the image is discarded.
 *
 * `imageUrl` is what the server currently holds; `imageFile` is a newly picked file that has not
 * been uploaded yet. Both can be set at once: that is a seller replacing an existing image.
 */
interface HighlightDraft {
  /** Stable per-row key for the React list; never sent. */
  readonly localId: string;
  savedId: string | null;
  title: string;
  bodyText: string;
  imageUrl: string | null;
  imageFile: File | null;
  imagePreviewUrl: string | null;
}

interface SpecificationDraft {
  /** Stable per-row key for the React list; generated on add/hydrate, never sent to the backend. */
  id: string;
  key: string;
  value: string;
  group: string;
}

// Multi-step wizard for creating (or, with `productId`, editing) a store listing.
// Submits through the /products API: create draft -> upload each image -> publish.
export default function CreateListingPage({ productId }: { productId?: string }) {
  const router = useRouter();
  const isEditMode = Boolean(productId);

  const productQuery = useProductQuery(productId);
  const createMutation = useCreateListingMutation();
  const updateMutation = useUpdateListingMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [saveProgress, setSaveProgress] = useState<SaveProgress>({ phase: "idle" });
  const [localError, setLocalError] = useState<string | null>(null);

  // Step 1 — product identity
  const [productTitle, setProductTitle] = useState("");
  const [brandName, setBrandName] = useState("");
  /**
   * Either a chosen category or a pending request for one. Null until the seller picks.
   *
   * The old `selectedCategory` held a DISPLAY LABEL and was mapped back to a hardcoded slug
   * at submit time. That taxonomy no longer exists; a listing now carries a `categoryId`
   * read from the store's own tree, or a `categoryRequestId` while it waits in Misc.
   */
  const [categoryChoice, setCategoryChoice] = useState<ListingCategoryChoice | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<string>(PRODUCT_CONDITIONS[0]);
  // Step 1 — the three identity facts the buyer's "Item details" tab has always rendered and no
  // seller could set. Held as typed strings; normalised once, in `collectListingInput`.
  const [modelNumber, setModelNumber] = useState("");
  const [countryOfOriginCode, setCountryOfOriginCode] = useState("");
  const [unitOfMeasure, setUnitOfMeasure] = useState("");

  // Step 2 — images. Preview URLs are created in the pick/drop handlers and revoked on
  // remove or unmount — never from an effect that then setState, which the compiler rejects.
  const [selectedImagePreviews, setSelectedImagePreviews] = useState<
    { file: File; previewUrl: string }[]
  >([]);
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [relations, setRelations] = useState<RelationDraft[]>([]);
  /** Curated and derived rows, shown but never resent. */
  const [readOnlyRelations, setReadOnlyRelations] = useState<SellerProductRelation[]>([]);
  /**
   * Whether the seller reordered the SAVED gallery in this session.
   *
   * A flag rather than a comparison against the hydrated order, because the reorder route wants an
   * exact cover and an ordinary save must not issue one. Reordering the not-yet-uploaded previews
   * does NOT set this: those upload in array order, so their positions already come out right.
   */
  const [hasImageOrderChanged, setHasImageOrderChanged] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const selectedImagePreviewUrlsRef = useRef<string[]>([]);

  // Step 3 — description
  const [productDescription, setProductDescription] = useState("");
  const [keyFeatures, setKeyFeatures] = useState<string[]>([]);
  const [keyFeatureDraft, setKeyFeatureDraft] = useState("");

  // Step 4 — the spec sheet. Free-text key/value pairs, optionally grouped; `group` is what the
  // buyer's spec sheet turns into a tab. There is no canonical vocabulary yet, so two sellers can
  // still spell one field two ways — that is `docs/CATEGORY_ATTRIBUTES_STRUCTURE.md`, not this.
  const [specifications, setSpecifications] = useState<SpecificationDraft[]>([]);
  /**
   * STORE §20. The typed answers, keyed by `attributeKey` and held as STRINGS — a select and a
   * number input both produce strings, and the conversion to a scaled integer happens once, in
   * `collectAttributeValues`, the same way dollars become cents.
   *
   * An absent or empty entry means unanswered, which is a real state: an attribute the seller
   * has not filled in is simply not sent.
   */
  const [attributeAnswers, setAttributeAnswers] = useState<Record<string, string>>({});

  // Step 5 — the long-form body. Object URLs for newly picked files are revoked on remove and on
  // unmount, the same discipline the gallery uses; never from an effect that then setState.
  const [highlights, setHighlights] = useState<HighlightDraft[]>([]);
  const highlightPreviewUrlsRef = useRef<string[]>([]);

  /**
   * A1. The ACTIVE variants only. Retired ones are counted below and deliberately not editable.
   *
   * A retired variant is absent from the payload, which is exactly how it stays retired — the
   * replace-set retires what it does not name, and a row already retired needs no instruction.
   * Editing one would be worse than useless: it cannot be deleted at all, because an order line
   * that bought under it holds a `restrict` FK.
   */
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [retiredVariantCount, setRetiredVariantCount] = useState(0);

  /**
   * A18. The ACTIVE slots only, for exactly the reasons the variants above are.
   *
   * A retired slot is absent from the payload, which is how it stays retired. It is also why the
   * retired ones are counted rather than listed: a slot cannot be deleted at all — the cart, prepare
   * and order lines that named it hold `restrict` FKs — and re-editing one would revive a term the
   * seller withdrew. Re-sending its key DOES revive it, which is right for a deliberate act and
   * wrong for an accident.
   */
  const [customizationSlots, setCustomizationSlots] = useState<CustomizationSlotDraft[]>([]);
  const [retiredCustomizationSlotCount, setRetiredCustomizationSlotCount] = useState(0);

  /**
   * STORE §21.3 — the public PDFs on this listing.
   *
   * Two lists rather than one, matching the images step: `existingDocuments` came back from the
   * server and can only be REMOVED, `pendingDocuments` are files picked here and not yet uploaded.
   * ⚠️ NOTHING UPLOADS ON PICK — it happens on save, once the listing has an id, exactly as the
   * gallery and the highlight images do.
   */
  const [existingDocuments, setExistingDocuments] = useState<readonly SellerProductDocument[]>([]);
  const [removedDocumentIds, setRemovedDocumentIds] = useState<string[]>([]);
  const [pendingDocuments, setPendingDocuments] = useState<PendingProductDocument[]>([]);
  const documentCount =
    existingDocuments.filter((document) => !removedDocumentIds.includes(document.id)).length +
    pendingDocuments.length;

  // Step 5 — pricing & inventory
  const [priceInDollars, setPriceInDollars] = useState("");
  const [compareAtPriceInDollars, setCompareAtPriceInDollars] = useState("");
  const [stockQuantity, setStockQuantity] = useState("");
  const [skuCode, setSkuCode] = useState("");
  const [pricingTiers, setPricingTiers] = useState<PricingTierDraft[]>([]);

  // Step 5 — the three sample facts (A17). Three controls because they answer three questions:
  // whether a sample can be had, what it costs, and how many one order may hold. The cap is not
  // decoration — a sample skips the tier ladder and the minimum order quantity, so an uncapped
  // "sample" line is a bulk order at sample pricing, and on a refundable listing it mints a credit
  // the size of the whole line.
  // Step 5 — §21.2. Whether the seller still sells this. Beside stock because it is the same
  // decision made at a different horizon: stock is "how many right now", this is "at all".
  const [sellingState, setSellingState] = useState<ProductSellingState>("selling");
  const [samplePolicy, setSamplePolicy] = useState<ProductSamplePolicy>("unavailable");
  const [samplePriceInDollars, setSamplePriceInDollars] = useState("");
  const [maximumSampleQuantity, setMaximumSampleQuantity] = useState("1");

  // Step 5 — the five shipping facts (§19.9a). HELD AS TYPED STRINGS IN THEIR OWN UNIT, never as a
  // formatted "52 × 46 × 12 cm" this file would then have to parse back. The unit is in the label
  // and in the field name, and the conversion to an integer happens once, in `collectListingInput`.
  const [packageLengthMm, setPackageLengthMm] = useState("");
  const [packageWidthMm, setPackageWidthMm] = useState("");
  const [packageHeightMm, setPackageHeightMm] = useState("");
  const [packageGrossWeightGrams, setPackageGrossWeightGrams] = useState("");
  const [unitsPerPackage, setUnitsPerPackage] = useState("");

  const [hasPrefilledFromProduct, setHasPrefilledFromProduct] = useState(false);

  const currentStep = LISTING_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === LISTING_STEPS.length - 1;

  const selectedImageFiles = selectedImagePreviews.map((preview) => preview.file);
  const imageCount = existingImages.length + selectedImagePreviews.length;

  // Rows that will survive `collectListingInput`. An added-but-untouched row is dropped there, so
  // the review step must not count it as a specification the listing is going to have.
  /**
   * The category's RESOLVED attribute set — its own definitions plus every ancestor's.
   *
   * Keyed on the SLUG, which the picker does not hold, so this reads only once a real category
   * is chosen. A pending category REQUEST resolves nothing on purpose: the category does not
   * exist yet, so it asks no questions, and the free-text repeater below is the whole answer.
   */
  const selectedCategorySlug =
    categoryChoice?.kind === "category" ? categoryChoice.categorySlug : null;
  const attributesQuery = useStoreCategoryAttributesQuery(selectedCategorySlug);
  const categoryAttributes = attributesQuery.data ?? [];

  // Blocks that will survive `collectHighlights` — both fields are required for a block to save.
  const filledHighlightCount = highlights.filter(
    (highlight) => highlight.title.trim().length > 0 && highlight.bodyText.trim().length > 0,
  ).length;

  const filledSpecificationCount = specifications.filter(
    (specification) => specification.key.trim().length > 0 && specification.value.trim().length > 0,
  ).length;

  // The groups already used on THIS listing, offered back as autocomplete. Free text with no
  // memory is how one product page ends up with a "Materials" tab and a "Material" tab.
  const specificationGroupSuggestions = [
    ...new Set(
      specifications
        .map((specification) => specification.group.trim())
        .filter((groupName) => groupName.length > 0),
    ),
  ];

  // THE REFUSAL IS CLASSIFIED, NOT FLATTENED TO ITS FIRST SENTENCE. `readMutationError` used to read
  // `apiError.message` alone, which discarded `errors.missing` — the only thing on the wire that
  // says WHICH field is empty — and turned a five-field refusal into "This listing is not complete
  // enough to publish." with no destination.
  const mutationError = createMutation.error ?? updateMutation.error;
  const publishRefusal =
    mutationError === null || mutationError === undefined
      ? null
      : describeProductPublishRefusal(mutationError);

  /**
   * Why publish is refused BEFORE the request, read off the server's own projection.
   *
   * ONLY IN EDIT MODE, because `listingCompleteness` is a property of a row that exists. A listing
   * being created has no server-side verdict yet, so the button stays live and the 422 — which now
   * names its fields — is what teaches. Guessing a verdict here would be the second opinion
   * `describeProductPublishBlock` exists to avoid.
   */
  const publishBlockReason =
    productQuery.data === undefined ? null : describeProductPublishBlock(productQuery.data);

  // Prefill the form once from the loaded product (edit mode).
  const loadedProduct = productQuery.data;
  if (isEditMode && !hasPrefilledFromProduct && loadedProduct !== undefined) {
    setHasPrefilledFromProduct(true);
    setProductTitle(loadedProduct.title);
    setBrandName(loadedProduct.brand ?? "");
    // A listing still awaiting a verdict hydrates as its REQUEST, not as Misc: Misc is where
    // it is parked, never a category its owner chose, and showing it as chosen would invite
    // the seller to "confirm" a placement that was never theirs.
    setCategoryChoice(
      loadedProduct.pendingCategoryRequestId === null
        ? // The label is left empty rather than guessed: the read returns the category ID,
          // not its name, and inventing one here would put a wrong word in the review step.
          // The picker fills it in as soon as the seller touches the control.
          {
            kind: "category",
            categoryId: loadedProduct.categoryId,
            displayLabel: "",
            // NULL for the same reason the label is empty: the product read returns an id, not a
            // slug, and the attribute step says "pick your category again to load its fields"
            // rather than guessing one the route would 404.
            categorySlug: null,
          }
        : {
            kind: "request",
            categoryRequestId: loadedProduct.pendingCategoryRequestId,
            displayLabel: "Awaiting review",
          },
    );
    setSelectedCondition(SLUG_TO_CONDITION_LABEL[loadedProduct.condition] ?? PRODUCT_CONDITIONS[0]);
    // Null is UNSTATED and hydrates as an empty control, the same rule the packaging, sample and
    // specification fields follow.
    setModelNumber(loadedProduct.modelNumber ?? "");
    setCountryOfOriginCode(loadedProduct.countryOfOriginCode ?? "");
    setUnitOfMeasure(loadedProduct.unitOfMeasure ?? "");
    setProductDescription(loadedProduct.description ?? "");
    setKeyFeatures(loadedProduct.keyFeatures);
    setPriceInDollars(centsToDollarString(loadedProduct.priceInCents));
    setCompareAtPriceInDollars(
      loadedProduct.compareAtPriceInCents === null
        ? ""
        : centsToDollarString(loadedProduct.compareAtPriceInCents),
    );
    setStockQuantity(String(loadedProduct.stockQuantity));
    setSkuCode(loadedProduct.sku ?? "");
    setSellingState(loadedProduct.sellingState);
    setSamplePolicy(loadedProduct.samplePolicy);
    // NULL IS UNSTATED, NOT FREE — it hydrates as an empty control, the same rule the shipping
    // facts follow below. A zero here would be a declared price of nothing.
    setSamplePriceInDollars(
      loadedProduct.samplePriceInCents === null
        ? ""
        : centsToDollarString(loadedProduct.samplePriceInCents),
    );
    setMaximumSampleQuantity(String(loadedProduct.maximumSampleQuantity));
    // `null` means NEVER MEASURED, and hydrates as an empty control rather than a zero. A zero here
    // would be a declared measurement of nothing, which is the one answer no seller meant to give.
    setPackageLengthMm(
      loadedProduct.packageLengthMm === null ? "" : String(loadedProduct.packageLengthMm),
    );
    setPackageWidthMm(
      loadedProduct.packageWidthMm === null ? "" : String(loadedProduct.packageWidthMm),
    );
    setPackageHeightMm(
      loadedProduct.packageHeightMm === null ? "" : String(loadedProduct.packageHeightMm),
    );
    setPackageGrossWeightGrams(
      loadedProduct.packageGrossWeightGrams === null
        ? ""
        : String(loadedProduct.packageGrossWeightGrams),
    );
    setUnitsPerPackage(
      loadedProduct.unitsPerPackage === null ? "" : String(loadedProduct.unitsPerPackage),
    );
    setRelations(
      loadedProduct.relations
        .filter((relation) => relation.sourceKind === "seller_declared")
        .map((relation) => ({
          localKey: relation.id,
          toProductId: relation.toProductId,
          toProductTitle: relation.toProductTitle,
          relationKind: relation.relationKind,
        })),
    );
    // Everything a moderator confirmed or the graph derived: visible, and deliberately not editable.
    setReadOnlyRelations(
      loadedProduct.relations.filter((relation) => relation.sourceKind !== "seller_declared"),
    );
    setExistingImages(
      loadedProduct.images
        .toSorted((first, second) => first.position - second.position)
        .map((image) => ({ id: image.id, url: image.url })),
    );
    // STORE §21.3. Hydrated as read-only rows: an existing document can be removed but not edited,
    // because its identity is its own content hash.
    setExistingDocuments(
      loadedProduct.documents.toSorted((first, second) => first.position - second.position),
    );
    setRemovedDocumentIds([]);
    setPendingDocuments([]);
    // A27's band lead times ride along now. Before they did, this hydrated without them and the
    // next save wrote null over whatever the seller had declared.
    setPricingTiers(
      loadedProduct.pricingTiers
        .toSorted((first, second) => first.position - second.position)
        .map((tier, tierIndex) => toTierDraft(tier, "hydrated-tier", tierIndex)),
    );
    // `group: null` is UNGROUPED and hydrates as an empty control — the same rule the packaging
    // and sample fields follow above. It must not survive as a null into the next save: the write
    // schema's `group` is `.optional()`, so `{ group: null }` is a 422, and `collectListingInput`
    // is where the key gets omitted again.
    // A1. Actives hydrate as editable rows; retired ones are counted and left out of the payload,
    // which is what keeps them retired. Before `variants` reached the seller schema this array was
    // discarded by `.strip()`, so there was nothing to hydrate from.
    setVariants(
      loadedProduct.variants
        .filter((variant) => variant.state === "active")
        .toSorted((first, second) => first.position - second.position)
        .map((variant, variantIndex) => ({
          localId: `hydrated-variant-${String(variantIndex)}`,
          savedId: variant.id,
          name: variant.name,
          publicSlug: variant.publicSlug,
          // Frozen: the backend upserts on this, so letting the name drive it would retire the row.
          isSlugEdited: true,
          sku: variant.sku ?? "",
          priceInDollars: centsToDollarString(variant.priceInCents),
          stockQuantity: String(variant.stockQuantity),
          // NULL is "not stated", and it must not travel back as a null — the write schema is
          // `.optional()` inside a `.strict()` object, so an empty control omits the key instead.
          minimumOrderQuantity:
            variant.minimumOrderQuantity === null ? "" : String(variant.minimumOrderQuantity),
          // The SELLER read does not inherit, so `[]` here genuinely means "no ladder of its own".
          pricingTiers: variant.pricingTiers
            .toSorted((first, second) => first.position - second.position)
            .map((tier, tierIndex) =>
              toTierDraft(tier, `hydrated-variant-${String(variantIndex)}-tier`, tierIndex),
            ),
        })),
    );
    setRetiredVariantCount(
      loadedProduct.variants.filter((variant) => variant.state === "retired").length,
    );
    setCustomizationSlots(
      loadedProduct.customizationOptions
        .filter((option) => option.state === "active")
        .toSorted((first, second) => first.position - second.position)
        .map((option, optionIndex) => ({
          localId: `hydrated-slot-${String(optionIndex)}`,
          savedId: option.id,
          slotKey: option.slotKey,
          // Frozen: the backend upserts on this, so letting the label drive it would retire the row.
          isSlotKeyEdited: true,
          label: option.label,
          customizationKind: option.customizationKind,
          acceptedMediaTypes: [...option.acceptedMediaTypes],
          choiceValues: [...option.choiceValues],
          // The server defaults an omitted minimum to 1, so 1 reads back as "not stated" and travels
          // as a blank control rather than a number the seller never typed.
          minimumOrderQuantity:
            option.minimumOrderQuantity === 1 ? "" : String(option.minimumOrderQuantity),
        })),
    );
    setRetiredCustomizationSlotCount(
      loadedProduct.customizationOptions.filter((option) => option.state === "retired").length,
    );
    setHighlights(
      loadedProduct.highlights
        .toSorted((first, second) => first.position - second.position)
        .map((highlight, highlightIndex) => ({
          localId: `hydrated-highlight-${String(highlightIndex)}`,
          // ECHOED BACK ON THE NEXT SAVE. Dropping it would discard this block's image.
          savedId: highlight.id,
          title: highlight.title,
          bodyText: highlight.bodyText,
          imageUrl: highlight.imageUrl,
          imageFile: null,
          imagePreviewUrl: null,
        })),
    );
    /**
     * STORE §20. The structured answers back into form strings — the inverse of
     * `collectAttributeValues`, including UNSCALING a number by its definition's scale.
     *
     * The seller's own product read carries these, so an edit shows what was saved even before
     * the category picker has been touched and the attribute DEFINITIONS have loaded.
     */
    setAttributeAnswers(
      Object.fromEntries(
        loadedProduct.attributeValues.map((attributeValue) => [
          attributeValue.attributeKey,
          attributeValue.choiceValue ??
            (attributeValue.numericValueScaled === null
              ? (attributeValue.textValue ?? "")
              : String(
                  attributeValue.numericValueScaled / 10 ** (attributeValue.numericScale ?? 0),
                )),
        ]),
      ),
    );
    setSpecifications(
      loadedProduct.specifications
        .toSorted((first, second) => first.position - second.position)
        .map((specification, specificationIndex) => ({
          id: `hydrated-specification-${String(specificationIndex)}`,
          key: specification.key,
          value: specification.value,
          group: specification.group ?? "",
        })),
    );
  }

  useEffect(() => {
    selectedImagePreviewUrlsRef.current = selectedImagePreviews.map(
      (preview) => preview.previewUrl,
    );
  }, [selectedImagePreviews]);

  useEffect(() => {
    return () => {
      selectedImagePreviewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  useEffect(() => {
    highlightPreviewUrlsRef.current = highlights.flatMap((highlight) =>
      highlight.imagePreviewUrl === null ? [] : [highlight.imagePreviewUrl],
    );
  }, [highlights]);

  useEffect(() => {
    return () => {
      highlightPreviewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, []);

  function handleGoToStepClick(stepIndex: number) {
    if (stepIndex < currentStepIndex) setCurrentStepIndex(stepIndex);
  }

  function handleBackClick() {
    setCurrentStepIndex((previousStepIndex) => Math.max(0, previousStepIndex - 1));
  }

  function handleNextClick() {
    setCurrentStepIndex((previousStepIndex) =>
      Math.min(LISTING_STEPS.length - 1, previousStepIndex + 1),
    );
  }

  function addImageFiles(incomingFiles: FileList | null) {
    if (!incomingFiles) return;
    const imageFiles = Array.from(incomingFiles).filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) return;
    const remainingSlots = Math.max(
      0,
      MAX_PRODUCT_IMAGES - existingImages.length - selectedImagePreviews.length,
    );
    const filesToAdd = imageFiles.slice(0, remainingSlots);
    if (filesToAdd.length === 0) return;
    setSelectedImagePreviews((previousPreviews) => [
      ...previousPreviews,
      ...filesToAdd.map((file) => ({ file, previewUrl: URL.createObjectURL(file) })),
    ]);
  }

  function handleImageDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    addImageFiles(event.dataTransfer.files);
  }

  function handleImageDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(true);
  }

  function handleImageDragLeave(event: React.DragEvent<HTMLDivElement>) {
    // Ignore drag-leave events fired when moving over child elements.
    const dragLeaveTarget = event.relatedTarget;
    if (dragLeaveTarget instanceof Node && event.currentTarget.contains(dragLeaveTarget)) return;
    setIsDraggingOver(false);
  }

  function handleSelectImagesClick() {
    imageInputRef.current?.click();
  }

  function handleImageInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    addImageFiles(event.target.files);
    event.target.value = "";
  }

  function handleRemoveImageClick(imageIndexToRemove: number) {
    setSelectedImagePreviews((previousPreviews) => {
      const previewToRemove = previousPreviews[imageIndexToRemove];
      if (previewToRemove) URL.revokeObjectURL(previewToRemove.previewUrl);
      return previousPreviews.filter((_, imageIndex) => imageIndex !== imageIndexToRemove);
    });
  }

  function handleRemoveExistingImage(imageId: string) {
    setExistingImages((previousImages) => previousImages.filter((image) => image.id !== imageId));
    setRemovedImageIds((previousIds) => [...previousIds, imageId]);
  }

  /**
   * Moves a SAVED image one place along. Index 0 is the cover, so moving to the front is what
   * "Make main image" does — there is no separate primary-image route to call.
   */
  function handleMoveExistingImage(imageIndex: number, direction: -1 | 1) {
    const targetIndex = imageIndex + direction;
    setExistingImages((previousImages) => {
      if (targetIndex < 0 || targetIndex >= previousImages.length) return previousImages;
      const reordered = [...previousImages];
      const moved = reordered[imageIndex];
      const displaced = reordered[targetIndex];
      if (moved === undefined || displaced === undefined) return previousImages;
      reordered[imageIndex] = displaced;
      reordered[targetIndex] = moved;
      return reordered;
    });
    if (targetIndex >= 0) setHasImageOrderChanged(true);
  }

  function handleMakeMainImageClick(imageIndex: number) {
    if (imageIndex === 0) return;
    setExistingImages((previousImages) => {
      const promoted = previousImages[imageIndex];
      if (promoted === undefined) return previousImages;
      return [promoted, ...previousImages.filter((_, index) => index !== imageIndex)];
    });
    setHasImageOrderChanged(true);
  }

  /**
   * Reordering the LOCAL previews needs no flag: they are uploaded in array order, so their
   * positions follow without a reorder request.
   */
  function handleMoveSelectedPreview(previewIndex: number, direction: -1 | 1) {
    const targetIndex = previewIndex + direction;
    setSelectedImagePreviews((previousPreviews) => {
      if (targetIndex < 0 || targetIndex >= previousPreviews.length) return previousPreviews;
      const reordered = [...previousPreviews];
      const moved = reordered[previewIndex];
      const displaced = reordered[targetIndex];
      if (moved === undefined || displaced === undefined) return previousPreviews;
      reordered[previewIndex] = displaced;
      reordered[targetIndex] = moved;
      return reordered;
    });
  }

  function handleAddKeyFeatureClick() {
    const trimmedFeature = keyFeatureDraft.trim();
    if (trimmedFeature.length === 0) return;
    setKeyFeatures((previousFeatures) => [...previousFeatures, trimmedFeature]);
    setKeyFeatureDraft("");
  }

  function handleRemoveKeyFeatureClick(featureIndexToRemove: number) {
    setKeyFeatures((previousFeatures) =>
      previousFeatures.filter((_, featureIndex) => featureIndex !== featureIndexToRemove),
    );
  }

  function handleAddTierClick() {
    setPricingTiers((previousTiers) => [...previousTiers, makeEmptyTierDraft()]);
  }

  function handleTierChange(tierIndex: number, field: keyof PricingTierDraft, value: string) {
    setPricingTiers((previousTiers) =>
      previousTiers.map((tier, index) =>
        index === tierIndex ? { ...tier, [field]: value } : tier,
      ),
    );
  }

  function handleRemoveTierClick(tierIndexToRemove: number) {
    setPricingTiers((previousTiers) =>
      previousTiers.filter((_, tierIndex) => tierIndex !== tierIndexToRemove),
    );
  }

  function handleAddVariantClick() {
    setVariants((previous) => [
      ...previous,
      {
        localId: crypto.randomUUID(),
        savedId: null,
        name: "",
        publicSlug: "",
        isSlugEdited: false,
        sku: "",
        priceInDollars: "",
        stockQuantity: "",
        minimumOrderQuantity: "",
        pricingTiers: [],
      },
    ]);
  }

  /**
   * A NAME CHANGE DRAGS THE SLUG ALONG ONLY ON AN UNSAVED, UNTOUCHED ROW. Everywhere else the slug
   * is the row's identity and changing it retires the variant — see `VariantDraft`.
   */
  function handleVariantNameChange(variantIndex: number, value: string) {
    setVariants((previous) =>
      previous.map((variant, index) => {
        if (index !== variantIndex) return variant;
        const shouldFollowName = variant.savedId === null && !variant.isSlugEdited;
        return {
          ...variant,
          name: value,
          publicSlug: shouldFollowName ? toVariantSlug(value) : variant.publicSlug,
        };
      }),
    );
  }

  function handleVariantSlugChange(variantIndex: number, value: string) {
    setVariants((previous) =>
      previous.map((variant, index) =>
        index === variantIndex
          ? { ...variant, publicSlug: toVariantSlug(value), isSlugEdited: true }
          : variant,
      ),
    );
  }

  function handleVariantFieldChange(
    variantIndex: number,
    field: "sku" | "priceInDollars" | "stockQuantity" | "minimumOrderQuantity",
    value: string,
  ) {
    setVariants((previous) =>
      previous.map((variant, index) =>
        index === variantIndex ? { ...variant, [field]: value } : variant,
      ),
    );
  }

  // A variant's ladder is addressed by BOTH indices — the product ladder's handlers above close
  // over one array and cannot be reused.
  function handleAddVariantTierClick(variantIndex: number) {
    setVariants((previous) =>
      previous.map((variant, index) =>
        index === variantIndex
          ? { ...variant, pricingTiers: [...variant.pricingTiers, makeEmptyTierDraft()] }
          : variant,
      ),
    );
  }

  function handleVariantTierChange(
    variantIndex: number,
    tierIndex: number,
    field: keyof PricingTierDraft,
    value: string,
  ) {
    setVariants((previous) =>
      previous.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              pricingTiers: variant.pricingTiers.map((tier, index2) =>
                index2 === tierIndex ? { ...tier, [field]: value } : tier,
              ),
            }
          : variant,
      ),
    );
  }

  function handleRemoveVariantTierClick(variantIndex: number, tierIndexToRemove: number) {
    setVariants((previous) =>
      previous.map((variant, index) =>
        index === variantIndex
          ? {
              ...variant,
              pricingTiers: variant.pricingTiers.filter(
                (_, tierIndex) => tierIndex !== tierIndexToRemove,
              ),
            }
          : variant,
      ),
    );
  }

  function handleRemoveVariantClick(variantIndexToRemove: number) {
    setVariants((previous) => previous.filter((_, index) => index !== variantIndexToRemove));
  }

  function handleAddHighlightClick() {
    setHighlights((previous) => [
      ...previous,
      {
        localId: crypto.randomUUID(),
        savedId: null,
        title: "",
        bodyText: "",
        imageUrl: null,
        imageFile: null,
        imagePreviewUrl: null,
      },
    ]);
  }

  function handleHighlightTextChange(
    highlightIndex: number,
    field: "title" | "bodyText",
    value: string,
  ) {
    setHighlights((previous) =>
      previous.map((highlight, index) =>
        index === highlightIndex ? { ...highlight, [field]: value } : highlight,
      ),
    );
  }

  function handleHighlightImageChange(highlightIndex: number, imageFile: File | null) {
    setHighlights((previous) =>
      previous.map((highlight, index) => {
        if (index !== highlightIndex) return highlight;
        // Revoke the URL this row was holding before replacing it — one object URL per row at a
        // time, so the unmount sweep below has nothing to miss.
        if (highlight.imagePreviewUrl !== null) URL.revokeObjectURL(highlight.imagePreviewUrl);
        return {
          ...highlight,
          imageFile,
          imagePreviewUrl: imageFile === null ? null : URL.createObjectURL(imageFile),
        };
      }),
    );
  }

  function handleRemoveHighlightClick(highlightIndexToRemove: number) {
    setHighlights((previous) =>
      previous.filter((highlight, index) => {
        if (index === highlightIndexToRemove && highlight.imagePreviewUrl !== null) {
          URL.revokeObjectURL(highlight.imagePreviewUrl);
        }
        return index !== highlightIndexToRemove;
      }),
    );
  }

  function handleAddSpecificationClick() {
    setSpecifications((previousSpecifications) => [
      ...previousSpecifications,
      { id: crypto.randomUUID(), key: "", value: "", group: "" },
    ]);
  }

  function handleSpecificationChange(
    specificationIndex: number,
    field: keyof SpecificationDraft,
    value: string,
  ) {
    setSpecifications((previousSpecifications) =>
      previousSpecifications.map((specification, index) =>
        index === specificationIndex ? { ...specification, [field]: value } : specification,
      ),
    );
  }

  function handleRemoveSpecificationClick(specificationIndexToRemove: number) {
    setSpecifications((previousSpecifications) =>
      previousSpecifications.filter(
        (_, specificationIndex) => specificationIndex !== specificationIndexToRemove,
      ),
    );
  }

  /** Build the request DTO from form state, or return a client-side error. */
  function collectListingInput(): CreateProductInput | { error: string } {
    const title = productTitle.trim();
    if (title.length === 0) return { error: "Product title is required." };

    if (categoryChoice === null) {
      return { error: "Select a category, or request the one you need." };
    }

    const priceInCents = dollarsToCents(priceInDollars);
    if (priceInCents === null) return { error: "Enter a valid price." };

    const compareAtPriceInCents = dollarsToCents(compareAtPriceInDollars);
    const parsedStock = Number.parseInt(stockQuantity, 10);
    const resolvedStock = Number.isFinite(parsedStock) && parsedStock > 0 ? parsedStock : 0;

    const collectedTiers = collectTierDrafts(pricingTiers, "on this listing");
    if ("error" in collectedTiers) return { error: collectedTiers.error };
    const tiers = collectedTiers.tiers;

    /**
     * The spec sheet. A REPLACE-SET: whatever this array holds becomes the listing's whole spec
     * sheet, and an empty one clears it.
     *
     * Three refusals happen here rather than at the server, because each of them is a 422 the
     * form had every fact needed to prevent:
     *
     * - a half-filled row (a key with no value, or a value with no key) — the backend requires
     *   both at 1–80 and 1–500 characters, and a silent drop would lose what the seller typed;
     * - a duplicate key, compared CASE-INSENSITIVELY with the backend's own
     *   `toLocaleLowerCase("en-US")`, because `Material` and `material` collide there and a
     *   case-sensitive check here would let the pair through to a refusal;
     * - more than 40 rows.
     *
     * ⚠️ AND `group` IS OMITTED, NEVER NULLED. The read view returns `string | null`; the write
     * schema is `.optional()` inside a `.strict()` object, so `{ group: null }` fails the whole
     * save. A blank control means "no group", which on the wire means the key is absent.
     */
    const collectedSpecifications: { key: string; value: string; group?: string }[] = [];
    const seenSpecificationKeys = new Set<string>();
    for (const specification of specifications) {
      const key = specification.key.trim();
      const value = specification.value.trim();
      const group = specification.group.trim();
      if (key.length === 0 && value.length === 0 && group.length === 0) continue;
      if (key.length === 0 || value.length === 0) {
        return { error: "Every specification needs both a name and a value." };
      }
      const comparableKey = key.toLocaleLowerCase("en-US");
      if (seenSpecificationKeys.has(comparableKey)) {
        return { error: `"${key}" is listed twice. Each specification name may appear once.` };
      }
      seenSpecificationKeys.add(comparableKey);
      collectedSpecifications.push({ key, value, ...(group.length > 0 ? { group } : {}) });
    }
    if (collectedSpecifications.length > PRODUCT_SPECIFICATION_MAX_COUNT) {
      return {
        error: `A listing can hold up to ${String(PRODUCT_SPECIFICATION_MAX_COUNT)} specifications.`,
      };
    }

    /**
     * A17. The three sample facts, collected as ONE arm per policy rather than three independent
     * fields, because the backend refuses the halfway states: `paid`/`refundable` without a price,
     * and `unavailable` WITH one. Sending a leftover price beside `unavailable` is the mistake that
     * looks harmless in the form and 422s at save.
     */
    const samplePriceInCents = dollarsToCents(samplePriceInDollars);
    if (samplePolicy !== "unavailable" && samplePriceInCents === null) {
      return { error: "A paid or refundable sample needs a sample price." };
    }
    const parsedMaximumSampleQuantity = Number.parseInt(maximumSampleQuantity, 10);
    if (
      samplePolicy !== "unavailable" &&
      (!Number.isFinite(parsedMaximumSampleQuantity) ||
        parsedMaximumSampleQuantity < 1 ||
        parsedMaximumSampleQuantity > 20)
    ) {
      return { error: "Samples per order must be a whole number between 1 and 20." };
    }
    const sampleFacts =
      samplePolicy === "unavailable"
        ? { samplePolicy: "unavailable" as const }
        : {
            samplePolicy,
            samplePriceInCents: samplePriceInCents ?? undefined,
            maximumSampleQuantity: parsedMaximumSampleQuantity,
          };

    const packaging = collectPackagingFacts({
      packageLengthMm,
      packageWidthMm,
      packageHeightMm,
      packageGrossWeightGrams,
      unitsPerPackage,
    });
    if ("error" in packaging) return packaging;

    return {
      title,
      brand: brandName.trim() || undefined,
      // EXACTLY ONE of the two. The backend's create schema refuses both together rather
      // than picking which the seller meant, so spreading the chosen arm is what keeps the
      // two spellings from ever travelling in the same body.
      ...(categoryChoice.kind === "category"
        ? { categoryId: categoryChoice.categoryId }
        : { categoryRequestId: categoryChoice.categoryRequestId }),
      condition: CONDITION_LABEL_TO_SLUG[selectedCondition] ?? "new",
      modelNumber: modelNumber.trim() || undefined,
      // NORMALISED, NOT SENT RAW. The wire regex is `/^[A-Z]{2}$/`, and `toOptionalCountryCode`
      // answers `undefined` for anything else rather than letting "United Kingdom" become a 422
      // the seller has to decode. The control is a select over the app's own country list, so this
      // is a belt on a brace — but it is the same helper every other country field uses.
      countryOfOriginCode: toOptionalCountryCode(countryOfOriginCode),
      unitOfMeasure: unitOfMeasure.trim() || undefined,
      description: productDescription.trim() || undefined,
      keyFeatures,
      priceInCents,
      compareAtPriceInCents: compareAtPriceInCents ?? undefined,
      stockQuantity: resolvedStock,
      sku: skuCode.trim() || undefined,
      pricingTiers: tiers,
      sellingState,
      specifications: collectedSpecifications,
      ...sampleFacts,
      ...packaging.facts,
    };
  }

  /**
   * The highlight plan and its image files, derived from one ordered pass so the map's keys are
   * indices into the same array the PUT sends. A blank block is dropped rather than saved: an
   * untouched row the seller added and never filled in is not content.
   */
  function collectHighlights(): {
    plan: ProductHighlightInput[];
    imageFileByIndex: Map<number, File>;
  } {
    const plan: ProductHighlightInput[] = [];
    const imageFileByIndex = new Map<number, File>();
    for (const highlight of highlights) {
      const title = highlight.title.trim();
      const bodyText = highlight.bodyText.trim();
      if (title.length === 0 || bodyText.length === 0) continue;
      if (highlight.imageFile !== null) imageFileByIndex.set(plan.length, highlight.imageFile);
      plan.push({
        ...(highlight.savedId === null ? {} : { id: highlight.savedId }),
        title,
        bodyText,
      });
    }
    return { plan, imageFileByIndex };
  }

  /**
   * A1. The variant set, form strings to wire values.
   *
   * ⚠️ THIS REFUSES RATHER THAN SKIPPING, WHICH IS THE OPPOSITE OF `collectHighlights`, AND THE
   * DIFFERENCE IS THE WHOLE POINT. A half-filled highlight block is simply not content, so dropping
   * it costs nothing. Dropping a variant RETIRES IT — the payload is a replace-set keyed on slug —
   * so a seller who clears a price by accident would lose the variant, and with it the ability to
   * sell under a slug their past orders name. A blank row is a refusal the seller can see, not a
   * silent deletion they cannot.
   *
   * The ONE row that is skipped is an entirely empty, never-saved one: that is the "Add variant"
   * button pressed and abandoned, which is not an instruction to do anything.
   *
   * `sku` and `minimumOrderQuantity` are OMITTED when blank rather than sent null — the write schema
   * is `.strict()` with `.optional()` keys, so a null is a 422 that fails the whole save.
   */
  function collectVariants(): { variants: ProductVariantInput[] } | { error: string } {
    const collected: ProductVariantInput[] = [];
    for (const [variantIndex, variant] of variants.entries()) {
      const name = variant.name.trim();
      const publicSlug = variant.publicSlug.trim();
      const sku = variant.sku.trim();
      const rawStock = variant.stockQuantity.trim();
      const rawMinimum = variant.minimumOrderQuantity.trim();
      const isUntouchedNewRow =
        variant.savedId === null &&
        name.length === 0 &&
        publicSlug.length === 0 &&
        sku.length === 0 &&
        variant.priceInDollars.trim().length === 0 &&
        rawStock.length === 0 &&
        rawMinimum.length === 0 &&
        variant.pricingTiers.length === 0;
      if (isUntouchedNewRow) continue;

      const label = name.length > 0 ? `"${name}"` : `variant ${String(variantIndex + 1)}`;
      if (name.length === 0) {
        return { error: `Give ${label} a name, or remove the row.` };
      }
      if (publicSlug.length === 0) {
        return { error: `${label} needs a URL slug.` };
      }
      const priceInCents = dollarsToCents(variant.priceInDollars);
      if (priceInCents === null) {
        return { error: `Enter a valid price for ${label}.` };
      }
      const variantStockQuantity = Number(rawStock);
      if (
        rawStock.length === 0 ||
        !Number.isInteger(variantStockQuantity) ||
        variantStockQuantity < 0
      ) {
        return { error: `Enter a whole stock quantity for ${label}.` };
      }
      const minimumOrderQuantity = Number(rawMinimum);
      if (
        rawMinimum.length > 0 &&
        (!Number.isInteger(minimumOrderQuantity) || minimumOrderQuantity < 1)
      ) {
        return {
          error: `The minimum order quantity for ${label} must be a whole number, 1 or more.`,
        };
      }

      // ALWAYS SENT, even when empty. `[]` is the instruction "this variant has no ladder of its
      // own"; omitting the key would be the same instruction with none of the intent, because the
      // backend defaults it to `[]` and then deletes.
      const collectedVariantTiers = collectTierDrafts(variant.pricingTiers, `on ${label}`);
      if ("error" in collectedVariantTiers) return { error: collectedVariantTiers.error };

      collected.push({
        name,
        publicSlug,
        priceInCents,
        stockQuantity: variantStockQuantity,
        ...(sku.length === 0 ? {} : { sku }),
        ...(rawMinimum.length === 0 ? {} : { minimumOrderQuantity }),
        pricingTiers: collectedVariantTiers.tiers,
      });
    }

    if (new Set(collected.map((variant) => variant.publicSlug)).size !== collected.length) {
      return { error: "Two variants share a URL slug. Each one needs its own." };
    }
    const skus = collected.flatMap((variant) => (variant.sku === undefined ? [] : [variant.sku]));
    if (new Set(skus).size !== skus.length) {
      return { error: "Two variants share an SKU. Each one needs its own, or leave it blank." };
    }
    return { variants: collected };
  }

  /**
   * STORE §20. The typed answers, from form strings to the wire's tagged union.
   *
   * ⚠️ A NUMBER IS SCALED HERE AND NOWHERE ELSE. The definition's `numericScale` says how many
   * decimal places the integer carries, so `4.7` with a scale of 2 becomes `470`. Rounding rather
   * than truncating, because a seller typing 4.705 into a 2-decimal field means 4.71 and not 4.70.
   *
   * An unanswered attribute is OMITTED, not sent empty: unanswered is a real state, and the
   * backend's replace-set reads absence as "this listing does not state that".
   */
  function collectAttributeValues(): ProductAttributeValueInput[] {
    const collected: ProductAttributeValueInput[] = [];
    for (const attribute of categoryAttributes) {
      const rawAnswer = (attributeAnswers[attribute.attributeKey] ?? "").trim();
      if (rawAnswer.length === 0) continue;

      switch (attribute.valueKind) {
        case "enum":
          collected.push({
            attributeKey: attribute.attributeKey,
            kind: "enum",
            choiceValue: rawAnswer,
          });
          break;
        case "number": {
          const parsed = Number(rawAnswer);
          if (!Number.isFinite(parsed)) continue;
          collected.push({
            attributeKey: attribute.attributeKey,
            kind: "number",
            numericValueScaled: Math.round(parsed * 10 ** (attribute.numericScale ?? 0)),
          });
          break;
        }
        case "text":
          collected.push({
            attributeKey: attribute.attributeKey,
            kind: "text",
            textValue: rawAnswer,
          });
          break;
        default: {
          const exhaustiveKind: never = attribute.valueKind;
          throw new Error(`Unhandled attribute kind: ${String(exhaustiveKind)}`);
        }
      }
    }
    return collected;
  }

  /**
   * A18. The customization plan, form strings to wire values.
   *
   * ⚠️ THIS REFUSES RATHER THAN SKIPPING, for the same reason `collectVariants` does and not the one
   * `collectHighlights` does. The payload is a replace-set keyed on `slotKey`, so a row silently
   * dropped here is a slot RETIRED on the server — and a retired slot is one buyers can no longer
   * choose, on a listing whose past orders still name it. A blank row is a refusal the seller can
   * see, not a deletion they cannot.
   *
   * The ONE row that is skipped is an entirely empty, never-saved one: the "Add slot" button pressed
   * and abandoned, which is not an instruction to do anything.
   *
   * ⚠️ ONLY THE LIST MATCHING THE KIND IS SENT. The backend refines the two against each other — an
   * upload slot needs accepted media types and NO choice values, and the reverse — so sending the
   * other list is a 422 that fails the whole save. The draft keeps both so switching kind twice does
   * not lose typing; this is where the unused one is dropped.
   *
   * ⚠️ `isRequired` IS NEVER SENT. See `ProductCustomizationOptionInput` — no client submits a
   * customization selection yet, so a required slot would make this listing uncheckoutable by
   * anybody. The backend defaults it to `false`.
   */
  function handleAddCustomizationSlotClick() {
    setCustomizationSlots((previous) => [
      ...previous,
      {
        localId: `slot-${String(Date.now())}-${String(previous.length)}`,
        savedId: null,
        slotKey: "",
        isSlotKeyEdited: false,
        label: "",
        customizationKind: "choice",
        acceptedMediaTypes: [],
        choiceValues: [],
        minimumOrderQuantity: "",
      },
    ]);
  }

  /**
   * ⚠️ REMOVING A HYDRATED ROW RETIRES IT ON SAVE. It is not deleted — buyers who already ordered
   * under it keep naming it — and re-adding the same key revives it. Nothing is written until save,
   * so this is a local removal from the plan rather than an instruction of its own.
   */
  function handleRemoveCustomizationSlotClick(slotIndex: number) {
    setCustomizationSlots((previous) => previous.filter((_, index) => index !== slotIndex));
  }

  function updateCustomizationSlot(
    slotIndex: number,
    patch: Partial<CustomizationSlotDraft>,
  ): void {
    setCustomizationSlots((previous) =>
      previous.map((slot, index) => (index === slotIndex ? { ...slot, ...patch } : slot)),
    );
  }

  /** The label drives the key until the seller touches it, and never on a hydrated row. */
  function handleCustomizationLabelChange(slotIndex: number, label: string) {
    const slot = customizationSlots[slotIndex];
    if (slot === undefined) return;
    updateCustomizationSlot(slotIndex, {
      label,
      ...(slot.isSlotKeyEdited ? {} : { slotKey: toSlotKey(label) }),
    });
  }

  function collectCustomizationSlots():
    | { slots: ProductCustomizationOptionInput[] }
    | { error: string } {
    const collected: ProductCustomizationOptionInput[] = [];
    for (const [slotIndex, slot] of customizationSlots.entries()) {
      const label = slot.label.trim();
      const slotKey = slot.slotKey.trim();
      const rawMinimum = slot.minimumOrderQuantity.trim();
      const isUntouchedNewRow =
        slot.savedId === null &&
        label.length === 0 &&
        slotKey.length === 0 &&
        rawMinimum.length === 0 &&
        slot.acceptedMediaTypes.length === 0 &&
        slot.choiceValues.length === 0;
      if (isUntouchedNewRow) continue;

      const slotLabel = label.length > 0 ? `"${label}"` : `slot ${String(slotIndex + 1)}`;
      if (label.length === 0) {
        return { error: `Give ${slotLabel} a label, or remove the row.` };
      }
      if (slotKey.length === 0) {
        return { error: `${slotLabel} needs a key.` };
      }
      if (!PRODUCT_CUSTOMIZATION_SLOT_KEY_PATTERN.test(slotKey)) {
        return {
          error: `The key for ${slotLabel} must be lower-case words joined by underscores, like "packaging_material".`,
        };
      }
      const minimumOrderQuantity = Number(rawMinimum);
      if (
        rawMinimum.length > 0 &&
        (!Number.isInteger(minimumOrderQuantity) || minimumOrderQuantity < 1)
      ) {
        return {
          error: `The minimum order quantity for ${slotLabel} must be a whole number, 1 or more.`,
        };
      }

      if (slot.customizationKind === "file_upload") {
        if (slot.acceptedMediaTypes.length === 0) {
          return {
            error: `${slotLabel} takes an upload, so it needs at least one accepted file type.`,
          };
        }
        collected.push({
          slotKey,
          label,
          customizationKind: "file_upload",
          acceptedMediaTypes: [...slot.acceptedMediaTypes],
          ...(rawMinimum.length === 0 ? {} : { minimumOrderQuantity }),
        });
        continue;
      }

      if (slot.choiceValues.length === 0) {
        return {
          error: `${slotLabel} is a choice, so it needs at least one option to choose from.`,
        };
      }
      collected.push({
        slotKey,
        label,
        customizationKind: "choice",
        choiceValues: [...slot.choiceValues],
        ...(rawMinimum.length === 0 ? {} : { minimumOrderQuantity }),
      });
    }

    if (new Set(collected.map((slot) => slot.slotKey)).size !== collected.length) {
      return { error: "Two slots share a key. Each one needs its own." };
    }
    return { slots: collected };
  }

  function handleSave(publish: boolean) {
    if (isSaving) return;
    const input = collectListingInput();
    if ("error" in input) {
      setLocalError(input.error);
      return;
    }
    const collectedVariants = collectVariants();
    if ("error" in collectedVariants) {
      setLocalError(collectedVariants.error);
      return;
    }
    // A18. Refuses like the variants above, and before anything is sent — a slot this cannot
    // serialise must stop the save rather than be retired by its own absence.
    const collectedCustomizationSlots = collectCustomizationSlots();
    if ("error" in collectedCustomizationSlots) {
      setLocalError(collectedCustomizationSlots.error);
      return;
    }
    setLocalError(null);
    const collectedHighlights = collectHighlights();
    const collectedAttributeValues = collectAttributeValues();

    if (isEditMode && productId) {
      updateMutation.mutate(
        {
          productId,
          patch: input,
          newImageFiles: selectedImageFiles,
          removedImageIds,
          // Empty unless the seller moved a saved image — see the mutation, which only calls the
          // reorder route when this is non-empty.
          keptImageIdsInOrder: hasImageOrderChanged ? existingImages.map((image) => image.id) : [],
          relations: relations.map((relation) => ({
            toProductId: relation.toProductId,
            relationKind: relation.relationKind,
          })),
          highlights: collectedHighlights.plan,
          highlightImageFileByIndex: collectedHighlights.imageFileByIndex,
          attributeValues: collectedAttributeValues,
          newDocuments: pendingDocuments,
          removedDocumentIds,
          variants: collectedVariants.variants,
          customizationOptions: collectedCustomizationSlots.slots,
          publish,
          onProgress: setSaveProgress,
        },
        { onSuccess: () => router.push("/studio/products") },
      );
      return;
    }

    createMutation.mutate(
      {
        input,
        imageFiles: selectedImageFiles,
        highlights: collectedHighlights.plan,
        highlightImageFileByIndex: collectedHighlights.imageFileByIndex,
        attributeValues: collectedAttributeValues,
        newDocuments: pendingDocuments,
        variants: collectedVariants.variants,
        customizationOptions: collectedCustomizationSlots.slots,
        publish,
        onProgress: setSaveProgress,
      },
      {
        onSuccess: () => {
          if (publish) setIsPublished(true);
          else router.push("/studio/products");
        },
      },
    );
  }

  if (isPublished) {
    return (
      <div className="p-6">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 rounded-2xl border border-border py-24">
          <span className="flex size-32 items-center justify-center rounded-full bg-secondary">
            <Image
              src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={48}
              height={48}
            />
          </span>
          <p className="text-lg font-medium text-foreground">Your listing has been published</p>
          <p className="text-sm text-muted-foreground">
            {productTitle.trim() || "Your product"} is now live on the Qatoto Store.
          </p>
          <Link
            href="/studio/products"
            className="mt-2 flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          >
            <Image
              src="/icons/local_mall_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
            Back to My Products
          </Link>
        </div>
      </div>
    );
  }

  // Edit mode: block the form until the listing loads (or show a load error).
  if (isEditMode && productQuery.isPending) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border py-24">
          <p className="text-sm text-muted-foreground">Loading listing…</p>
        </div>
      </div>
    );
  }
  if (isEditMode && productQuery.isError) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border py-24">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load this listing.</p>
          <Link
            href="/studio/products"
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
          >
            Back to My Products
          </Link>
        </div>
      </div>
    );
  }

  /**
   * STORE §20. The category's typed questions, or an honest sentence about why there are none.
   *
   * NOT A DISCRIMINATED UNION over a query state here, deliberately: the three cases are decided
   * by two booleans the component already holds, and lifting them into a union would be ceremony
   * around an `if`. The exhaustive-switch rule earns its keep where a WIRE value can grow a
   * variant — which is `attribute.valueKind` below, and that one is switched exhaustively.
   */
  function renderCategoryAttributes() {
    if (selectedCategorySlug === null) {
      return (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {isEditMode
            ? "Pick your category again on the first step to load the fields it asks for. Anything you have already typed below is kept."
            : "Choose a category on the first step and the fields it asks for will appear here."}
        </p>
      );
    }
    if (attributesQuery.isPending) {
      return <p className="text-sm text-muted-foreground">Loading this category&apos;s fields…</p>;
    }
    if (categoryAttributes.length === 0) {
      return (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          This category does not define any standard fields yet, so use the free-text rows below.
        </p>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-sm font-medium text-foreground">
            {categoryChoice?.displayLabel === "" || categoryChoice === null
              ? "Category fields"
              : `${categoryChoice.displayLabel} fields`}
          </h3>
          <p className="text-xs text-muted-foreground">
            Every listing in this category answers these, so buyers can filter and compare on them.
            Blank means you have not stated it.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {categoryAttributes.map((attribute) => (
            <li key={attribute.attributeKey} className="flex flex-col gap-1.5">
              <label
                htmlFor={`attribute-${attribute.attributeKey}`}
                className="text-sm font-medium text-foreground"
              >
                {attribute.label}
                {attribute.isRequiredForPublish && <span className="text-[#8C1D18]"> *</span>}
              </label>
              {renderAttributeControl(attribute)}
              {attribute.groupLabel !== null && (
                <p className="text-xs text-muted-foreground">
                  Shows under &ldquo;{attribute.groupLabel}&rdquo; on your listing.
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  /** One control per `valueKind`. Exhaustive, so a fourth kind is a compile error. */
  function renderAttributeControl(attribute: CategoryAttribute) {
    const controlId = `attribute-${attribute.attributeKey}`;
    const answer = attributeAnswers[attribute.attributeKey] ?? "";
    const setAnswer = (value: string) => {
      setAttributeAnswers((previous) => ({ ...previous, [attribute.attributeKey]: value }));
    };

    switch (attribute.valueKind) {
      case "enum":
        return (
          <select
            id={controlId}
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            className="h-12 cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
          >
            <option value="">Not stated</option>
            {attribute.choices.map((choice) => (
              <option key={choice.choiceValue} value={choice.choiceValue}>
                {choice.label}
              </option>
            ))}
          </select>
        );
      case "number":
        return (
          <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-[#1DBDC5]">
            <input
              id={controlId}
              type="number"
              // The step follows the definition's scale: a 2-decimal attribute accepts 0.01, a
              // whole-number one accepts 1. Typing a finer value than the scale holds would be
              // silently rounded at save, so the control refuses it up front.
              step={attribute.numericScale === null ? 1 : 10 ** -attribute.numericScale}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Not stated"
              className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {attribute.unitLabel !== null && (
              <span className="ml-2 text-sm text-muted-foreground">{attribute.unitLabel}</span>
            )}
          </div>
        );
      case "text":
        return (
          <input
            id={controlId}
            type="text"
            value={answer}
            onChange={(event) => setAnswer(event.target.value)}
            placeholder="Not stated"
            className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
          />
        );
      default: {
        const exhaustiveKind: never = attribute.valueKind;
        return exhaustiveKind;
      }
    }
  }

  function renderCurrentStep(stepId: ListingStepId) {
    switch (stepId) {
      case "identity":
        return (
          <StepCard
            title="Product Identity"
            subtitle="Tell buyers what your product is and where it belongs."
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-title" className="text-sm font-medium text-foreground">
                Product title
              </label>
              <input
                id="product-title"
                type="text"
                value={productTitle}
                maxLength={PRODUCT_TITLE_MAX_LENGTH}
                onChange={(event) => setProductTitle(event.target.value)}
                placeholder="e.g. Wireless Noise-Cancelling Headphones, Black"
                className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
              />
              <p className="text-xs text-muted-foreground">
                {productTitle.length}/{PRODUCT_TITLE_MAX_LENGTH} characters
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="brand-name" className="text-sm font-medium text-foreground">
                  Brand
                </label>
                <input
                  id="brand-name"
                  type="text"
                  value={brandName}
                  onChange={(event) => setBrandName(event.target.value)}
                  placeholder="e.g. Qatoto Originals"
                  className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
              </div>

              {/* The picker owns its own reads — it walks the real category tree a level at
                  a time, because the backend accepts only an ACTIVE LEAF. It also carries
                  the "my category isn't listed" path, which is a request rather than a
                  blocker: the listing publishes into Misc and moves when it is approved. */}
              <ListingCategoryPicker
                value={categoryChoice}
                isDisabled={isSaving}
                onChange={setCategoryChoice}
              />
            </div>

            {/* THE THREE FACTS THE BUYER'S "ITEM DETAILS" TAB ALREADY RENDERS. `product-details-sheet.tsx`
                builds that tab from brand, model number, condition, country of origin and unit of
                measure — and until these controls existed, three of those five rows were dropped for
                every listing, because the columns and the write schema were there and no seller could
                reach them. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="model-number" className="text-sm font-medium text-foreground">
                  Model or part number
                </label>
                <input
                  id="model-number"
                  type="text"
                  value={modelNumber}
                  maxLength={PRODUCT_MODEL_NUMBER_MAX_LENGTH}
                  onChange={(event) => setModelNumber(event.target.value)}
                  placeholder="e.g. LM358, DC-4420, SS24-1180"
                  className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
                <p className="text-xs text-muted-foreground">
                  The manufacturer&apos;s own code — a part number, a model number, a style code.
                  Buyers search by it, so it is worth the exact characters.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="unit-of-measure" className="text-sm font-medium text-foreground">
                  Unit of measure
                </label>
                <input
                  id="unit-of-measure"
                  type="text"
                  value={unitOfMeasure}
                  maxLength={PRODUCT_UNIT_OF_MEASURE_MAX_LENGTH}
                  list="unit-of-measure-suggestions"
                  onChange={(event) => setUnitOfMeasure(event.target.value)}
                  placeholder="e.g. piece"
                  className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
                {/* SUGGESTS, NEVER CONSTRAINS. There is no unit enum on the wire — the backend takes
                    free text up to 40 characters — so a <select> here would refuse units it accepts. */}
                <datalist id="unit-of-measure-suggestions">
                  {UNIT_OF_MEASURE_SUGGESTIONS.map((unitName) => (
                    <option key={unitName} value={unitName}>
                      {unitName}
                    </option>
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground">
                  What one unit is, so a quantity means something. Leave it blank if a piece is
                  obvious.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="country-of-origin" className="text-sm font-medium text-foreground">
                Country of origin
              </label>
              <select
                id="country-of-origin"
                value={countryOfOriginCode}
                onChange={(event) => setCountryOfOriginCode(event.target.value)}
                className="h-12 cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
              >
                <option value="">Not stated</option>
                {COUNTRY_OPTIONS.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Where the product is made. Buyers filtering on origin, and customs paperwork, both
                read this.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-foreground">Condition</span>
              <div className="flex gap-2">
                {PRODUCT_CONDITIONS.map((condition) => (
                  <button
                    key={condition}
                    type="button"
                    onClick={() => setSelectedCondition(condition)}
                    className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      selectedCondition === condition
                        ? "bg-primary text-primary-foreground"
                        : "border border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {condition}
                  </button>
                ))}
              </div>
            </div>
          </StepCard>
        );

      case "images":
        return (
          <StepCard
            title="Images & Media"
            subtitle={`Add up to ${MAX_PRODUCT_IMAGES} images. The first image becomes your main listing photo.`}
          >
            <div
              onDrop={handleImageDrop}
              onDragOver={handleImageDragOver}
              onDragLeave={handleImageDragLeave}
              className={`flex flex-col items-center justify-center gap-4 rounded-2xl border py-16 transition-colors ${
                isDraggingOver ? "border-[#1DBDC5] bg-secondary/50" : "border-border"
              }`}
            >
              <span className="flex size-24 items-center justify-center rounded-full bg-secondary">
                <Image
                  src="/icons/add_photo_alternate_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={40}
                  height={40}
                />
              </span>
              <p className="text-base font-medium text-foreground">
                {isDraggingOver ? "Drop images to add" : "Drag and drop product images"}
              </p>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageInputChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleSelectImagesClick}
                className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity hover:opacity-90"
              >
                <Image
                  src="/icons/add_photo_alternate_24dp_000000_FILL1_wght400_GRAD0_opsz24.svg"
                  alt=""
                  width={20}
                  height={20}
                />
                Select images
              </button>
            </div>

            {imageCount > 0 && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
                {existingImages.map((image, imageIndex) => (
                  <div
                    key={image.id}
                    className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30"
                  >
                    {imageIndex === 0 && (
                      <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                        Main image
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveExistingImage(image.id)}
                      aria-label="Remove image"
                      className="absolute top-1.5 right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background transition-opacity hover:opacity-80"
                    >
                      <Image
                        src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        alt=""
                        width={14}
                        height={14}
                      />
                    </button>
                    {/* Remote Cloudinary asset; plain <img> avoids next/image domain config. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt="" className="size-full object-cover" />

                    {/*
                      BUTTONS RATHER THAN DRAG-AND-DROP. There is no drag library in this repo and
                      every other row editor here is button-driven — and buttons are reachable from
                      a keyboard, which a bare drag target is not.
                    */}
                    <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-1 bg-background/85 px-1 py-1">
                      <button
                        type="button"
                        onClick={() => handleMoveExistingImage(imageIndex, -1)}
                        disabled={imageIndex === 0}
                        aria-label="Move image earlier"
                        className="cursor-pointer rounded px-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        &larr;
                      </button>
                      {imageIndex !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleMakeMainImageClick(imageIndex)}
                          className="cursor-pointer rounded px-1 text-[10px] font-medium text-primary"
                        >
                          Make main
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleMoveExistingImage(imageIndex, 1)}
                        disabled={imageIndex === existingImages.length - 1}
                        aria-label="Move image later"
                        className="cursor-pointer rounded px-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-30"
                      >
                        &rarr;
                      </button>
                    </div>
                  </div>
                ))}
                {selectedImagePreviews.map((imagePreview, imageIndex) => (
                  <div
                    key={`${imagePreview.file.name}-${imagePreview.file.size}-${imageIndex}`}
                    className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-secondary/30"
                  >
                    {existingImages.length === 0 && imageIndex === 0 && (
                      <span className="absolute top-1.5 left-1.5 z-10 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                        Main image
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImageClick(imageIndex)}
                      aria-label={`Remove ${imagePreview.file.name}`}
                      className="absolute top-1.5 right-1.5 z-10 flex size-6 cursor-pointer items-center justify-center rounded-full bg-background transition-opacity hover:opacity-80"
                    >
                      <Image
                        src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        alt=""
                        width={14}
                        height={14}
                      />
                    </button>
                    {/* Object URL created when the file was picked; plain <img> for blob: URLs. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview.previewUrl}
                      alt={imagePreview.file.name}
                      className="size-full object-cover"
                    />

                    {/* No "Make main" here: a not-yet-uploaded file can only become the cover if
                        there are no saved images, and in that case moving it to the front of this
                        list is enough — the upload loop follows array order. */}
                    {selectedImagePreviews.length > 1 && (
                      <div className="absolute inset-x-0 bottom-0 z-10 flex items-center justify-between gap-1 bg-background/85 px-1 py-1">
                        <button
                          type="button"
                          onClick={() => handleMoveSelectedPreview(imageIndex, -1)}
                          disabled={imageIndex === 0}
                          aria-label="Move image earlier"
                          className="cursor-pointer rounded px-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          &larr;
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveSelectedPreview(imageIndex, 1)}
                          disabled={imageIndex === selectedImagePreviews.length - 1}
                          aria-label="Move image later"
                          className="cursor-pointer rounded px-1.5 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              {imageCount}/{MAX_PRODUCT_IMAGES} images added
            </p>
          </StepCard>
        );

      case "description":
        return (
          <StepCard
            title="Description"
            subtitle="Describe your product and highlight what makes it worth buying."
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="product-description" className="text-sm font-medium text-foreground">
                Product description
              </label>
              <textarea
                id="product-description"
                value={productDescription}
                onChange={(event) => setProductDescription(event.target.value)}
                placeholder="Describe materials, dimensions, use cases, and anything a buyer should know."
                rows={6}
                className="rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="key-feature" className="text-sm font-medium text-foreground">
                Key features
              </label>
              <div className="flex gap-2">
                <input
                  id="key-feature"
                  type="text"
                  value={keyFeatureDraft}
                  onChange={(event) => setKeyFeatureDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleAddKeyFeatureClick();
                    }
                  }}
                  placeholder="e.g. 30-hour battery life"
                  className="h-12 flex-1 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
                <button
                  type="button"
                  onClick={handleAddKeyFeatureClick}
                  className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-4 text-sm font-medium transition-opacity hover:opacity-90"
                >
                  <Image
                    src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={20}
                    height={20}
                  />
                  Add
                </button>
              </div>
            </div>

            {keyFeatures.length > 0 && (
              <ul className="flex flex-col gap-2">
                {keyFeatures.map((feature, featureIndex) => (
                  <li
                    key={`${feature}-${featureIndex}`}
                    className="flex items-center justify-between rounded-xl border border-border px-4 py-3"
                  >
                    <p className="min-w-0 truncate text-sm text-foreground">{feature}</p>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyFeatureClick(featureIndex)}
                      aria-label={`Remove feature: ${feature}`}
                      className="cursor-pointer transition-opacity hover:opacity-70"
                    >
                      <Image
                        src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                        alt=""
                        width={20}
                        height={20}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </StepCard>
        );

      case "specifications":
        return (
          <StepCard
            title="Specifications"
            subtitle="The facts a buyer compares before they choose. Voltage, material, dimensions — whatever your category turns on."
          >
            {/*
              STORE §20. THE CATEGORY'S OWN QUESTIONS, above the free-text repeater.

              Three states, said apart rather than collapsed into one empty-ish panel: no category
              chosen yet, a category that asks nothing, and a resolved set. The third is the only
              one that renders controls, and a category with no attributes costs the seller a
              single sentence rather than a blank form.
            */}
            {renderCategoryAttributes()}

            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Specification sheet</h3>
                  <p className="text-xs text-muted-foreground">
                    Optional, and worth filling in: this is what the buyer&apos;s comparison table
                    puts side by side.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSpecificationClick}
                  disabled={specifications.length >= PRODUCT_SPECIFICATION_MAX_COUNT}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Image
                    src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                  Add specification
                </button>
              </div>

              {specifications.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No specifications yet. A listing with none still publishes — it just cannot be
                  compared against anything on the fields a buyer cares about.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {specifications.map((specification, specificationIndex) => (
                    <li
                      key={specification.id}
                      className="grid grid-cols-[1fr_1fr_auto] items-end gap-3 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
                    >
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Name</span>
                        <input
                          type="text"
                          value={specification.key}
                          maxLength={PRODUCT_SPECIFICATION_KEY_MAX_LENGTH}
                          onChange={(event) =>
                            handleSpecificationChange(specificationIndex, "key", event.target.value)
                          }
                          placeholder="e.g. Material"
                          className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">Value</span>
                        <input
                          type="text"
                          value={specification.value}
                          maxLength={PRODUCT_SPECIFICATION_VALUE_MAX_LENGTH}
                          onChange={(event) =>
                            handleSpecificationChange(
                              specificationIndex,
                              "value",
                              event.target.value,
                            )
                          }
                          placeholder="e.g. Solid oak"
                          className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          Group (optional)
                        </span>
                        {/* Free text, and it becomes a TAB on the buyer's spec sheet. Blank means
                            ungrouped, which is a real answer rather than a missing one. */}
                        <input
                          type="text"
                          value={specification.group}
                          maxLength={PRODUCT_SPECIFICATION_GROUP_MAX_LENGTH}
                          list="specification-group-suggestions"
                          onChange={(event) =>
                            handleSpecificationChange(
                              specificationIndex,
                              "group",
                              event.target.value,
                            )
                          }
                          placeholder="e.g. Materials"
                          className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecificationClick(specificationIndex)}
                        aria-label={
                          specification.key.trim().length > 0
                            ? `Remove ${specification.key.trim()}`
                            : "Remove specification"
                        }
                        className="flex h-11 cursor-pointer items-center transition-opacity hover:opacity-70"
                      >
                        <Image
                          src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                          alt=""
                          width={20}
                          height={20}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Suggests groups THIS listing already uses, so a seller does not end up with
                  "Materials" and "Material" as two tabs on their own product page. It cannot
                  suggest across listings: nothing on the wire carries other sellers' groups. */}
              <datalist id="specification-group-suggestions">
                {specificationGroupSuggestions.map((groupName) => (
                  <option key={groupName} value={groupName}>
                    {groupName}
                  </option>
                ))}
              </datalist>

              <p className="text-xs text-muted-foreground">
                {specifications.length}/{PRODUCT_SPECIFICATION_MAX_COUNT} specifications added
              </p>
            </div>
          </StepCard>
        );

      case "variants":
        return (
          <StepCard
            title="Variants"
            subtitle="Sizes, colours, voltages — the versions of this listing a buyer picks between."
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Variations</h3>
                  <p className="text-xs text-muted-foreground">
                    Optional. Leave this empty and the listing sells as one thing at the price on
                    the previous step.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddVariantClick}
                  disabled={variants.length >= PRODUCT_VARIANT_MAX_COUNT}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Image
                    src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                  Add variant
                </button>
              </div>

              {/* The three consequences of adding one, stated here rather than discovered at
                  checkout. Each is enforced server-side. */}
              {variants.length > 0 && (
                <ul className="flex flex-col gap-1 rounded-xl bg-secondary/40 p-3 text-xs leading-4 text-muted-foreground">
                  <li>Price and stock come from the variant, not from the Pricing step.</li>
                  <li>Your listing shows a &ldquo;from&rdquo; price across the variants below.</li>
                  <li>A buyer must choose one before they can add this listing to a cart.</li>
                  <li>
                    A variant with no volume pricing of its own uses the bulk tiers you set on the
                    Pricing step; giving it tiers replaces them for that variant.
                  </li>
                </ul>
              )}

              {variants.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No variants. Add one only if buyers genuinely choose between versions — a listing
                  sold one way is simpler for everyone.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {variants.map((variant, variantIndex) => (
                    <li
                      key={variant.localId}
                      className="flex flex-col gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-medium text-muted-foreground">
                          Variant {variantIndex + 1}
                          {variant.savedId !== null && " · saved"}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveVariantClick(variantIndex)}
                          aria-label={
                            variant.name.trim().length > 0
                              ? `Remove ${variant.name.trim()}`
                              : `Remove variant ${String(variantIndex + 1)}`
                          }
                          className="flex cursor-pointer items-center transition-opacity hover:opacity-70"
                        >
                          <Image
                            src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                            alt=""
                            width={20}
                            height={20}
                          />
                        </button>
                      </div>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Name</span>
                        <input
                          type="text"
                          value={variant.name}
                          maxLength={PRODUCT_VARIANT_NAME_MAX_LENGTH}
                          placeholder="Sea blue"
                          onChange={(event) =>
                            handleVariantNameChange(variantIndex, event.target.value)
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">URL slug</span>
                        <input
                          type="text"
                          value={variant.publicSlug}
                          maxLength={PRODUCT_VARIANT_SLUG_MAX_LENGTH}
                          readOnly={variant.savedId !== null}
                          placeholder="sea-blue"
                          onChange={(event) =>
                            handleVariantSlugChange(variantIndex, event.target.value)
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none read-only:cursor-not-allowed read-only:opacity-60 focus:border-foreground"
                        />
                        <span className="text-[11px] leading-4 text-muted-foreground">
                          {variant.savedId === null
                            ? "Set once. It identifies this variant afterwards, so it cannot be changed later."
                            : "Fixed — past orders name this variant by its slug."}
                        </span>
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Price</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={variant.priceInDollars}
                            placeholder="0.00"
                            onChange={(event) =>
                              handleVariantFieldChange(
                                variantIndex,
                                "priceInDollars",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">Stock</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={variant.stockQuantity}
                            placeholder="0"
                            onChange={(event) =>
                              handleVariantFieldChange(
                                variantIndex,
                                "stockQuantity",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                          />
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            Min. order
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={variant.minimumOrderQuantity}
                            placeholder="Optional"
                            onChange={(event) =>
                              handleVariantFieldChange(
                                variantIndex,
                                "minimumOrderQuantity",
                                event.target.value,
                              )
                            }
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                          />
                        </label>
                      </div>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">SKU</span>
                        <input
                          type="text"
                          value={variant.sku}
                          maxLength={PRODUCT_VARIANT_SKU_MAX_LENGTH}
                          placeholder="Optional, unique within this listing"
                          onChange={(event) =>
                            handleVariantFieldChange(variantIndex, "sku", event.target.value)
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-foreground"
                        />
                      </label>

                      {/* THIS VARIANT'S OWN LADDER. Leaving it empty is a real answer — the
                          listing's bulk tiers then apply. It is rendered here rather than on the
                          Pricing step because a variant ladder REPLACES the listing's rather than
                          merging with it (A1), so the two must never look like one list. */}
                      <div className="flex flex-col gap-2 border-t border-border pt-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <span className="text-xs font-medium text-foreground">
                              Volume pricing for this variant
                            </span>
                            <p className="text-[11px] leading-4 text-muted-foreground">
                              Optional. With none, this variant uses the listing&apos;s bulk tiers.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAddVariantTierClick(variantIndex)}
                            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary/50"
                          >
                            <Image
                              src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                              alt=""
                              width={16}
                              height={16}
                            />
                            Add tier
                          </button>
                        </div>
                        <PricingTierRows
                          tiers={variant.pricingTiers}
                          onTierChange={(tierIndex, field, value) =>
                            handleVariantTierChange(variantIndex, tierIndex, field, value)
                          }
                          onRemoveTier={(tierIndex) =>
                            handleRemoveVariantTierClick(variantIndex, tierIndex)
                          }
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Retired variants are shown as a count and nothing more: they cannot be deleted —
                  an order line that bought one holds a `restrict` FK — and re-editing one would
                  bring back a version the seller withdrew. */}
              {retiredVariantCount > 0 && (
                <p className="text-xs leading-4 text-muted-foreground">
                  {retiredVariantCount} retired variant{retiredVariantCount === 1 ? " is" : "s are"}{" "}
                  kept out of sight so past orders still name what was bought. Removing a variant
                  above retires it the same way — it stops selling, it is not deleted.
                </p>
              )}

              <p className="text-xs leading-4 text-muted-foreground">
                A variant&apos;s own volume pricing replaces the listing&apos;s rather than adding
                to it. Give a variant no tiers and the Pricing step&apos;s bulk tiers apply to it.
              </p>
            </div>
          </StepCard>
        );

      case "highlights":
        return (
          <StepCard
            title="Highlights"
            subtitle="The long-form part of your listing — a heading, a paragraph and a picture, repeated down the page."
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Detail blocks</h3>
                  <p className="text-xs text-muted-foreground">
                    Optional. This is where a buyer reads what the photos cannot show — finish,
                    tolerances, what is in the box.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddHighlightClick}
                  disabled={highlights.length >= PRODUCT_HIGHLIGHT_MAX_COUNT}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Image
                    src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                  Add block
                </button>
              </div>

              {highlights.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No detail blocks yet. Your listing still publishes without them — they are the
                  part buyers scroll through once the photos have their attention.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {highlights.map((highlight, highlightIndex) => (
                    <li
                      key={highlight.localId}
                      className="flex flex-col gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-medium text-muted-foreground">
                          Block {highlightIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHighlightClick(highlightIndex)}
                          aria-label={
                            highlight.title.trim().length > 0
                              ? `Remove ${highlight.title.trim()}`
                              : `Remove block ${String(highlightIndex + 1)}`
                          }
                          className="flex cursor-pointer items-center transition-opacity hover:opacity-70"
                        >
                          <Image
                            src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                            alt=""
                            width={20}
                            height={20}
                          />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={highlight.title}
                        maxLength={PRODUCT_HIGHLIGHT_TITLE_MAX_LENGTH}
                        onChange={(event) =>
                          handleHighlightTextChange(highlightIndex, "title", event.target.value)
                        }
                        placeholder="Heading — e.g. Solid oak, not veneer"
                        className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                      />
                      <textarea
                        value={highlight.bodyText}
                        maxLength={PRODUCT_HIGHLIGHT_BODY_MAX_LENGTH}
                        onChange={(event) =>
                          handleHighlightTextChange(highlightIndex, "bodyText", event.target.value)
                        }
                        rows={3}
                        placeholder="What a buyer should know about this point."
                        className="rounded-lg border border-border bg-transparent p-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                      />

                      <div className="flex items-center gap-3">
                        {/* The picked file wins over the stored URL: that is a seller replacing an
                            image, and showing the old one would misreport what is about to save. */}
                        {(highlight.imagePreviewUrl ?? highlight.imageUrl) !== null && (
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={highlight.imagePreviewUrl ?? highlight.imageUrl ?? ""}
                              alt=""
                              className="size-full object-cover"
                            />
                          </div>
                        )}
                        <label className="cursor-pointer text-xs font-medium text-[#1DBDC5] underline-offset-2 hover:underline">
                          {(highlight.imagePreviewUrl ?? highlight.imageUrl) === null
                            ? "Add an image"
                            : "Replace image"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(event) =>
                              handleHighlightImageChange(
                                highlightIndex,
                                event.target.files?.[0] ?? null,
                              )
                            }
                          />
                        </label>
                        {highlight.imageFile !== null && (
                          <span className="text-xs text-muted-foreground">
                            Uploads when you save.
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <p className="text-xs text-muted-foreground">
                {highlights.length}/{PRODUCT_HIGHLIGHT_MAX_COUNT} blocks added
              </p>
            </div>
          </StepCard>
        );

      case "documents":
        return (
          <StepCard
            title="Documents"
            subtitle="Datasheets, manuals and care guides buyers can download. PDF, up to 25 MB each."
          >
            <div className="flex flex-col gap-3">
              {/*
                ⚠️ NOTHING HERE SAYS THE FILE IS SCANNED, and no copy added later may. There is no
                virus scan on this path — see migration `0155`. Telling a seller their upload is
                "being checked" would be a claim about a check nobody performs.
              */}
              <p className="rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
                Buyers download these straight from the listing, so upload only what you are happy
                to publish. Up to {String(PRODUCT_DOCUMENT_MAX_COUNT)} files.
              </p>

              {existingDocuments
                .filter((document) => !removedDocumentIds.includes(document.id))
                .map((document) => (
                  <div
                    key={document.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <span className="min-w-0 text-sm">
                      <span className="block truncate font-medium">{document.fileName}</span>
                      <span className="text-xs text-muted-foreground">
                        {PRODUCT_DOCUMENT_KIND_LABELS[document.documentKind]} ·{" "}
                        {formatDocumentSizeLabel(document.byteSize)}
                      </span>
                    </span>
                    {/* Removed on SAVE, not now — the same deferral the gallery uses. */}
                    <button
                      type="button"
                      onClick={() =>
                        setRemovedDocumentIds((previous) => [...previous, document.id])
                      }
                      className="cursor-pointer text-xs text-[#8C1D18] underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}

              {pendingDocuments.map((pending, pendingIndex) => (
                <div
                  key={`${pending.file.name}-${String(pendingIndex)}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border px-3 py-2"
                >
                  <span className="min-w-0 text-sm">
                    <span className="block truncate font-medium">{pending.file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDocumentSizeLabel(pending.file.size)} · uploads when you save
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <select
                      value={pending.documentKind}
                      onChange={(changeEvent) => {
                        // Parsed, not asserted: the value comes off a DOM element, which is
                        // untrusted input like any other. A select the browser could not have
                        // produced falls back rather than widening the type by fiat.
                        const parsedKind = ProductDocumentKindSchema.safeParse(
                          changeEvent.target.value,
                        );
                        if (!parsedKind.success) return;
                        const nextKind = parsedKind.data;
                        setPendingDocuments((previous) =>
                          previous.map((entry, entryIndex) =>
                            entryIndex === pendingIndex
                              ? { ...entry, documentKind: nextKind }
                              : entry,
                          ),
                        );
                      }}
                      className="h-9 cursor-pointer rounded-lg border border-border bg-transparent px-2 text-xs"
                    >
                      {PRODUCT_DOCUMENT_KINDS.map((documentKind) => (
                        <option key={documentKind} value={documentKind}>
                          {PRODUCT_DOCUMENT_KIND_LABELS[documentKind]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDocuments((previous) =>
                          previous.filter((_, entryIndex) => entryIndex !== pendingIndex),
                        )
                      }
                      className="cursor-pointer text-xs text-[#8C1D18] underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Add a PDF</span>
                <input
                  type="file"
                  accept="application/pdf"
                  disabled={documentCount >= PRODUCT_DOCUMENT_MAX_COUNT}
                  onChange={(changeEvent) => {
                    const picked = changeEvent.target.files?.[0];
                    // The cap is the server's rule; refusing here saves a round-trip that would
                    // only come back 409. It is fast feedback, not the enforcement.
                    if (picked && documentCount < PRODUCT_DOCUMENT_MAX_COUNT) {
                      setPendingDocuments((previous) => [
                        ...previous,
                        { file: picked, documentKind: "datasheet" },
                      ]);
                    }
                    changeEvent.target.value = "";
                  }}
                  className="text-sm"
                />
              </label>

              <p className="text-xs text-muted-foreground">
                {String(documentCount)}/{String(PRODUCT_DOCUMENT_MAX_COUNT)} documents
              </p>
            </div>
          </StepCard>
        );

      case "pricing":
        return (
          <StepCard
            title="Pricing & Inventory"
            subtitle="Set your price and let buyers know how many are available."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="product-price" className="text-sm font-medium text-foreground">
                  Price
                </label>
                <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-[#1DBDC5]">
                  <span className="mr-2 text-sm text-muted-foreground">$</span>
                  <input
                    id="product-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={priceInDollars}
                    onChange={(event) => setPriceInDollars(event.target.value)}
                    placeholder="0.00"
                    className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="compare-at-price" className="text-sm font-medium text-foreground">
                  Compare-at price
                </label>
                <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-[#1DBDC5]">
                  <span className="mr-2 text-sm text-muted-foreground">$</span>
                  <input
                    id="compare-at-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={compareAtPriceInDollars}
                    onChange={(event) => setCompareAtPriceInDollars(event.target.value)}
                    placeholder="0.00"
                    className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Shown crossed out next to your price to highlight a deal.
                </p>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="stock-quantity" className="text-sm font-medium text-foreground">
                  Quantity
                </label>
                <input
                  id="stock-quantity"
                  type="number"
                  min="0"
                  value={stockQuantity}
                  onChange={(event) => setStockQuantity(event.target.value)}
                  placeholder="0"
                  className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="sku-code" className="text-sm font-medium text-foreground">
                  SKU
                </label>
                <input
                  id="sku-code"
                  type="text"
                  value={skuCode}
                  onChange={(event) => setSkuCode(event.target.value)}
                  placeholder="e.g. QT-AUDIO-001"
                  className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                />
                <p className="text-xs text-muted-foreground">
                  Your internal identifier for tracking this product.
                </p>
              </div>
            </div>

            {/* §21.2. A SELLING DECISION, so it sits with stock rather than with the publish
                controls. Pausing or discontinuing is NOT unpublishing: the listing stays live and
                findable, its inbound links keep working, and a discontinued page is where a buyer
                learns what replaced it. Unpublishing would delete all of that. */}
            <div className="flex flex-col gap-1.5 border-t border-border pt-6">
              <label htmlFor="selling-state" className="text-sm font-medium text-foreground">
                Still selling this?
              </label>
              <select
                id="selling-state"
                value={sellingState}
                onChange={(event) => {
                  // Parsed, not asserted — the same discipline the sample-policy select uses, so a
                  // future fourth option is a compile error rather than a 422.
                  const parsedState = ProductSellingStateSchema.safeParse(event.target.value);
                  if (!parsedState.success) return;
                  setSellingState(parsedState.data);
                }}
                className="h-12 cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
              >
                {PRODUCT_SELLING_STATES.map((state) => (
                  <option key={state} value={state}>
                    {SELLING_STATE_OPTION_LABELS[state]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {SELLING_STATE_HELP_TEXT[sellingState]}
              </p>
            </div>

            {/* B2B volume pricing tiers (optional). */}
            <div className="flex flex-col gap-3 border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Bulk pricing tiers</h3>
                  <p className="text-xs text-muted-foreground">
                    Offer a lower unit price for larger B2B orders. Optional. A band may carry its
                    own lead time; leave it blank to use the listing's.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddTierClick}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50"
                >
                  <Image
                    src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                  Add tier
                </button>
              </div>

              <PricingTierRows
                tiers={pricingTiers}
                onTierChange={handleTierChange}
                onRemoveTier={handleRemoveTierClick}
              />
            </div>

            {/*
              SAMPLES (A17). Beside the price rather than in a step of their own, because a sample
              price is a price — and because `samplePrice` is one of the listing-completeness
              requirements this step already owns, which until now no control on this form could
              satisfy.

              THREE FIELDS, NOT ONE. The policy says whether a sample can be had and whether its
              price comes back against a later bulk order; the price says what it costs; the cap
              says how many one order may hold. The cap is the load-bearing one: a sample skips the
              tier ladder AND the minimum order quantity, so without a ceiling a large "sample"
              line is a bulk order at sample pricing — and on a refundable listing it mints a
              credit worth the whole line, spendable against the next order.
            */}
            <fieldset className="mt-6 flex flex-col gap-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-medium text-foreground">Samples</legend>
              <p className="text-xs leading-4 text-muted-foreground">
                Buyers often order one unit to check quality before committing to a bulk order.
                Refundable means the sample price comes back as credit against their first bulk
                order with you.
              </p>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="sample-policy" className="text-sm font-medium text-foreground">
                  Sample policy
                </label>
                <select
                  id="sample-policy"
                  value={samplePolicy}
                  onChange={(event) => {
                    // Parsed, not asserted, the same way the category admin narrows its state
                    // select. The three options are all this control renders, but proving it here
                    // is what keeps a future fourth `<option>` from shipping a 422 instead of a
                    // compile error.
                    const parsedPolicy = ProductSamplePolicySchema.safeParse(event.target.value);
                    if (!parsedPolicy.success) return;
                    setSamplePolicy(parsedPolicy.data);
                  }}
                  className="h-12 cursor-pointer rounded-lg border border-border bg-transparent px-3 text-sm outline-none focus:border-[#1DBDC5]"
                >
                  {PRODUCT_SAMPLE_POLICIES.map((policy) => (
                    <option key={policy} value={policy}>
                      {SAMPLE_POLICY_LABELS[policy]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Hidden rather than disabled when no sample is offered: `unavailable` with a price
                  beside it is a shape the backend refuses, so the form must not present it as a
                  combination the seller could fill in. */}
              {samplePolicy !== "unavailable" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="sample-price" className="text-sm font-medium text-foreground">
                      Sample price
                    </label>
                    <div className="flex h-12 items-center rounded-lg border border-border px-3 focus-within:border-[#1DBDC5]">
                      <span className="mr-2 text-sm text-muted-foreground">$</span>
                      <input
                        id="sample-price"
                        type="number"
                        min="0"
                        step="0.01"
                        value={samplePriceInDollars}
                        onChange={(event) => setSamplePriceInDollars(event.target.value)}
                        placeholder="0.00"
                        className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Per unit, and usually above your bulk price — one piece costs you more to make
                      and ship than five hundred.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="maximum-sample-quantity"
                      className="text-sm font-medium text-foreground"
                    >
                      Samples per order
                    </label>
                    <input
                      id="maximum-sample-quantity"
                      type="number"
                      min="1"
                      max="20"
                      value={maximumSampleQuantity}
                      onChange={(event) => setMaximumSampleQuantity(event.target.value)}
                      placeholder="1"
                      className="h-12 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
                    />
                    <p className="text-xs text-muted-foreground">
                      The most a buyer can take at the sample price in one order. 1 to 20 — leave it
                      at 1 unless you ship a sample pack.
                    </p>
                  </div>
                </div>
              )}
            </fieldset>

            {/*
              THE FIVE SHIPPING FACTS. Required to publish, not to draft — so they sit beside the
              price rather than behind a gate, and a seller can save and come back with a tape
              measure.

              WHY ALL FIVE AND NOT JUST THE BOX. Freight bills on chargeable weight, which is
              `max(actual, volumetric)`, and volumetric is L x W x H multiplied by the PACKAGE COUNT.
              Without `unitsPerPackage` the rater skips the line; without a gross weight it
              contributes no weight at all. Three fields would look like enough and would price
              nothing.
            */}
            <fieldset className="mt-6 flex flex-col gap-3 rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-medium text-foreground">
                Packaging & shipping
              </legend>
              <p className="text-xs leading-4 text-muted-foreground">
                Required before this listing can be published — freight is rated on the size and
                weight of the shipped package, not the product. Enter the dimensions of one package
                and how many units it holds.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <PackagingInput
                  fieldKey="packageLengthMm"
                  value={packageLengthMm}
                  onValueChange={setPackageLengthMm}
                />
                <PackagingInput
                  fieldKey="packageWidthMm"
                  value={packageWidthMm}
                  onValueChange={setPackageWidthMm}
                />
                <PackagingInput
                  fieldKey="packageHeightMm"
                  value={packageHeightMm}
                  onValueChange={setPackageHeightMm}
                />
              </div>
              <p className="text-xs leading-4 text-muted-foreground">
                Length, width and height go in together or not at all — a half-measured box has no
                volume anyone can rate.
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <PackagingInput
                  fieldKey="packageGrossWeightGrams"
                  value={packageGrossWeightGrams}
                  onValueChange={setPackageGrossWeightGrams}
                />
                <PackagingInput
                  fieldKey="unitsPerPackage"
                  value={unitsPerPackage}
                  onValueChange={setUnitsPerPackage}
                />
              </div>
            </fieldset>
          </StepCard>
        );

      case "customization":
        return (
          <StepCard
            title="Customization"
            subtitle="What a buyer can specify on this listing — artwork to upload, or a choice you offer."
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Slots</h3>
                  <p className="text-xs text-muted-foreground">
                    Optional. Leave this empty and the listing sells exactly as described.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCustomizationSlotClick}
                  disabled={customizationSlots.length >= PRODUCT_CUSTOMIZATION_SLOT_MAX_COUNT}
                  className="flex cursor-pointer items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Image
                    src="/icons/add_circle_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                    alt=""
                    width={18}
                    height={18}
                  />
                  Add slot
                </button>
              </div>

              {/* Stated here rather than discovered later. Both are enforced server-side. */}
              {customizationSlots.length > 0 && (
                <ul className="flex flex-col gap-1 rounded-xl bg-secondary/40 p-3 text-xs leading-4 text-muted-foreground">
                  <li>Buyers see these on the listing and fill them in before ordering.</li>
                  <li>
                    A minimum order quantity on a slot is a commercial term — the server checks it
                    at the cart and again at checkout.
                  </li>
                  <li>
                    Every slot is optional to answer. Slots a buyer MUST answer are not offered yet.
                  </li>
                </ul>
              )}

              {customizationSlots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No customization. Add a slot only if buyers genuinely supply something — a listing
                  sold as-is is simpler for everyone.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {customizationSlots.map((slot, slotIndex) => (
                    <li
                      key={slot.localId}
                      className="flex flex-col gap-3 rounded-xl border border-border p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-xs font-medium text-muted-foreground">
                          Slot {slotIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomizationSlotClick(slotIndex)}
                          aria-label={`Remove slot ${String(slotIndex + 1)}`}
                          className="cursor-pointer text-xs font-medium text-destructive"
                        >
                          Remove
                        </button>
                      </div>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Label</span>
                        <input
                          type="text"
                          value={slot.label}
                          maxLength={120}
                          onChange={(changeEvent) =>
                            handleCustomizationLabelChange(slotIndex, changeEvent.target.value)
                          }
                          placeholder="Packaging material"
                          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Key</span>
                        <input
                          type="text"
                          value={slot.slotKey}
                          maxLength={60}
                          // ⚠️ FROZEN ONCE SAVED. The backend upserts on this: changing it retires
                          // the slot and creates a new one, orphaning what past orders named.
                          readOnly={slot.savedId !== null}
                          onChange={(changeEvent) =>
                            updateCustomizationSlot(slotIndex, {
                              slotKey: changeEvent.target.value,
                              isSlotKeyEdited: true,
                            })
                          }
                          placeholder="packaging_material"
                          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none read-only:text-muted-foreground focus:border-primary"
                        />
                        <span className="text-[11px] leading-4 text-muted-foreground">
                          {slot.savedId === null
                            ? "Lower-case words joined by underscores. Follows the label until you edit it."
                            : "Fixed once saved — buyers' past orders name this key."}
                        </span>
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">Kind</span>
                        <select
                          value={slot.customizationKind}
                          onChange={(changeEvent) => {
                            // NARROWED, NOT ASSERTED. The two `<option>` values below are the only
                            // ones this can produce, but an `as` here would be a claim about the
                            // DOM rather than a check of it — and this enum has to byte-match a
                            // pgEnum label, which is exactly where a near-miss goes unnoticed.
                            const nextKind = PRODUCT_CUSTOMIZATION_KINDS.find(
                              (kind) => kind === changeEvent.target.value,
                            );
                            if (nextKind === undefined) return;
                            updateCustomizationSlot(slotIndex, { customizationKind: nextKind });
                          }}
                          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                        >
                          <option value="choice">A choice you offer</option>
                          <option value="file_upload">A file the buyer uploads</option>
                        </select>
                      </label>

                      {/* ONLY THE LIST MATCHING THE KIND IS SENT — the backend refuses a slot
                          carrying both. The other list stays in state so switching back does not
                          lose typing. */}
                      {slot.customizationKind === "choice" ? (
                        <StringListRows
                          legend="Options a buyer picks from"
                          placeholder="kraft"
                          values={slot.choiceValues}
                          maxCount={PRODUCT_CUSTOMIZATION_CHOICE_MAX_COUNT}
                          onChange={(choiceValues) =>
                            updateCustomizationSlot(slotIndex, { choiceValues })
                          }
                        />
                      ) : (
                        <StringListRows
                          legend="Accepted file types"
                          placeholder="image/png"
                          values={slot.acceptedMediaTypes}
                          maxCount={PRODUCT_CUSTOMIZATION_MEDIA_TYPE_MAX_COUNT}
                          onChange={(acceptedMediaTypes) =>
                            updateCustomizationSlot(slotIndex, { acceptedMediaTypes })
                          }
                        />
                      )}

                      <label className="flex flex-col gap-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Minimum order quantity
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={slot.minimumOrderQuantity}
                          onChange={(changeEvent) =>
                            updateCustomizationSlot(slotIndex, {
                              minimumOrderQuantity: changeEvent.target.value,
                            })
                          }
                          placeholder="Any quantity"
                          className="rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                        />
                        <span className="text-[11px] leading-4 text-muted-foreground">
                          Leave blank if this applies at any quantity.
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

              {/* Counted, not listed — a retired slot cannot be deleted and re-editing one would
                  revive a term the seller withdrew. */}
              {retiredCustomizationSlotCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {retiredCustomizationSlotCount} retired{" "}
                  {retiredCustomizationSlotCount === 1 ? "slot is" : "slots are"} kept on this
                  listing because past orders name them. They are not offered to buyers.
                </p>
              )}
            </div>
          </StepCard>
        );

      case "review":
        return (
          <StepCard
            title="Review & Publish"
            subtitle="Check everything looks right before your listing goes live."
          >
            <ReviewSection
              title="Product Identity"
              onEditClick={() => setCurrentStepIndex(stepIndexOf("identity"))}
              rows={[
                { label: "Title", value: productTitle },
                { label: "Brand", value: brandName },
                { label: "Category", value: categoryChoice?.displayLabel ?? "" },
                { label: "Condition", value: selectedCondition },
                { label: "Model number", value: modelNumber },
                {
                  label: "Country of origin",
                  // The NAME, not the code — the review step is where a seller catches a wrong
                  // choice, and "DE" is not a thing anyone proof-reads. Blank stays blank so
                  // `ReviewSection` renders it as unstated.
                  value:
                    countryOfOriginCode === "" ? "" : countryLabelFromCode(countryOfOriginCode),
                },
                { label: "Unit of measure", value: unitOfMeasure },
              ]}
            />
            <ReviewSection
              title="Images & Media"
              onEditClick={() => setCurrentStepIndex(stepIndexOf("images"))}
              rows={[
                {
                  label: "Images",
                  value:
                    imageCount > 0 ? `${imageCount} image${imageCount === 1 ? "" : "s"} added` : "",
                },
              ]}
            />
            <ReviewSection
              title="Description"
              onEditClick={() => setCurrentStepIndex(stepIndexOf("description"))}
              rows={[
                { label: "Description", value: productDescription },
                {
                  label: "Key features",
                  value: keyFeatures.length > 0 ? keyFeatures.join(" · ") : "",
                },
              ]}
            />
            <ReviewSection
              title="Specifications"
              onEditClick={() => setCurrentStepIndex(stepIndexOf("specifications"))}
              rows={[
                {
                  label: "Specification sheet",
                  // COUNTS WHAT WILL ACTUALLY BE SAVED, not how many rows the form is showing.
                  // An untouched row the seller added and never filled in is dropped by
                  // `collectListingInput`, so counting it here would promise the review step a
                  // specification the listing is not going to have.
                  //
                  // Blank when there are none, so `ReviewSection` renders it as the missing thing
                  // it is rather than as a confident "0 specifications".
                  value:
                    filledSpecificationCount > 0
                      ? `${String(filledSpecificationCount)} specification${
                          filledSpecificationCount === 1 ? "" : "s"
                        }`
                      : "",
                },
              ]}
            />
            <ReviewSection
              title="Highlights"
              onEditClick={() => setCurrentStepIndex(stepIndexOf("highlights"))}
              rows={[
                {
                  label: "Detail blocks",
                  // Counts what will SAVE — a block missing its heading or body is dropped by
                  // `collectHighlights`, so counting the form's rows would promise one that is not
                  // going to exist.
                  value:
                    filledHighlightCount > 0
                      ? `${String(filledHighlightCount)} block${filledHighlightCount === 1 ? "" : "s"}`
                      : "",
                },
              ]}
            />
            <ReviewSection
              title="Variants"
              onEditClick={() => setCurrentStepIndex(stepIndexOf("variants"))}
              rows={[
                {
                  label: "Variations",
                  // Counts the form's rows, unlike Highlights above — `collectVariants` REFUSES a
                  // bad row rather than dropping it, so what is on screen is what will save.
                  value:
                    variants.length > 0
                      ? `${String(variants.length)} variant${variants.length === 1 ? "" : "s"}`
                      : "",
                },
              ]}
            />
            <ReviewSection
              title="Customization"
              onEditClick={() => setCurrentStepIndex(stepIndexOf("customization"))}
              rows={[
                {
                  label: "Slots",
                  // Counts the form's rows, like Variants above and unlike Highlights —
                  // `collectCustomizationSlots` REFUSES a bad row rather than dropping it, so what
                  // is on screen is what will save.
                  value:
                    customizationSlots.length > 0
                      ? `${String(customizationSlots.length)} slot${customizationSlots.length === 1 ? "" : "s"}`
                      : "",
                },
              ]}
            />
            <ReviewSection
              title="Pricing & Inventory"
              onEditClick={() => setCurrentStepIndex(stepIndexOf("pricing"))}
              rows={[
                { label: "Price", value: priceInDollars ? `$${priceInDollars}` : "" },
                {
                  label: "Compare-at price",
                  value: compareAtPriceInDollars ? `$${compareAtPriceInDollars}` : "",
                },
                { label: "Quantity", value: stockQuantity },
                { label: "SKU", value: skuCode },
                {
                  label: "Bulk tiers",
                  value:
                    pricingTiers.length > 0
                      ? `${pricingTiers.length} tier${pricingTiers.length === 1 ? "" : "s"}`
                      : "",
                },
                {
                  label: "Samples",
                  // One row rather than three: the price and the cap only mean anything once a
                  // policy offers a sample at all, so an `unavailable` listing reads as the single
                  // fact it is instead of two blanks the seller would take for missing input.
                  value:
                    samplePolicy === "unavailable"
                      ? SAMPLE_POLICY_LABELS.unavailable
                      : `${SAMPLE_POLICY_LABELS[samplePolicy]}${
                          samplePriceInDollars ? ` · $${samplePriceInDollars} each` : ""
                        } · max ${maximumSampleQuantity || "1"} per order`,
                },
              ]}
            />
            <ReviewSection
              title="Packaging & Shipping"
              onEditClick={() => setCurrentStepIndex(stepIndexOf("pricing"))}
              rows={[
                {
                  label: "Package size",
                  // Blank when incomplete, NEVER a partial "300 × — × 120". `ReviewSection` renders
                  // an empty value as the missing thing it is.
                  value:
                    packageLengthMm && packageWidthMm && packageHeightMm
                      ? `${packageLengthMm} × ${packageWidthMm} × ${packageHeightMm} mm`
                      : "",
                },
                {
                  label: "Gross weight",
                  value: packageGrossWeightGrams ? `${packageGrossWeightGrams} g` : "",
                },
                { label: "Units per package", value: unitsPerPackage },
              ]}
            />
            {productQuery.data !== undefined && (
              <ListingCompletenessChecklist
                completeness={productQuery.data.listingCompleteness}
                onEditClick={setCurrentStepIndex}
              />
            )}
          </StepCard>
        );

      case "relations":
        return (
          <StepCard
            title="Related products"
            subtitle="What goes with this, what replaces it, what it is a spare part for. Buyers see these under “View similar” and in the compare tray."
          >
            {/*
              ⚠️ A DECLARATION, NOT A FACT, AND THE COPY SAYS SO. The server stores these as
              `seller_declared` and the buyer's sheet captions them that way — only a moderator can
              promote one to a confirmed fit. Wording this as certainty would be the claim §15.3
              exists to prevent.
            */}
            <RelationRows
              relations={relations}
              readOnlyRelations={readOnlyRelations}
              onRelationsChange={setRelations}
            />
          </StepCard>
        );

      default: {
        const exhaustiveCheck: never = stepId;
        return exhaustiveCheck;
      }
    }
  }

  return (
    <div className="p-6">
      <Link
        href="/studio/products"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <Image
          src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
          alt=""
          width={18}
          height={18}
        />
        Back to products
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        {isEditMode ? "Edit Store Listing" : "Create Store Listing"}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        List your product on the Qatoto Store to reach buyers, partners, and B2B customers.
      </p>

      {/* Step tabs */}
      <ol className="mt-8 flex items-center">
        {LISTING_STEPS.map((step, stepIndex) => {
          const isCompletedStep = stepIndex < currentStepIndex;
          const isCurrentStep = stepIndex === currentStepIndex;
          return (
            <li key={step.id} className={`flex items-center ${stepIndex > 0 ? "flex-1" : ""}`}>
              {stepIndex > 0 && (
                <span
                  className={`mx-2 h-0.5 flex-1 rounded-full ${
                    isCompletedStep || isCurrentStep ? "bg-[#1DBDC5]" : "bg-border"
                  }`}
                />
              )}
              <button
                type="button"
                onClick={() => handleGoToStepClick(stepIndex)}
                disabled={stepIndex >= currentStepIndex}
                className={`flex shrink-0 items-center gap-2 ${
                  isCompletedStep ? "cursor-pointer" : "cursor-default"
                }`}
              >
                <span
                  className={`flex size-8 items-center justify-center rounded-full text-sm font-medium ${
                    isCurrentStep
                      ? "bg-primary text-primary-foreground ring-2 ring-[#1DBDC5]"
                      : isCompletedStep
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {isCompletedStep ? (
                    <Image
                      src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt=""
                      width={16}
                      height={16}
                    />
                  ) : (
                    stepIndex + 1
                  )}
                </span>
                <span
                  className={`hidden text-sm md:block ${
                    isCurrentStep ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="mt-6">{renderCurrentStep(currentStep.id)}</div>

      {isLastStep && localError !== null && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {localError}
        </p>
      )}
      {isLastStep && localError === null && publishRefusal !== null && (
        <PublishRefusalNotice refusal={publishRefusal} />
      )}
      {isSaving && (
        <p className="mt-4 text-sm text-muted-foreground">{describeProgress(saveProgress)}</p>
      )}

      {/* Footer navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackClick}
          className={`cursor-pointer rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 ${
            currentStepIndex === 0 ? "invisible" : ""
          }`}
        >
          Back
        </button>

        {isLastStep ? (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="cursor-pointer rounded-full border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isEditMode ? "Save Changes" : "Save Draft"}
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={isSaving || publishBlockReason !== null}
              title={publishBlockReason ?? undefined}
              className="flex cursor-pointer items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Image
                src="/icons/check_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
              />
              {isSaving ? "Publishing…" : "Publish Listing"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleNextClick}
            className="cursor-pointer rounded-full bg-primary px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Next: {LISTING_STEPS[currentStepIndex + 1].label}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * A refused publish, rendered as what it is.
 *
 * THREE VARIANTS BECAUSE THEY NEED THREE DIFFERENT THINGS FROM THE SELLER: `incomplete` names empty
 * fields to go and fill, `invalid` carries per-field schema complaints whose generic headline says
 * nothing on its own, and `failed` is a sentence to read. Collapsing them into one paragraph is what
 * this file did before, and it is why publishing looked broken rather than incomplete.
 */
function PublishRefusalNotice({ refusal }: { refusal: ProductPublishRefusal }) {
  const containerClassName =
    "mt-4 space-y-1 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500";

  switch (refusal.kind) {
    case "incomplete":
      return (
        <p role="alert" className={containerClassName}>
          {refusal.message}
        </p>
      );
    case "invalid":
      return (
        <div role="alert" className={containerClassName}>
          <p>{refusal.message}</p>
          <ul className="space-y-0.5 text-xs">
            {refusal.fieldMessages.map((fieldMessage) => (
              <li key={fieldMessage.field}>
                {/* `form` is the reserved key an object-level `.strict()` refusal arrives under —
                    it is not a field, so it is not labelled as one. */}
                {fieldMessage.field !== "form" && (
                  <span className="font-medium">{fieldMessage.field}: </span>
                )}
                {fieldMessage.messages.join(" ")}
              </li>
            ))}
          </ul>
        </div>
      );
    case "failed":
      return (
        <p role="alert" className={containerClassName}>
          {refusal.message}
        </p>
      );
    default: {
      const exhaustiveCheck: never = refusal;
      return exhaustiveCheck;
    }
  }
}

/**
 * The server's own publish checklist, shown on the review step.
 *
 * READ, NEVER RECOMPUTED. `projectListingCompleteness` produces this and the 422 behind the button
 * from one call, so what is ticked here is exactly what the backend will accept. A locally derived
 * checklist is how a form ends up disagreeing with its own submit.
 *
 * Edit mode only — a listing being created has no row to project from yet.
 */
function ListingCompletenessChecklist({
  completeness,
  onEditClick,
}: {
  completeness: ListingCompleteness;
  onEditClick: (stepIndex: number) => void;
}) {
  /**
   * Which wizard step fixes each requirement.
   *
   * BY STEP ID, resolved through `stepIndexOf`. These were ordinals, and inserting the
   * Specifications step at index 3 moved pricing without moving them — so "Add" beside a missing
   * price would have opened the specification sheet. A wrong jump is worse than a broken link,
   * because the seller reads it as the form losing their work.
   *
   * ⚠️ THERE IS NO `specifications` ROW HERE, DELIBERATELY. The server owns this checklist
   * (`projectListingCompleteness`) and its five requirements are unchanged; a free-text spec sheet
   * is optional to publish. A publish requirement only becomes meaningful once per-category
   * attributes can say WHICH fields a category requires — see
   * `docs/CATEGORY_ATTRIBUTES_STRUCTURE.md`.
   */
  const stepIdByRequirementKey: Record<string, ListingStepId> = {
    title: "identity",
    images: "images",
    price: "pricing",
    samplePrice: "pricing",
    shippingFacts: "pricing",
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-medium text-foreground">Ready to publish</h3>
        <span className="text-xs text-muted-foreground">
          {completeness.satisfiedRequirementCount} of {completeness.applicableRequirementCount} done
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {completeness.requirements.map((requirement) => {
          // `not_applicable` is NOT a synonym for satisfied and is not shown as a tick: sample price
          // does not apply unless samples are sold, and ticking it claims the seller answered a
          // question that was never put to them.
          if (requirement.state === "not_applicable") return null;
          const isSatisfied = requirement.state === "satisfied";
          return (
            <li key={requirement.key} className="flex items-center gap-2 text-sm">
              <span
                aria-hidden
                className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] ${
                  isSatisfied ? "bg-primary text-background" : "border border-red-500/60"
                }`}
              >
                {isSatisfied ? "✓" : ""}
              </span>
              <span className={isSatisfied ? "text-muted-foreground" : "text-foreground"}>
                {LISTING_REQUIREMENT_LABELS[requirement.key]}
              </span>
              {!isSatisfied && (
                <button
                  type="button"
                  onClick={() =>
                    onEditClick(stepIndexOf(stepIdByRequirementKey[requirement.key] ?? "identity"))
                  }
                  className="cursor-pointer text-xs text-[#1DBDC5] underline-offset-2 hover:underline"
                >
                  Add
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One typed packaging control: its label, its unit, and the bound the backend enforces. */
const PACKAGING_FIELDS = [
  { key: "packageLengthMm", label: "Length", unit: "mm", max: PACKAGE_DIMENSION_MM_MAX },
  { key: "packageWidthMm", label: "Width", unit: "mm", max: PACKAGE_DIMENSION_MM_MAX },
  { key: "packageHeightMm", label: "Height", unit: "mm", max: PACKAGE_DIMENSION_MM_MAX },
  {
    key: "packageGrossWeightGrams",
    label: "Gross weight",
    unit: "g",
    max: PACKAGE_GROSS_WEIGHT_GRAMS_MAX,
  },
  { key: "unitsPerPackage", label: "Units per package", unit: "", max: UNITS_PER_PACKAGE_MAX },
] as const;

type PackagingFieldKey = (typeof PACKAGING_FIELDS)[number]["key"];

type PackagingFacts = Partial<Record<PackagingFieldKey, number>>;

/**
 * Parse the five shipping facts, or refuse.
 *
 * BLANK IS OMITTED, NOT ZERO. All five are optional on the wire so drafting stays free, and the
 * difference between "not measured" and "measured as zero" is the whole point of §19.6's refusal to
 * default anything.
 *
 * THE THREE DIMENSIONS ARE ALL-OR-NOTHING, mirroring the backend's `packageDimensionsComplete`
 * refinement. Mirrored rather than left to the 422 because the seller is looking at the three boxes
 * as they type: catching it here points at the empty one, while the round trip returns a refusal
 * whose path is `packageLengthMm` even when width is the one they skipped.
 */
function collectPackagingFacts(
  typedValues: Record<PackagingFieldKey, string>,
): { facts: PackagingFacts } | { error: string } {
  const facts: PackagingFacts = {};

  for (const field of PACKAGING_FIELDS) {
    const typedValue = typedValues[field.key].trim();
    if (typedValue.length === 0) continue;

    const parsed = Number.parseInt(typedValue, 10);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > field.max) {
      return {
        error: `${field.label} must be a whole number between 1 and ${field.max.toLocaleString()}${
          field.unit === "" ? "" : ` ${field.unit}`
        }.`,
      };
    }
    facts[field.key] = parsed;
  }

  const declaredDimensionCount = [
    facts.packageLengthMm,
    facts.packageWidthMm,
    facts.packageHeightMm,
  ].filter((dimension) => dimension !== undefined).length;

  if (declaredDimensionCount !== 0 && declaredDimensionCount !== 3) {
    return {
      error: "Package length, width and height must be provided together, or all left blank.",
    };
  }

  return { facts };
}

/**
 * One packaging number, with its unit in the label rather than baked into the value.
 *
 * `type="number"` with `step="1"` because every one of these is an integer on the wire — millimetres
 * and grams, not centimetres and kilograms. Offering a decimal control for a field the backend
 * parses with `z.number().int()` invites a 422 for a perfectly reasonable "1.5".
 */
/**
 * A18. An editable list of plain strings — a slot's choice values, or its accepted file types.
 *
 * SHARED SO THE TWO CANNOT DRIFT, the same argument that produced `PricingTierRows` below. They are
 * the same control by definition: one list of short strings, added one at a time, removable, capped
 * by the backend. A second copy would be a second place for the cap or the trim to go missing.
 *
 * ENTER ADDS, so the keyboard path does not require reaching for the button. `type="button"` on the
 * add control matters — inside the wizard's form a bare button submits.
 */
function StringListRows({
  legend,
  placeholder,
  values,
  maxCount,
  onChange,
}: {
  readonly legend: string;
  readonly placeholder: string;
  readonly values: readonly string[];
  readonly maxCount: number;
  readonly onChange: (values: string[]) => void;
}) {
  const [pendingValue, setPendingValue] = useState("");

  function addPendingValue() {
    const trimmed = pendingValue.trim();
    // Duplicates are dropped rather than refused: a repeated choice is not a decision the seller is
    // making, and the backend would store it twice.
    if (trimmed.length === 0 || values.length >= maxCount || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setPendingValue("");
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{legend}</span>
      <div className="flex gap-2">
        <input
          type="text"
          value={pendingValue}
          maxLength={120}
          onChange={(changeEvent) => setPendingValue(changeEvent.target.value)}
          onKeyDown={(keyEvent) => {
            if (keyEvent.key !== "Enter") return;
            keyEvent.preventDefault();
            addPendingValue();
          }}
          placeholder={placeholder}
          className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={addPendingValue}
          disabled={pendingValue.trim().length === 0 || values.length >= maxCount}
          className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-2 pt-1">
          {values.map((value, valueIndex) => (
            <li
              key={value}
              className="flex items-center gap-2 rounded-full bg-secondary/60 px-3 py-1 text-xs text-foreground"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, index) => index !== valueIndex))}
                aria-label={`Remove ${value}`}
                className="cursor-pointer text-muted-foreground"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * The rows of ONE volume ladder — the listing's, or a single variant's.
 *
 * SHARED SO THE TWO CANNOT DRIFT. A variant ladder replaces the listing's rather than merging with
 * it (A1), so the two are the same shape by definition, and a second copy of this markup would be a
 * second place for A27's lead-time column to go missing.
 */
function PricingTierRows({
  tiers,
  onTierChange,
  onRemoveTier,
}: {
  readonly tiers: readonly PricingTierDraft[];
  readonly onTierChange: (tierIndex: number, field: keyof PricingTierDraft, value: string) => void;
  readonly onRemoveTier: (tierIndex: number) => void;
}) {
  if (tiers.length === 0) return null;

  return (
    <ul className="flex flex-col gap-2">
      {tiers.map((tier, tierIndex) => (
        <li
          key={tier.id}
          className="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-3 rounded-xl border border-border p-3"
        >
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Unit price</span>
            <div className="flex h-11 items-center rounded-lg border border-border px-3 focus-within:border-[#1DBDC5]">
              <span className="mr-2 text-sm text-muted-foreground">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={tier.unitPriceInDollars}
                onChange={(event) =>
                  onTierChange(tierIndex, "unitPriceInDollars", event.target.value)
                }
                placeholder="0.00"
                className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Min. quantity</span>
            <input
              type="number"
              min="1"
              value={tier.minimumOrderQuantity}
              onChange={(event) =>
                onTierChange(tierIndex, "minimumOrderQuantity", event.target.value)
              }
              placeholder="e.g. 10"
              className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
            />
          </div>
          {/* A27. Blank is a real answer — it means the listing's own lead time applies. */}
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Lead time (days)</span>
            <input
              type="number"
              min="0"
              max="3650"
              value={tier.leadTimeDays}
              onChange={(event) => onTierChange(tierIndex, "leadTimeDays", event.target.value)}
              placeholder="Listing's"
              className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
            />
          </div>
          <button
            type="button"
            onClick={() => onRemoveTier(tierIndex)}
            aria-label="Remove tier"
            className="flex h-11 cursor-pointer items-center transition-opacity hover:opacity-70"
          >
            <Image
              src="/icons/delete_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={20}
              height={20}
            />
          </button>
        </li>
      ))}
    </ul>
  );
}

function PackagingInput({
  fieldKey,
  value,
  onValueChange,
}: {
  fieldKey: PackagingFieldKey;
  value: string;
  onValueChange: (nextValue: string) => void;
}) {
  const field =
    PACKAGING_FIELDS.find((candidate) => candidate.key === fieldKey) ?? PACKAGING_FIELDS[0];
  const inputId = `listing-${field.key}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-xs font-medium text-muted-foreground">
        {field.label}
        {field.unit !== "" && <span className="text-muted-foreground"> ({field.unit})</span>}
      </label>
      <input
        id={inputId}
        type="number"
        min="1"
        step="1"
        max={field.max}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={field.key === "unitsPerPackage" ? "e.g. 24" : "0"}
        className="h-11 rounded-lg border border-border bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground focus:border-[#1DBDC5]"
      />
    </div>
  );
}

/** One-line progress label for the multi-step save. */
function describeProgress(progress: SaveProgress): string {
  switch (progress.phase) {
    case "creating":
      return "Saving listing…";
    case "uploading":
      return `Uploading image ${progress.current}/${progress.total}…`;
    case "highlights":
      return progress.total === 0
        ? "Saving highlights…"
        : `Uploading highlight image ${progress.current}/${progress.total}…`;
    case "documents":
      return `Uploading document ${String(progress.current)}/${String(progress.total)}…`;
    case "publishing":
      return "Publishing…";
    case "idle":
    case "done":
      return "Working…";
    default: {
      const exhaustiveCheck: never = progress;
      return exhaustiveCheck;
    }
  }
}

// Shared card wrapper for each wizard step.
function StepCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border border-border p-6">
      <div>
        <h2 className="text-lg font-medium text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

// Read-only summary block on the review step; empty values show a muted
// "Not provided" placeholder.
function ReviewSection({
  title,
  onEditClick,
  rows,
}: {
  title: string;
  onEditClick: () => void;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <button
          type="button"
          onClick={onEditClick}
          className="cursor-pointer text-sm text-[#1DBDC5] hover:underline"
        >
          Edit
        </button>
      </div>
      <dl className="mt-3 flex flex-col gap-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[10rem_1fr] gap-2">
            <dt className="text-sm text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 text-sm wrap-break-word text-foreground">
              {row.value.trim() ? (
                row.value
              ) : (
                <span className="text-muted-foreground italic">Not provided</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
