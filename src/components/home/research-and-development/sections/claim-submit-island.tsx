// TRANSPORT: client-query — "use client" island. Writes POST …/effort-claims (202),
// POST …/physical-receipts (202, multipart) and DELETE …/physical-receipts/:receiptId.
"use client";

import { useState } from "react";

import {
  MutationAcceptedNotice,
  MutationErrorNotice,
} from "@/components/home/research-and-development/sections/mutation-feedback";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  useDeletePhysicalReceiptMutation,
  useSubmitEffortClaimMutation,
  useUploadPhysicalReceiptMutation,
} from "@/hooks/rnd/proof-of-effort";
import { ApiRequestError } from "@/lib/http";
import { newIdempotencyKey } from "@/lib/rnd/idempotency";
import {
  EFFORT_CLAIM_SOURCE_KINDS,
  EffortClaimSourceKindSchema,
  PHYSICAL_RECEIPT_KINDS,
  PhysicalReceiptKindSchema,
  type EffortClaimSourceKind,
  type PhysicalReceipt,
  type PhysicalReceiptKind,
} from "@/lib/rnd/proof-of-effort.schemas";

const SOURCE_KIND_LABELS: Record<EffortClaimSourceKind, string> = {
  daily_log: "A daily log I submitted",
  physical_receipt: "Photos or files of physical work",
};

const RECEIPT_KIND_LABELS: Record<PhysicalReceiptKind, string> = {
  photo_of_work: "Photo of the work",
  cad_file: "CAD file",
  material_receipt: "Material receipt",
  other: "Something else",
};

/**
 * File a claim, and upload the receipts a physical one cites.
 *
 * **THERE IS NO MINUTES FIELD AND NO CASH FIELD, AND THERE MUST NEVER BE ONE.** That is
 * the whole design: the member says WHAT they did and points at evidence, and the server
 * derives every number from the evidence. A form that accepted an hour count would make
 * the pipeline decorative — anyone could type their own equity.
 *
 * A PHYSICAL CLAIM'S MINUTES COME FROM EXIF CAPTURE SPANS across its receipts, because a
 * photograph has no transcript. That is why the receipt upload lives beside the claim
 * form rather than somewhere else.
 *
 * **BOTH WRITES ANSWER `202`.** The claim exists; the verdict does not, and no slices do
 * either. The verification tab's claim list is where the verdict eventually appears, and
 * it polls itself.
 *
 * **THE IDEMPOTENCY KEYS ARE MINTED ONCE PER ATTEMPT**, in state rather than inside the
 * submit handler. A key regenerated per click is not idempotency — the retry that
 * duplicates the row is the same click.
 *
 * `409 RATE_NOT_LOCKED` is the common refusal and it is actionable: no locked rate exists
 * to price the effort against, so the rate panel above has to finish first.
 */
export default function ClaimSubmitIsland({
  projectSlug,
  receipts,
  viewerProjectRole,
}: {
  projectSlug: string;
  receipts: PhysicalReceipt[];
  viewerProjectRole: string | null;
}) {
  const [sourceKind, setSourceKind] = useState<EffortClaimSourceKind>("daily_log");
  const [dailyLogId, setDailyLogId] = useState("");
  const [claimedForDate, setClaimedForDate] = useState("");
  const [narrative, setNarrative] = useState("");
  const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
  const [receiptKind, setReceiptKind] = useState<PhysicalReceiptKind>("photo_of_work");
  const [claimIdempotencyKey] = useState(newIdempotencyKey);
  const [uploadIdempotencyKey, setUploadIdempotencyKey] = useState(newIdempotencyKey);

  const submitMutation = useSubmitEffortClaimMutation(projectSlug);
  const uploadMutation = useUploadPhysicalReceiptMutation(projectSlug);
  const deleteReceiptMutation = useDeletePhysicalReceiptMutation(projectSlug);

  const firstError = [submitMutation.error, uploadMutation.error, deleteReceiptMutation.error].find(
    (error): error is ApiRequestError => error instanceof ApiRequestError,
  );

  if (viewerProjectRole === null) return null;

  function toggleReceipt(receiptId: string) {
    setSelectedReceiptIds((previousIds) =>
      previousIds.includes(receiptId)
        ? previousIds.filter((id) => id !== receiptId)
        : [...previousIds, receiptId],
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium tracking-wide xl:text-lg">Claim your effort</h3>
        <p className="text-xs text-muted-foreground">
          You say what you did and point at the evidence. Every number — minutes, cash, slices — is
          derived from that evidence, which is why there is nowhere here to enter one.
        </p>
      </div>

      <form
        className="space-y-2"
        onSubmit={(submitEvent) => {
          submitEvent.preventDefault();
          submitMutation.mutate({
            sourceKind,
            dailyLogId: sourceKind === "daily_log" ? dailyLogId.trim() : undefined,
            physicalReceiptIds: sourceKind === "physical_receipt" ? selectedReceiptIds : [],
            claimedForDate,
            narrative: narrative.trim() || undefined,
            idempotencyKey: claimIdempotencyKey,
          });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>What is the evidence?</span>
          <select
            value={sourceKind}
            onChange={(changeEvent) => {
              const parsed = EffortClaimSourceKindSchema.safeParse(changeEvent.target.value);
              if (parsed.success) setSourceKind(parsed.data);
            }}
            className={INPUT_CLASS}
          >
            {EFFORT_CLAIM_SOURCE_KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {SOURCE_KIND_LABELS[kind]}
              </option>
            ))}
          </select>
        </label>

        {sourceKind === "daily_log" && (
          <label className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Which log</span>
            <input
              required
              value={dailyLogId}
              onChange={(changeEvent) => setDailyLogId(changeEvent.target.value)}
              placeholder="The log's id, from the Daily Logs tab"
              className={INPUT_CLASS}
            />
          </label>
        )}

        {sourceKind === "physical_receipt" && (
          <div className="flex flex-col gap-1">
            <span className={LABEL_CLASS}>Which receipts</span>
            {receipts.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Upload one below first. A physical claim&apos;s minutes come from the capture times
                inside the images, so there is nothing to derive without them.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {receipts.map((receipt) => (
                  <button
                    key={receipt.id}
                    type="button"
                    onClick={() => toggleReceipt(receipt.id)}
                    aria-pressed={selectedReceiptIds.includes(receipt.id)}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium ${
                      selectedReceiptIds.includes(receipt.id)
                        ? "bg-[#00696E] text-white"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {RECEIPT_KIND_LABELS[receipt.receiptKind]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Which day is it for?</span>
          <input
            required
            type="date"
            value={claimedForDate}
            onChange={(changeEvent) => setClaimedForDate(changeEvent.target.value)}
            className={INPUT_CLASS}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={LABEL_CLASS}>Anything the evidence does not show (optional)</span>
          <textarea
            rows={2}
            value={narrative}
            onChange={(changeEvent) => setNarrative(changeEvent.target.value)}
            className={INPUT_CLASS}
          />
        </label>

        <button
          type="submit"
          disabled={submitMutation.isPending}
          className="cursor-pointer rounded-full bg-[#00696E] px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {submitMutation.isPending ? "Filing…" : "File the claim"}
        </button>

        {/* The 202 made visible: filed, not graded, and worth nothing yet. */}
        {submitMutation.isSuccess && (
          <MutationAcceptedNotice message="Filed. The pipeline is checking it now — no minutes and no slices exist for it yet. The verdict appears in the claim list above when it lands." />
        )}
      </form>

      <div className="space-y-2 border-t border-[#CAC4D0]/40 pt-3">
        <span className={LABEL_CLASS}>Upload a receipt</span>
        <select
          value={receiptKind}
          onChange={(changeEvent) => {
            const parsed = PhysicalReceiptKindSchema.safeParse(changeEvent.target.value);
            if (parsed.success) setReceiptKind(parsed.data);
          }}
          className={INPUT_CLASS}
        >
          {PHYSICAL_RECEIPT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {RECEIPT_KIND_LABELS[kind]}
            </option>
          ))}
        </select>
        <input
          type="file"
          accept="image/*,.dwg,.dxf,.step,.stl"
          onChange={(changeEvent) => {
            const receiptFile = changeEvent.target.files?.[0];
            if (!receiptFile) return;
            uploadMutation.mutate(
              { receiptFile, receiptKind, idempotencyKey: uploadIdempotencyKey },
              // A NEW KEY FOR THE NEXT FILE. The one just used belongs to this upload;
              // reusing it would make a genuinely different receipt look like a retry.
              { onSuccess: () => setUploadIdempotencyKey(newIdempotencyKey()) },
            );
          }}
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Size, hashes and the capture time are measured from the file itself — nothing about it is
          taken from this form. A near-duplicate of an image already uploaded is refused.
        </p>

        {uploadMutation.isSuccess && (
          <MutationAcceptedNotice message="Received. Forensics are running on it; the checks appear beside the receipt when they finish." />
        )}

        {receipts.length > 0 && (
          <ul className="space-y-1 text-xs">
            {receipts.map((receipt) => (
              <li key={receipt.id} className="flex items-center justify-between gap-2">
                <span>
                  {RECEIPT_KIND_LABELS[receipt.receiptKind]}
                  {receipt.claimId !== null && " · cited by a claim"}
                </span>
                {/* Refused once cited — the bytes are evidence at that point. */}
                {receipt.claimId === null && (
                  <button
                    type="button"
                    disabled={deleteReceiptMutation.isPending}
                    onClick={() => deleteReceiptMutation.mutate(receipt.id)}
                    className="cursor-pointer font-medium text-[#00696E] disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {firstError !== undefined && <MutationErrorNotice error={firstError.apiError} />}
    </section>
  );
}
