// TRANSPORT: props-only — schemas and display maps, no network of their own.
//
// Client contract for organization addresses: `GET`/`POST /commerce/organizations/:id/addresses`
// and `PATCH …/addresses/:addressId`.
//
// Transcribed from `readableAddress` in the backend's `commerce-organizations.service.ts:833`.
//
// FOUR THINGS THIS FILE ENCODES:
//
//  1. AN ADDRESS BELONGS TO AN ORGANIZATION, NOT A PERSON. `commerce_organization_address` is
//     org-scoped because order parties and thread participants are both derived from organization
//     memberships. The mock this replaces held two personal addresses in `useState`; a buyer's
//     colleague could not see them, which is the opposite of how a company's shipping addresses
//     work. A buyer organization is auto-provisioned on the first action that needs one, so a
//     signed-in visitor has one without being made to fill in a form first.
//  2. THE CAP IS TEN PER KIND, NOT FIVE. The mock enforced five. Exceeding it is a real backend
//     refusal naming the kind, so the message says which.
//  3. `countryCode` IS NOT NULL ON THE TABLE and the mock form had no country field at all — every
//     address it produced would have been rejected. It is required here.
//  4. THE STREET LINES, RECIPIENT AND PHONE ARE ENCRYPTED AT REST and decrypted for a member who
//     may read them. They are PII: never log them, never put them in a query key, never cache them
//     anywhere a devtools panel or a persisted cache would keep them.

import { z } from "zod";

import { IsoDateTimeSchema } from "@/lib/store/shared.schemas";

/**
 * `delivery` is the kind this surface writes. The others exist for a seller's own operations —
 * where goods ship FROM, where returns go — and are read-only from a buyer's point of view.
 */
export const ORGANIZATION_ADDRESS_KINDS = [
  "billing",
  "registered",
  "warehouse",
  "pickup",
  "return",
  "delivery",
] as const;

export type OrganizationAddressKind = (typeof ORGANIZATION_ADDRESS_KINDS)[number];

/** The server's own cap, per kind. Stated so the UI can say why "add" went away. */
export const MAXIMUM_ADDRESSES_PER_KIND = 10;

export const OrganizationAddressSchema = z
  .object({
    id: z.string(),
    organizationId: z.string(),
    addressKind: z.enum(ORGANIZATION_ADDRESS_KINDS),
    label: z.string().nullable(),
    countryCode: z.string(),
    regionCode: z.string().nullable(),
    locality: z.string(),
    postalCode: z.string().nullable(),
    // Decrypted for a member who may read them. PII — see rule 4 above.
    recipientName: z.string().nullable(),
    addressLineOne: z.string().nullable(),
    addressLineTwo: z.string().nullable(),
    phone: z.string().nullable(),
    isDefault: z.boolean(),
    createdAt: IsoDateTimeSchema,
    updatedAt: IsoDateTimeSchema,
  })
  .strip();

export const OrganizationAddressListSchema = z.array(OrganizationAddressSchema);

/**
 * The create/patch body.
 *
 * OPTIONAL FIELDS ARE `?: T` AND NOT NULLABLE — a blank input is OMITTED from the body, never sent
 * as `null`, `""` or `0`. Sending an empty string for a line the buyer left alone would overwrite a
 * stored value with emptiness.
 */
export interface UpsertOrganizationAddressInput {
  readonly addressKind: OrganizationAddressKind;
  readonly countryCode: string;
  readonly locality: string;
  readonly label?: string;
  readonly regionCode?: string;
  readonly postalCode?: string;
  readonly recipientName?: string;
  readonly addressLineOne?: string;
  readonly addressLineTwo?: string;
  readonly phone?: string;
  readonly isDefault?: boolean;
}

export type OrganizationAddress = z.infer<typeof OrganizationAddressSchema>;

export const ADDRESS_KIND_LABELS: Record<OrganizationAddressKind, string> = {
  billing: "Billing",
  registered: "Registered office",
  warehouse: "Warehouse",
  pickup: "Pickup",
  return: "Returns",
  delivery: "Delivery",
};

/**
 * One line of the address, for display.
 *
 * Assembled from the parts the server sent, skipping the ones it did not — a template with fixed
 * commas prints ", , 401301" for a sparse address.
 */
export function formatAddressLines(address: OrganizationAddress): string {
  return [
    address.addressLineOne,
    address.addressLineTwo,
    address.locality,
    address.regionCode,
    address.postalCode,
    address.countryCode,
  ]
    .filter((part) => part !== null && part.trim().length > 0)
    .join(", ");
}
