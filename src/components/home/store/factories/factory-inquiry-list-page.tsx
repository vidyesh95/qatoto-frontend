// TRANSPORT: client-query — reads `/commerce/factories/inquiries/mine` or `…/received`.
"use client";

// ONE COMPONENT FOR BOTH SIDES, chosen the way `rfq-list.tsx` already handles `/store/rfqs` versus
// `/studio/rfqs`: the row shape is identical, the backend decides which party you are, and two
// components would be two places for the buyer's and the factory's reading of one inquiry to
// drift apart.
//
// `side` CHANGES COPY AND THE READ, NEVER PERMISSION. Nothing here is a trust boundary — a client
// that flipped the prop would just call the other endpoint and get whatever that endpoint decides
// it may see.
//
// THE `received` QUEUE NEVER CONTAINS A `draft`, and that is the backend's rule rather than a
// filter applied here (§16.5). Creating an inquiry notifies nobody, so a factory that could see
// drafts would be reading mail nobody posted. If one ever appears in this list, that is a backend
// bug and not a rendering decision.

import Link from "next/link";

import {
  StoreEmptyPanel,
  StoreErrorPanel,
  StoreSignInRequiredPanel,
} from "@/components/home/store/shared/store-status-panel";
import WorkQueueSkeleton from "@/components/home/store/skeletons/work-queue-skeleton";
import {
  useOwnFactoryInquiriesQuery,
  useReceivedFactoryInquiriesQuery,
} from "@/hooks/store/factories";
import { formatCentsLabel, formatIsoInstantLabel } from "@/lib/store/format";
import {
  FACTORY_CAPABILITY_SHORT_LABELS,
  FACTORY_INQUIRY_STATE_LABELS,
  type FactoryInquiry,
} from "@/lib/store/factories.schemas";

export type FactoryInquirySide = "buyer" | "factory";

type InquiryListViewState =
  | { status: "loading" }
  | { status: "signInRequired"; message: string }
  | { status: "error"; message: string }
  | { status: "empty" }
  | { status: "ready"; inquiries: FactoryInquiry[] };

const SIDE_COPY: Record<
  FactoryInquirySide,
  { readonly title: string; readonly subtitle: string; readonly emptyMessage: string }
> = {
  buyer: {
    title: "Your manufacturing inquiries",
    subtitle: "Everything you have written to a factory, including drafts you have not sent.",
    emptyMessage:
      "You have not written to a factory yet. Open one from the manufacturer directory and start there.",
  },
  factory: {
    title: "Manufacturing inquiries",
    subtitle: "Buyers who have written to you. Drafts they have not sent are not here.",
    emptyMessage: "Nobody has written to you yet.",
  },
};

export default function FactoryInquiryListPage({
  side,
  detailHrefBase,
}: {
  side: FactoryInquirySide;
  detailHrefBase: string;
}) {
  // BOTH HOOKS RUN, and only one is enabled by the branch below — React's rules forbid calling a
  // hook conditionally, and the disabled one costs a cache key rather than a request.
  const ownInquiriesQuery = useOwnFactoryInquiriesQuery();
  const receivedInquiriesQuery = useReceivedFactoryInquiriesQuery();
  const inquiriesQuery = side === "buyer" ? ownInquiriesQuery : receivedInquiriesQuery;
  const copy = SIDE_COPY[side];

  const viewState: InquiryListViewState = (() => {
    if (inquiriesQuery.isPending) return { status: "loading" };
    if (inquiriesQuery.isError) {
      return { status: "error", message: "Those inquiries could not be loaded." };
    }
    const result = inquiriesQuery.data;
    if (result === undefined) return { status: "loading" };
    if (!result.success) {
      if (result.error.code === "401") {
        return { status: "signInRequired", message: result.error.message };
      }
      return { status: "error", message: result.error.message };
    }
    if (result.data.items.length === 0) return { status: "empty" };
    return { status: "ready", inquiries: result.data.items };
  })();

  return (
    <div className="mx-auto w-full max-w-3xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-xl font-semibold text-[#191C1C] md:text-2xl">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">{copy.subtitle}</p>
      </header>

      <div className="px-4 pt-6 lg:px-6">
        {renderInquiryList(viewState, copy.emptyMessage, side, detailHrefBase)}
      </div>
    </div>
  );
}

function renderInquiryList(
  viewState: InquiryListViewState,
  emptyMessage: string,
  side: FactoryInquirySide,
  detailHrefBase: string,
) {
  switch (viewState.status) {
    case "loading":
      return <WorkQueueSkeleton />;
    case "signInRequired":
      return <StoreSignInRequiredPanel message={viewState.message} />;
    case "error":
      return <StoreErrorPanel message={viewState.message} />;
    case "empty":
      return <StoreEmptyPanel message={emptyMessage} />;
    case "ready":
      return (
        <ul className="space-y-3">
          {viewState.inquiries.map((inquiry) => (
            <li key={inquiry.id}>
              <InquiryRow inquiry={inquiry} side={side} detailHrefBase={detailHrefBase} />
            </li>
          ))}
        </ul>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function InquiryRow({
  inquiry,
  side,
  detailHrefBase,
}: {
  inquiry: FactoryInquiry;
  side: FactoryInquirySide;
  detailHrefBase: string;
}) {
  const counterpartyName = side === "buyer" ? inquiry.factoryDisplayName : inquiry.buyerDisplayName;

  return (
    <article className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
      <p className="text-xs leading-4 text-[#6F7979]">
        {/* The reference is what somebody reads out on a call, so it leads the row. */}
        {inquiry.reference}
        {" · "}
        {FACTORY_INQUIRY_STATE_LABELS[inquiry.state]}
        {" · "}
        {FACTORY_CAPABILITY_SHORT_LABELS[inquiry.capabilityKind]}
      </p>

      <h2 className="mt-1 text-sm leading-5 font-medium text-[#191C1C]">
        <Link href={`${detailHrefBase}/${inquiry.id}`} className="hover:underline">
          {counterpartyName}
        </Link>
      </h2>

      {/* `line-clamp-2` rather than a server excerpt: this read carries the whole description and
          there is no truncated field on the wire to prefer. */}
      <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#6F7979]">
        {inquiry.productDescription}
      </p>

      <p className="mt-2 text-[11px] leading-4 text-[#6F7979]">
        {describeQuantity(inquiry)}
        {describeTargetPrice(inquiry)}
        {/* `sentAt` NULL IS THE DRAFT CASE. A renderer must not print "sent" without it. */}
        {inquiry.sentAt === null
          ? " · not sent yet"
          : ` · sent ${formatIsoInstantLabel(inquiry.sentAt)}`}
      </p>
    </article>
  );
}

/**
 * The quantity pair, or nothing.
 *
 * BOTH-OR-NEITHER, like the MOQ pair it will be compared against: a bare number is unreadable
 * because 500 pieces and 500 cartons are different businesses. If either half is missing the
 * clause is dropped rather than half-printed.
 */
function describeQuantity(inquiry: FactoryInquiry): string {
  if (inquiry.estimatedAnnualQuantity === null || inquiry.unitLabel === null) {
    return "Quantity not stated";
  }
  return `About ${inquiry.estimatedAnnualQuantity.toLocaleString("en-US")} ${inquiry.unitLabel} a year`;
}

/**
 * The target price, or an explicit absence.
 *
 * NULL IS "NOBODY NAMED A PRICE", NEVER ZERO. Printing a currency-formatted `0` here would be
 * asking the factory to work for nothing, which is the same failure the composer avoids by
 * omitting a blank field rather than sending `0`.
 */
function describeTargetPrice(inquiry: FactoryInquiry): string {
  if (inquiry.targetUnitPriceInCents === null || inquiry.currency === null) return "";
  return ` · target ${formatCentsLabel(inquiry.targetUnitPriceInCents, inquiry.currency)} a unit`;
}
