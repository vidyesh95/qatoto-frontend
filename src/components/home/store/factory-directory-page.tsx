// TRANSPORT: server-fetch — awaits `listStoreFactories` and branches on the result.
//
// `/store/factories`. The "Factories Worldwide" tile's destination, which for the life of this
// codebase pointed at a route that did not exist.
//
// TWO HONESTY PROBLEMS, BOTH DELIBERATE AND BOTH VISIBLE IN THE COPY:
//
//  1. VERIFICATION IS ABOUT THE ORGANIZATION, NOT THE CAPABILITY. `site_audited` says somebody
//     stood in the building. It does not say this factory is approved to do injection moulding, and
//     no per-capability approval exists anywhere on the wire. Every label says what was checked —
//     "Documents reviewed", "Site audited" — and there is no bare tick on this page. This is the
//     same trap `provider-directory-page.tsx` calls out, avoided rather than repeated.
//  2. A CARD NAMES ITS CERTIFICATIONS AND CANNOT SAY WHETHER THEY ARE CURRENT. Validity windows are
//     on the detail read only. So the chips here are neutral, and the words "certified" and "valid"
//     appear nowhere on a card — a lapsed ISO 9001 and a fresh one look identical from a list, and
//     the honest render is to name the standard without endorsing it.

import Image from "next/image";
import Link from "next/link";

import FilterChipRow, { type FilterChipOption } from "@/components/home/shared/filter-chip-row";
import CursorPageControl from "@/components/home/store/shared/cursor-page-control";
import {
  StoreEmptyFilteredPanel,
  StoreEmptyPanel,
  StoreErrorPanel,
} from "@/components/home/store/shared/store-status-panel";
import {
  buildFilterHref,
  readEnumParam,
  readSingleParam,
  type RawSearchParams,
} from "@/lib/filter-href";
import {
  FACTORY_CAPABILITY_KINDS,
  FACTORY_CAPABILITY_SHORT_LABELS,
  FACTORY_CERTIFICATION_LABELS,
  FACTORY_CERTIFICATIONS,
  FACTORY_VERIFICATION_LABELS,
  type FactoryCard,
} from "@/lib/store/factories.schemas";
import { listStoreFactories } from "@/lib/store/factories.api";
import {
  countryLabelFromCode,
  formatCountLabel,
  formatLeadTimeRangeLabel,
  formatPercentageLabel,
} from "@/lib/store/format";

type FactoryDirectoryViewState =
  | { status: "error"; message: string }
  | { status: "empty"; appliedFilterCount: number }
  | {
      status: "ready";
      factories: FactoryCard[];
      nextCursor: string | null;
      hasMore: boolean;
    };

export default async function FactoryDirectoryPage({
  searchParams,
}: {
  searchParams: RawSearchParams;
}) {
  // `readEnumParam` DROPS an unrecognized value rather than forwarding it — a hand-edited
  // `?capabilityKind=banana` becomes "no filter" instead of a 422 error page.
  const capabilityKind = readEnumParam(searchParams, "capabilityKind", FACTORY_CAPABILITY_KINDS);
  const certification = readEnumParam(searchParams, "certification", FACTORY_CERTIFICATIONS);
  const requestedCursor = readSingleParam(searchParams, "cursor");

  const result = await listStoreFactories({
    capabilityKind,
    certification,
    cursor: requestedCursor,
  });

  const appliedFilterCount =
    (capabilityKind === undefined ? 0 : 1) + (certification === undefined ? 0 : 1);

  const viewState: FactoryDirectoryViewState = !result.success
    ? { status: "error", message: result.error.message }
    : result.data.items.length === 0
      ? { status: "empty", appliedFilterCount }
      : {
          status: "ready",
          factories: result.data.items,
          nextCursor: result.data.page.nextCursor,
          hasMore: result.data.page.hasMore,
        };

  const capabilityOptions: FilterChipOption[] = [
    {
      label: "All capabilities",
      href: buildFilterHref(searchParams, { capabilityKind: undefined }),
      isSelected: capabilityKind === undefined,
    },
    ...FACTORY_CAPABILITY_KINDS.map((kind) => ({
      label: FACTORY_CAPABILITY_SHORT_LABELS[kind],
      href: buildFilterHref(searchParams, { capabilityKind: kind }),
      isSelected: capabilityKind === kind,
    })),
  ];

  const certificationOptions: FilterChipOption[] = [
    {
      label: "Any certification",
      href: buildFilterHref(searchParams, { certification: undefined }),
      isSelected: certification === undefined,
    },
    ...FACTORY_CERTIFICATIONS.map((certificationValue) => ({
      label: FACTORY_CERTIFICATION_LABELS[certificationValue],
      href: buildFilterHref(searchParams, { certification: certificationValue }),
      isSelected: certification === certificationValue,
    })),
  ];

  return (
    <div className="pb-8">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">
          Factories worldwide
        </h1>
        <p className="mt-1 text-sm leading-5 text-[#6F7979]">
          ODM and OEM manufacturers, by what they make and how small an order they will take. Write
          to any of them directly — none requires an order on Qatoto first.
        </p>
      </header>

      <div className="space-y-2 px-4 pt-4 lg:px-6">
        <FilterChipRow
          options={capabilityOptions}
          ariaLabel="Filter factories by manufacturing capability"
        />
        <FilterChipRow
          options={certificationOptions}
          ariaLabel="Filter factories by certification"
        />
      </div>

      {renderFactoryDirectory(viewState, searchParams)}
    </div>
  );
}

function renderFactoryDirectory(
  viewState: FactoryDirectoryViewState,
  searchParams: RawSearchParams,
) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "empty":
      return (
        <div className="px-4 pt-6 lg:px-6">
          {viewState.appliedFilterCount > 0 ? (
            <StoreEmptyFilteredPanel
              appliedFilterCount={viewState.appliedFilterCount}
              clearFiltersHref="/store/factories"
            />
          ) : (
            <StoreEmptyPanel message="No factories are listed yet." />
          )}
        </div>
      );
    case "ready":
      return (
        <>
          <ul className="mt-4 space-y-3 px-4 lg:px-6">
            {viewState.factories.map((factory) => (
              <li key={factory.organizationId}>
                <FactoryRow factory={factory} />
              </li>
            ))}
          </ul>
          <CursorPageControl
            nextCursor={viewState.nextCursor}
            hasMore={viewState.hasMore}
            buildCursorHref={(cursor) => buildFilterHref(searchParams, { cursor })}
            label="Show more factories"
          />
        </>
      );
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function FactoryRow({ factory }: { factory: FactoryCard }) {
  const { fulfillmentMetrics } = factory;
  const leadTimeLabel = formatLeadTimeRangeLabel(
    factory.minimumLeadTimeDays,
    factory.maximumLeadTimeDays,
  );

  return (
    <Link
      href={`/store/factories/${factory.slug}`}
      className="block rounded-xl border border-[#CAC4D0]/60 px-4 py-3 transition-colors hover:border-[#2A76FD]"
    >
      <div className="flex items-start gap-3">
        {factory.logoUrl === null ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#D6E3FF] text-sm font-medium text-[#00696E]">
            {factory.displayName.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <Image
            src={factory.logoUrl}
            alt=""
            width={40}
            height={40}
            className="size-10 shrink-0 rounded-full object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <p className="text-sm leading-5 font-medium text-[#191C1C]">{factory.displayName}</p>
          <p className="text-xs leading-4 text-[#6F7979]">
            {countryLabelFromCode(factory.countryCode)}
          </p>
        </div>

        {/* Not taking inquiries is worth saying; taking them is the default and is not. */}
        {!factory.acceptingInquiries && (
          <span className="shrink-0 rounded bg-[#F2F4F4] px-2 py-0.5 text-[11px] leading-4 font-medium text-[#6F7979]">
            Not taking inquiries
          </span>
        )}
      </div>

      {factory.publicSummary !== null && (
        <p className="mt-2 line-clamp-2 text-xs leading-4 text-[#6F7979]">
          {factory.publicSummary}
        </p>
      )}

      {factory.capabilityKinds.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {factory.capabilityKinds.map((capabilityKind) => (
            <li
              key={capabilityKind}
              className="rounded-full bg-[#D6E3FF] px-2 py-0.5 text-[11px] leading-4 font-medium text-[#00696E]"
            >
              {FACTORY_CAPABILITY_SHORT_LABELS[capabilityKind]}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-4">
        {/* Says WHAT WAS CHECKED. Never "verified factory" — see the file header. */}
        <span className="text-[#00696E]">
          {FACTORY_VERIFICATION_LABELS[factory.verificationState]}
        </span>

        {/* The MOQ pair renders only when BOTH halves arrived: "500" without a unit is not a
            minimum anybody can act on. */}
        {factory.minimumOrderQuantity !== null &&
          factory.minimumOrderQuantityUnitLabel !== null && (
            <span className="text-[#191C1C]">
              from {formatCountLabel(factory.minimumOrderQuantity)}{" "}
              {factory.minimumOrderQuantityUnitLabel}
            </span>
          )}

        {leadTimeLabel !== null && <span className="text-[#6F7979]">{leadTimeLabel}</span>}

        {/* A rate of `null` means BELOW THE SAMPLE THRESHOLD, so the sample size is stated instead
            of a percentage. Printing 0% would publish a failure this factory never earned; printing
            nothing at all would hide that it has delivered work. */}
        {fulfillmentMetrics.onTimeShipmentRate === null ? (
          fulfillmentMetrics.completedOrderCount > 0 && (
            <span className="text-[#6F7979]">
              {formatCountLabel(fulfillmentMetrics.completedOrderCount)} completed · not enough data
              for an on-time rate
            </span>
          )
        ) : (
          <span className="text-[#6F7979]">
            {formatPercentageLabel(fulfillmentMetrics.onTimeShipmentRate)} on time across{" "}
            {formatCountLabel(fulfillmentMetrics.onTimeSampleSize)} orders
          </span>
        )}
      </div>

      {factory.certifications.length > 0 && (
        <p className="mt-1.5 text-[11px] leading-4 text-[#6F7979]">
          {/* "Holds" and not "certified": this read carries no validity window, so the page cannot
              claim any of these is current. The detail page can, and does. */}
          Holds{" "}
          {factory.certifications
            .map((certification) => FACTORY_CERTIFICATION_LABELS[certification])
            .join(" · ")}
        </p>
      )}
    </Link>
  );
}
