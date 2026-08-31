"use client";

// TRANSPORT: props-only — the plan is edited locally and saved by the composer in ONE action.
//
// ⚠️ **THERE IS NO PER-SLOT SAVE BUTTON IN HERE, AND ADDING ONE WOULD BE A DATA-LOSS BUG.**
// `PUT …/slots` deletes every slot and re-inserts (a unique index on `(pathwayId, siblingOrder)`
// makes an in-place reorder collide with itself), and the candidate FK is `onDelete: "cascade"`.
// So saving "just this slot" destroys the candidates on every OTHER slot. The composer owns one
// "Save the plan" action which re-sends every slot's candidates against the new ids.
//
// ⚠️ **ROWS ARE KEYED POSITIONALLY, NOT BY SLOT ID.** A slot id read from the server is dead the
// instant the next save lands, so local state must never depend on one. `localKey` is a
// client-minted identity that survives saves and exists only to key React rows.

import { useState } from "react";

import PathwayCandidatePicker, {
  type PickedCandidate,
} from "@/components/studio/pathways/pathway-candidate-picker";
import {
  PRODUCT_RELATION_KINDS,
  PRODUCT_RELATION_KIND_LABELS,
} from "@/lib/store/merchandising.schemas";
import {
  MAXIMUM_CANDIDATES_PER_SLOT,
  MAXIMUM_SLOTS_PER_PATHWAY,
} from "@/lib/store/pathway-authoring.schemas";

/** One slot as the author is editing it, before any of it has server identity. */
export interface SlotDraft {
  readonly localKey: string;
  readonly roleLabel: string;
  readonly isRequired: boolean;
  readonly quantity: number;
  readonly derivedRelationKind: (typeof PRODUCT_RELATION_KINDS)[number] | null;
  readonly candidates: readonly PickedCandidate[];
}

const FIELD_CLASS = "mt-1 w-full rounded-lg border border-border px-2 py-1.5 text-sm";

export default function PathwaySlotEditor({
  slots,
  onSlotsChange,
  isAnchored,
  isDisabled,
}: {
  readonly slots: readonly SlotDraft[];
  readonly onSlotsChange: (slots: readonly SlotDraft[]) => void;
  /**
   * ⚠️ A DERIVED SLOT NEEDS AN ANCHOR PRODUCT, enforced by a DB trigger AND the service. Offering
   * the relation-kind control on an unanchored set would be offering a guaranteed refusal.
   */
  readonly isAnchored: boolean;
  readonly isDisabled: boolean;
}) {
  const [openPickerKey, setOpenPickerKey] = useState<string | null>(null);

  const patchSlot = (localKey: string, patch: Partial<SlotDraft>) => {
    onSlotsChange(slots.map((slot) => (slot.localKey === localKey ? { ...slot, ...patch } : slot)));
  };

  const handleAddSlotClick = () => {
    if (slots.length >= MAXIMUM_SLOTS_PER_PATHWAY) return;
    onSlotsChange([
      ...slots,
      {
        // `crypto.randomUUID` in an event handler, never during render — the compiler refuses an
        // impure call there, and this only ever runs from a click.
        localKey: crypto.randomUUID(),
        roleLabel: "",
        isRequired: true,
        quantity: 1,
        derivedRelationKind: null,
        candidates: [],
      },
    ]);
  };

  return (
    <div className="space-y-3">
      {slots.length === 0 && (
        <p className="text-sm text-muted-foreground">
          A set is a list of roles — &ldquo;the mattress&rdquo;, &ldquo;the bed frame&rdquo; — and
          the products that can fill each one. Add the first role to begin.
        </p>
      )}

      {slots.map((slot, slotIndex) => (
        <article key={slot.localKey} className="rounded-2xl border border-border p-3">
          <div className="flex items-start justify-between gap-2">
            <label className="flex-1 text-xs text-muted-foreground">
              What this piece is for
              <input
                type="text"
                value={slot.roleLabel}
                maxLength={80}
                disabled={isDisabled}
                onChange={(changeEvent) =>
                  patchSlot(slot.localKey, { roleLabel: changeEvent.target.value })
                }
                placeholder="The mattress"
                className={FIELD_CLASS}
              />
            </label>
            <button
              type="button"
              disabled={isDisabled}
              onClick={() =>
                onSlotsChange(slots.filter((other) => other.localKey !== slot.localKey))
              }
              className="mt-4 cursor-pointer text-xs text-[#8C1D18] disabled:opacity-40"
            >
              Remove
            </button>
          </div>

          <div className="mt-2 flex flex-wrap gap-3">
            <label className="text-xs text-muted-foreground">
              How many
              <input
                type="number"
                min={1}
                value={slot.quantity}
                disabled={isDisabled}
                onChange={(changeEvent) =>
                  patchSlot(slot.localKey, { quantity: Number(changeEvent.target.value) || 1 })
                }
                className={`${FIELD_CLASS} w-24`}
              />
            </label>
            <label className="flex items-center gap-2 self-end text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={slot.isRequired}
                disabled={isDisabled}
                onChange={(changeEvent) =>
                  patchSlot(slot.localKey, { isRequired: changeEvent.target.checked })
                }
              />
              The set is incomplete without it
            </label>
          </div>

          {isAnchored && (
            <label className="mt-2 block text-xs text-muted-foreground">
              Or fill it automatically from the anchor&rsquo;s related products
              <select
                value={slot.derivedRelationKind ?? ""}
                disabled={isDisabled}
                onChange={(changeEvent) => {
                  const chosen = PRODUCT_RELATION_KINDS.find(
                    (kind) => kind === changeEvent.target.value,
                  );
                  patchSlot(slot.localKey, { derivedRelationKind: chosen ?? null });
                }}
                className={FIELD_CLASS}
              >
                <option value="">Choose the products myself</option>
                {PRODUCT_RELATION_KINDS.map((relationKind) => (
                  <option key={relationKind} value={relationKind}>
                    {PRODUCT_RELATION_KIND_LABELS[relationKind]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <ul className="mt-2 space-y-1">
            {slot.candidates.map((candidate) => (
              <li
                key={`${candidate.productId}:${candidate.variantId ?? ""}`}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5"
              >
                <span className="text-sm">
                  {candidate.productTitle}
                  {candidate.variantName !== null && (
                    <span className="text-muted-foreground"> · {candidate.variantName}</span>
                  )}
                  {/*
                    ⚠️ SHOWN BECAUSE THE SLOT'S QUANTITY MUST REACH IT. The server refuses a
                    candidate whose minimum order quantity exceeds the slot's quantity, so an
                    author who cannot see the minimum discovers it as a refusal on save.
                  */}
                  {candidate.minimumOrderQuantity !== null &&
                    candidate.minimumOrderQuantity > slot.quantity && (
                      <span className="block text-[11px] text-[#8C1D18]">
                        Sold in {candidate.minimumOrderQuantity} at a time — raise this
                        piece&rsquo;s count to at least that, or it cannot be saved.
                      </span>
                    )}
                </span>
                <button
                  type="button"
                  disabled={isDisabled}
                  onClick={() =>
                    patchSlot(slot.localKey, {
                      candidates: slot.candidates.filter(
                        (other) =>
                          other.productId !== candidate.productId ||
                          other.variantId !== candidate.variantId,
                      ),
                    })
                  }
                  className="cursor-pointer text-xs text-[#8C1D18] disabled:opacity-40"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>

          {slot.derivedRelationKind === null &&
            slot.candidates.length < MAXIMUM_CANDIDATES_PER_SLOT &&
            (openPickerKey === slot.localKey ? (
              <div className="mt-2">
                <PathwayCandidatePicker
                  onClose={() => setOpenPickerKey(null)}
                  onCandidatePicked={(candidate) => {
                    // The unique index is (slot, product, variant), so a repeat is a 409 the
                    // server would raise — refused here instead, where it can be explained.
                    const isAlreadyPicked = slot.candidates.some(
                      (other) =>
                        other.productId === candidate.productId &&
                        other.variantId === candidate.variantId,
                    );
                    if (!isAlreadyPicked) {
                      patchSlot(slot.localKey, { candidates: [...slot.candidates, candidate] });
                    }
                    setOpenPickerKey(null);
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                disabled={isDisabled}
                onClick={() => setOpenPickerKey(slot.localKey)}
                className="mt-2 cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium outline -outline-offset-1 outline-border disabled:opacity-40"
              >
                Add a product to this piece
              </button>
            ))}

          {slot.isRequired && slot.derivedRelationKind === null && slot.candidates.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {/* Said here rather than discovered at submit, where it arrives as INVALID_STATE. */}
              This piece is needed, so it wants at least one product before the set can be sent for
              review — or set it to fill automatically above.
            </p>
          )}

          <p className="mt-2 text-[11px] text-muted-foreground">Piece {slotIndex + 1}</p>
        </article>
      ))}

      <button
        type="button"
        disabled={isDisabled || slots.length >= MAXIMUM_SLOTS_PER_PATHWAY}
        onClick={handleAddSlotClick}
        className="cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium outline -outline-offset-1 outline-border disabled:opacity-40"
      >
        Add a piece
      </button>
    </div>
  );
}
