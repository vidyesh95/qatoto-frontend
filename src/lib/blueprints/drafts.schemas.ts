// CONTRACT: server-side draft store for blueprints authoring wizards.
// Matches backend `src/modules/home/blueprints/blueprint-draft.schemas.ts`.

import { z } from "zod";

export const BLUEPRINT_DRAFT_DOCUMENT_MAXIMUM_CHARACTERS = 32_000;

export const BlueprintDraftArmSchema = z.enum(["teardown", "showcase_launch", "case_study"]);
export type BlueprintDraftArm = z.infer<typeof BlueprintDraftArmSchema>;

const DraftDocumentSchema = z
  .string()
  .min(2, "A draft document is a JSON object.")
  .max(BLUEPRINT_DRAFT_DOCUMENT_MAXIMUM_CHARACTERS, "That draft is too large to save.");

const DraftLabelSchema = z.string().trim().min(1).max(200).nullable();

/** One row in the author's drafts list. */
export const BlueprintDraftSummarySchema = z
  .object({
    draftId: z.string(),
    arm: BlueprintDraftArmSchema,
    label: z.string().nullable(),
    revision: z.number().int().positive(),
    updatedAt: z.string(),
  })
  .strip();
export type BlueprintDraftSummary = z.infer<typeof BlueprintDraftSummarySchema>;

/** Full draft document returned by `GET /blueprints/drafts/:draftId`. */
export const BlueprintDraftViewSchema = BlueprintDraftSummarySchema.extend({
  document: DraftDocumentSchema,
  documentSchemaVersion: z.number().int().positive(),
}).strip();
export type BlueprintDraftView = z.infer<typeof BlueprintDraftViewSchema>;

/** Receipt returned by draft creation and replacement. */
export const BlueprintDraftReceiptSchema = z
  .object({
    draftId: z.string(),
    revision: z.number().int().positive(),
    updatedAt: z.string(),
  })
  .strip();
export type BlueprintDraftReceipt = z.infer<typeof BlueprintDraftReceiptSchema>;

/** Payload for `POST /blueprints/drafts`. */
export const CreateBlueprintDraftInputSchema = z
  .object({
    arm: BlueprintDraftArmSchema,
    label: DraftLabelSchema.default(null),
    document: DraftDocumentSchema,
    documentSchemaVersion: z.number().int().positive(),
  })
  .strict();
export type CreateBlueprintDraftInput = z.infer<typeof CreateBlueprintDraftInputSchema>;

/** Payload for `PUT /blueprints/drafts/:draftId`. */
export const ReplaceBlueprintDraftInputSchema = z
  .object({
    label: DraftLabelSchema,
    document: DraftDocumentSchema,
    documentSchemaVersion: z.number().int().positive(),
    revision: z.number().int().positive(),
  })
  .strict();
export type ReplaceBlueprintDraftInput = z.infer<typeof ReplaceBlueprintDraftInputSchema>;

export const DeleteBlueprintDraftReceiptSchema = z
  .object({
    draftId: z.string(),
  })
  .strip();
export type DeleteBlueprintDraftReceipt = z.infer<typeof DeleteBlueprintDraftReceiptSchema>;
