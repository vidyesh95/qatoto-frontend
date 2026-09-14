// TRANSPORT: client-query — the author's draft store.

import {
  BlueprintDraftReceiptSchema,
  BlueprintDraftSummarySchema,
  BlueprintDraftViewSchema,
  DeleteBlueprintDraftReceiptSchema,
  type BlueprintDraftArm,
  type BlueprintDraftReceipt,
  type BlueprintDraftSummary,
  type BlueprintDraftView,
  type CreateBlueprintDraftInput,
  type DeleteBlueprintDraftReceipt,
  type ReplaceBlueprintDraftInput,
} from "@/lib/blueprints/drafts.schemas";
import { getJson, sendJson, type ActionResponse, type RequestOptions } from "@/lib/http";

/**
 * `GET /blueprints/drafts` — lists the author's saved drafts, optionally filtered by arm.
 */
export function listMyDrafts(
  arm?: BlueprintDraftArm,
  options?: RequestOptions,
): Promise<ActionResponse<readonly BlueprintDraftSummary[]>> {
  const path = arm ? `/blueprints/drafts?arm=${encodeURIComponent(arm)}` : "/blueprints/drafts";
  return getJson(path, BlueprintDraftSummarySchema.array(), options);
}

/**
 * `GET /blueprints/drafts/:draftId` — loads one of the author's drafts.
 */
export function getMyDraft(
  draftId: string,
  options?: RequestOptions,
): Promise<ActionResponse<BlueprintDraftView>> {
  return getJson(
    `/blueprints/drafts/${encodeURIComponent(draftId)}`,
    BlueprintDraftViewSchema,
    options,
  );
}

/**
 * `POST /blueprints/drafts` — creates a new server-side draft.
 */
export function createDraft(
  input: CreateBlueprintDraftInput,
  options?: RequestOptions,
): Promise<ActionResponse<BlueprintDraftReceipt>> {
  return sendJson("/blueprints/drafts", "POST", input, BlueprintDraftReceiptSchema, options);
}

/**
 * `PUT /blueprints/drafts/:draftId` — replaces an existing draft, guarded by expected revision.
 */
export function replaceDraft(
  draftId: string,
  input: ReplaceBlueprintDraftInput,
  options?: RequestOptions,
): Promise<ActionResponse<BlueprintDraftReceipt>> {
  return sendJson(
    `/blueprints/drafts/${encodeURIComponent(draftId)}`,
    "PUT",
    input,
    BlueprintDraftReceiptSchema,
    options,
  );
}

/**
 * `DELETE /blueprints/drafts/:draftId` — deletes a draft.
 */
export function deleteDraft(
  draftId: string,
  options?: RequestOptions,
): Promise<ActionResponse<DeleteBlueprintDraftReceipt>> {
  return sendJson(
    `/blueprints/drafts/${encodeURIComponent(draftId)}`,
    "DELETE",
    undefined,
    DeleteBlueprintDraftReceiptSchema,
    options,
  );
}
