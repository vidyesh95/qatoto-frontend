// TRANSPORT: client-query — reads one inquiry and drives send / answer / close.
"use client";

// One manufacturing inquiry, for whichever party the viewer turns out to be.
//
// THE CONTROLS ARE DERIVED FROM STATE, NOT FROM ROLE ALONE, and the table is short enough to
// state outright:
//
//   draft     → buyer may SEND, either may CLOSE
//   sent      → factory may mark ANSWERED, either may CLOSE
//   answered  → either may CLOSE
//   closed    → nothing
//
// `side` PICKS COPY AND WHICH CONTROLS ARE OFFERED; IT GRANTS NOTHING. The backend decides what
// this viewer may do, and a client that flipped the prop would get a refusal rather than a
// privilege. What it buys is not showing a factory a "Send" button for somebody else's draft.
//
// TWO SENTENCES THIS PAGE MUST BE UNABLE TO WRITE:
//
//  · "SENT" ON A DRAFT. Creating an inquiry notifies nobody; sending is a separate act with its
//    own route, and it is the send that opens the thread. `sentAt === null` is the check, not the
//    presence of a row.
//  · "THE FACTORY HAS REPLIED TO YOU" ON `answered`. That state is a bookkeeping mark the factory
//    pressed to clear its queue. The actual reply is a message in the thread, and conflating the
//    two sends a buyer looking for words that may not exist yet.

import Link from "next/link";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import {
  StoreErrorPanel,
  StoreSignInRequiredPanel,
} from "@/components/home/store/shared/store-status-panel";
import RecordDetailSkeleton from "@/components/home/store/skeletons/record-detail-skeleton";
import {
  useAnswerFactoryInquiry,
  useCloseFactoryInquiry,
  useFactoryInquiryQuery,
  useSendFactoryInquiry,
} from "@/hooks/store/factories";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import type { FactoryInquirySide } from "@/components/home/store/factories/factory-inquiry-list-page";
import { formatCentsLabel, formatIsoDateLabel, formatIsoInstantLabel } from "@/lib/store/format";
import {
  FACTORY_CAPABILITY_LABELS,
  FACTORY_CERTIFICATION_LABELS,
  FACTORY_INQUIRY_STATE_LABELS,
  type FactoryInquiry,
} from "@/lib/store/factories.schemas";

type InquiryDetailViewState =
  | { status: "loading" }
  | { status: "signInRequired"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; inquiry: FactoryInquiry };

const PRIMARY_BUTTON_CLASS =
  "rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50";

const QUIET_BUTTON_CLASS =
  "rounded-full bg-background px-4 py-2 text-sm font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] transition-colors hover:bg-muted disabled:opacity-50";

export default function FactoryInquiryDetailPage({
  inquiryId,
  side,
  backHref,
}: {
  inquiryId: string;
  side: FactoryInquirySide;
  backHref: string;
}) {
  const inquiryQuery = useFactoryInquiryQuery(inquiryId);

  const viewState: InquiryDetailViewState = (() => {
    if (inquiryQuery.isPending) return { status: "loading" };
    if (inquiryQuery.isError) {
      return { status: "error", message: "That inquiry could not be loaded." };
    }
    const result = inquiryQuery.data;
    if (result === undefined) return { status: "loading" };
    if (!result.success) {
      if (result.error.code === "401") {
        return { status: "signInRequired", message: result.error.message };
      }
      // A 404 IS RENDERED AS A 404 AND NOT AS A PERMISSION HINT. The backend answers 404 for "no
      // such inquiry" and "not yours" with one code, deliberately, so a stranger cannot probe
      // which ids exist.
      return { status: "error", message: result.error.message };
    }
    return { status: "ready", inquiry: result.data.inquiry };
  })();

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <nav className="px-4 pt-4 text-xs leading-4 text-[#6F7979] lg:px-6" aria-label="Breadcrumb">
        <Link href={backHref} className="hover:underline">
          Manufacturing inquiries
        </Link>
      </nav>
      <div className="px-4 pt-3 lg:px-6">{renderInquiryDetail(viewState, side)}</div>
    </div>
  );
}

function renderInquiryDetail(viewState: InquiryDetailViewState, side: FactoryInquirySide) {
  switch (viewState.status) {
    case "loading":
      return <RecordDetailSkeleton />;
    case "signInRequired":
      return <StoreSignInRequiredPanel message={viewState.message} />;
    case "error":
      return <StoreErrorPanel message={viewState.message} />;
    case "ready":
      return <InquiryBody inquiry={viewState.inquiry} side={side} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function InquiryBody({ inquiry, side }: { inquiry: FactoryInquiry; side: FactoryInquirySide }) {
  return (
    <article>
      <header>
        <p className="text-xs leading-4 text-[#6F7979]">
          {inquiry.reference} · {FACTORY_INQUIRY_STATE_LABELS[inquiry.state]}
        </p>
        <h1 className="mt-1 font-serif text-xl font-semibold text-[#191C1C] md:text-2xl">
          {side === "buyer" ? inquiry.factoryDisplayName : inquiry.buyerDisplayName}
        </h1>
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          {FACTORY_CAPABILITY_LABELS[inquiry.capabilityKind]}
          {" · opened "}
          {formatIsoInstantLabel(inquiry.createdAt)}
        </p>
      </header>

      {inquiry.state === "draft" && (
        <p className="mt-3 rounded-lg bg-[#E0E3E3] px-3 py-2 text-xs leading-4 text-[#4A6364]">
          {/* The whole point of the draft state, said plainly. */}
          This is a draft. Nobody at the factory has seen it, and nothing was notified when you
          created it.
        </p>
      )}

      <section className="mt-4" aria-label="What was asked">
        <h2 className="text-sm font-medium text-[#191C1C]">What was asked</h2>
        <p className="mt-1 text-sm leading-6 whitespace-pre-line text-[#191C1C]">
          {inquiry.productDescription}
        </p>
      </section>

      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailRow label="Estimated annual quantity" value={describeQuantity(inquiry)} />
        <DetailRow label="Target unit price" value={describeTargetPrice(inquiry)} />
        <DetailRow
          label="Wanted by"
          value={
            inquiry.desiredFirstDeliveryAt === null
              ? "Not stated"
              : formatIsoDateLabel(inquiry.desiredFirstDeliveryAt)
          }
        />
        <DetailRow
          label="Certifications required"
          value={
            inquiry.requiredCertifications.length === 0
              ? "None named"
              : inquiry.requiredCertifications
                  .map((certification) => FACTORY_CERTIFICATION_LABELS[certification])
                  .join(", ")
          }
        />
      </dl>

      {inquiry.notes !== null && (
        <section className="mt-4" aria-label="Notes">
          <h2 className="text-sm font-medium text-[#191C1C]">Notes</h2>
          <p className="mt-1 text-sm leading-6 whitespace-pre-line text-[#191C1C]">
            {inquiry.notes}
          </p>
        </section>
      )}

      {inquiry.threadId !== null && (
        <p className="mt-4 text-xs leading-4 text-[#6F7979]">
          {/* The thread is one-to-one by definition — an RFQ thread would put competitors in it. */}
          A private thread was opened when this was sent. Messages live there, not on this page.
        </p>
      )}

      <InquiryControls inquiry={inquiry} side={side} />
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#CAC4D0]/60 px-3 py-2">
      <dt className="text-[11px] leading-4 text-[#6F7979]">{label}</dt>
      <dd className="mt-0.5 text-sm leading-5 text-[#191C1C]">{value}</dd>
    </div>
  );
}

// --- Controls ----------------------------------------------------------------

function InquiryControls({ inquiry, side }: { inquiry: FactoryInquiry; side: FactoryInquirySide }) {
  const sendInquiry = useSendFactoryInquiry();
  const answerInquiry = useAnswerFactoryInquiry();
  const closeInquiry = useCloseFactoryInquiry();
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const canSend = side === "buyer" && inquiry.state === "draft";
  const canMarkAnswered = side === "factory" && inquiry.state === "sent";
  const canClose = inquiry.state !== "closed";

  if (!canSend && !canMarkAnswered && !canClose) {
    return (
      <p className="mt-6 rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
        This inquiry is closed. It stays readable.
      </p>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      {canSend && (
        <span>
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            disabled={sendInquiry.isPending}
            onClick={() =>
              sendInquiry.mutate(
                { inquiryId: inquiry.id, idempotencyKey: getIdempotencyKey() },
                {
                  onSuccess: (result) => {
                    // Rotated only on a confirmed success — a retry after a network failure must
                    // carry the original key, or sending twice opens two threads.
                    if (result.success) resetIdempotencyKey();
                  },
                },
              )
            }
          >
            Send to the factory
          </button>
          <MutationNotice
            result={sendInquiry.data}
            fallbackMessage="That did not send. Try again."
            hasThrown={sendInquiry.isError}
          />
        </span>
      )}

      {canMarkAnswered && (
        <span>
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            disabled={answerInquiry.isPending}
            onClick={() => answerInquiry.mutate({ inquiryId: inquiry.id })}
          >
            {/* Says what it does. Pressing this writes to nobody. */}
            Mark as answered in your queue
          </button>
          <MutationNotice
            result={answerInquiry.data}
            fallbackMessage="That did not save. Try again."
            hasThrown={answerInquiry.isError}
          />
        </span>
      )}

      {canClose && (
        <span>
          <button
            type="button"
            className={QUIET_BUTTON_CLASS}
            disabled={closeInquiry.isPending}
            onClick={() => closeInquiry.mutate({ inquiryId: inquiry.id })}
          >
            Close this inquiry
          </button>
          <MutationNotice
            result={closeInquiry.data}
            fallbackMessage="That did not close. Try again."
            hasThrown={closeInquiry.isError}
          />
        </span>
      )}
    </div>
  );
}

function describeQuantity(inquiry: FactoryInquiry): string {
  if (inquiry.estimatedAnnualQuantity === null || inquiry.unitLabel === null) return "Not stated";
  return `${inquiry.estimatedAnnualQuantity.toLocaleString("en-US")} ${inquiry.unitLabel}`;
}

/** `null` is "nobody named a price", never zero — see the list page for the same rule. */
function describeTargetPrice(inquiry: FactoryInquiry): string {
  if (inquiry.targetUnitPriceInCents === null || inquiry.currency === null) return "Not stated";
  return formatCentsLabel(inquiry.targetUnitPriceInCents, inquiry.currency);
}
