import { formatIsoInstantLabel } from "@/lib/store/format";

export interface AuthoringReceiptMetaProps {
  readonly itemLabel: string;
  readonly submissionId: string;
  readonly receivedAt: string;
}

export function AuthoringReceiptMeta({
  itemLabel,
  submissionId,
  receivedAt,
}: AuthoringReceiptMetaProps) {
  return (
    <dl className="mt-4">
      <div className="border-t border-border py-2">
        <dt className="text-xs tracking-wider text-muted-foreground uppercase">{itemLabel}</dt>
        <dd className="mt-0.5 font-mono text-sm text-foreground">{submissionId}</dd>
      </div>
      <div className="border-t border-border py-2">
        <dt className="text-xs tracking-wider text-muted-foreground uppercase">Received</dt>
        <dd className="mt-0.5 text-sm text-foreground">{formatIsoInstantLabel(receivedAt)}</dd>
      </div>
    </dl>
  );
}
