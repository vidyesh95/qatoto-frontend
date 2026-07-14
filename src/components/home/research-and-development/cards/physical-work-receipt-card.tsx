import type {
  ImageForensicsCheckKind,
  ImageForensicsCheckResult,
  PhysicalReceiptKind,
  PhysicalReceiptVerdict,
  PhysicalWorkReceipt,
  TeamMember,
} from "@/types/research-and-development";

const RECEIPT_KIND_GLYPHS: Record<PhysicalReceiptKind, string> = {
  "cad-file": "C",
  photo: "P",
  "material-receipt": "R",
};

const RECEIPT_KIND_LABELS: Record<PhysicalReceiptKind, string> = {
  "cad-file": "CAD file",
  photo: "Photo",
  "material-receipt": "Material receipt",
};

const FORENSICS_CHECK_LABELS: Record<ImageForensicsCheckKind, string> = {
  "exif-metadata": "EXIF metadata",
  "device-fingerprint": "Device fingerprint",
  "reverse-image-search": "Reverse-image search",
};

const FORENSICS_RESULT_CLASSES: Record<ImageForensicsCheckResult, string> = {
  passed: "bg-green-100 text-green-800",
  flagged: "bg-red-100 text-red-800",
};

const RECEIPT_VERDICT_BADGES: Record<PhysicalReceiptVerdict, { label: string; className: string }> =
  {
    accepted: { label: "Accepted", className: "bg-[#00696E]/10 text-[#00696E]" },
    "under-review": { label: "Under review", className: "bg-amber-100 text-amber-800" },
    rejected: { label: "Rejected", className: "bg-red-100 text-red-800" },
  };

// Physical-proof upload for non-digital work, with per-check image-forensics
// chips. Findings repeat as plain lines below the chips — title tooltips alone
// hide them on touch devices. Forensics verdicts are display-only mocks.
export default function PhysicalWorkReceiptCard({
  receipt,
  uploader,
}: {
  receipt: PhysicalWorkReceipt;
  uploader: TeamMember;
}) {
  const verdictBadge = RECEIPT_VERDICT_BADGES[receipt.verdict];

  return (
    <div className="space-y-2 rounded-2xl border border-[#CAC4D0]/60 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-sm font-semibold">
          {RECEIPT_KIND_GLYPHS[receipt.receiptKind]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{receipt.fileName}</p>
          <p className="text-xs text-muted-foreground">
            {RECEIPT_KIND_LABELS[receipt.receiptKind]} · {receipt.fileSizeLabel} ·{" "}
            {receipt.uploadedDateLabel}
          </p>
        </div>
        <span
          className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${verdictBadge.className}`}
        >
          {verdictBadge.label}
        </span>
      </div>
      <p className="text-sm">
        {uploader.name} — {receipt.claimSummary}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {receipt.forensicsChecks.map((forensicsCheck) => (
          <span
            key={forensicsCheck.kind}
            title={forensicsCheck.findingSummary}
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${FORENSICS_RESULT_CLASSES[forensicsCheck.result]}`}
          >
            {FORENSICS_CHECK_LABELS[forensicsCheck.kind]}
          </span>
        ))}
      </div>
      <div className="space-y-0.5">
        {receipt.forensicsChecks.map((forensicsCheck) => (
          <p key={forensicsCheck.kind} className="text-xs text-muted-foreground">
            {forensicsCheck.findingSummary}
          </p>
        ))}
      </div>
      <p className="text-sm">{receipt.verdictDetail}</p>
    </div>
  );
}
