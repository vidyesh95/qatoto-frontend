// TRANSPORT: server-fetch — awaits `getStoreFactory` and branches on the result.
//
// `/store/factories/:factorySlug`. One manufacturer: what it runs, where, what it holds, and what
// it will do about a sample.
//
// THREE THINGS THIS PAGE IS CAREFUL ABOUT, all of them cases where the pleasant render is a lie:
//
//  1. A CERTIFICATION'S VALIDITY IS SHOWN, NOT ASSUMED. `CertificationValidityPill` is reused
//     unchanged from the storefront — it resolves after mount because lapsing depends on "now" and
//     `cacheComponents` refuses `new Date()` during prerender. The dates themselves are
//     server-rendered and always visible, so nothing is withheld while the pill is deciding, and a
//     missing pill can never be mistaken for a claim of validity.
//     A `validUntil` of `null` means NO EXPIRY RECORDED and is rendered as exactly that. It is not
//     "valid indefinitely", and the pill is not rendered for it at all — there is nothing to lapse.
//  2. A SAMPLE FEE OF `0` IS FREE AND `null` IS UNSTATED. Two branches, two sentences. Collapsing
//     them is how a buyer orders a sample believing it is free and meets the charge at invoice.
//  3. `lastAuditedAt` OF `null` MEANS NOBODY HAS BEEN. It renders as an absence rather than being
//     omitted, because a missing row reads as "not shown here" while an explicit "never audited"
//     reads as what it is.

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import CertificationValidityPill from "@/components/home/store/sections/organization/certification-validity-pill";
import { StoreErrorPanel } from "@/components/home/store/shared/store-status-panel";
import {
  FACTORY_CAPABILITY_LABELS,
  FACTORY_CERTIFICATION_LABELS,
  FACTORY_VERIFICATION_LABELS,
  type FactoryCertificationRecord,
  type FactoryOtherCertification,
  type FactoryDetail,
  type FactoryProductionLine,
  type FactorySamplePolicy,
  type FactorySite,
} from "@/lib/store/factories.schemas";
import { getStoreFactory } from "@/lib/store/factories.api";
import {
  countryLabelFromCode,
  formatCentsLabel,
  formatCountLabel,
  formatIsoDateLabel,
  formatLeadTimeRangeLabel,
  formatPercentageLabel,
  formatSquareMetresLabel,
} from "@/lib/store/format";

type FactoryDetailViewState =
  | { status: "error"; message: string }
  | { status: "ready"; detail: FactoryDetail };

export default async function FactoryDetailPage({ factorySlug }: { factorySlug: string }) {
  const result = await getStoreFactory(factorySlug);

  // A 404 is the route's answer, not the page's. The backend answers 404 for "no such factory" AND
  // for "not visible to you" with one code, deliberately, so a stranger cannot probe which slugs
  // exist — never render a permission hint from one.
  if (!result.success && result.error.code === "404") notFound();

  const viewState: FactoryDetailViewState = result.success
    ? { status: "ready", detail: result.data }
    : { status: "error", message: result.error.message };

  return <div className="pb-10">{renderFactoryDetail(viewState)}</div>;
}

function renderFactoryDetail(viewState: FactoryDetailViewState) {
  switch (viewState.status) {
    case "error":
      return (
        <div className="px-4 pt-6 lg:px-6">
          <StoreErrorPanel message={viewState.message} />
        </div>
      );
    case "ready":
      return <FactoryDetailBody detail={viewState.detail} />;
    default: {
      const exhaustiveCheck: never = viewState;
      return exhaustiveCheck;
    }
  }
}

function FactoryDetailBody({ detail }: { detail: FactoryDetail }) {
  const { factory } = detail;
  const leadTimeLabel = formatLeadTimeRangeLabel(
    factory.minimumLeadTimeDays,
    factory.maximumLeadTimeDays,
  );

  return (
    <article className="space-y-6">
      <header className="px-4 pt-4 lg:px-6">
        <nav className="pb-2 text-xs leading-4 text-[#6F7979]" aria-label="Breadcrumb">
          <Link href="/store/factories" className="hover:underline">
            Factories worldwide
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="text-[#191C1C]">{factory.displayName}</span>
        </nav>

        <div className="flex items-start gap-3">
          {factory.logoUrl === null ? (
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#D6E3FF] text-base font-medium text-[#00696E]">
              {factory.displayName.slice(0, 2).toUpperCase()}
            </span>
          ) : (
            <Image
              src={factory.logoUrl}
              alt=""
              width={56}
              height={56}
              className="size-14 shrink-0 rounded-full object-cover"
            />
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold text-[#191C1C] md:text-3xl">
              {factory.displayName}
            </h1>
            <p className="mt-0.5 text-sm leading-5 text-[#6F7979]">
              {countryLabelFromCode(factory.countryCode)} ·{" "}
              {FACTORY_VERIFICATION_LABELS[factory.verificationState]}
            </p>
          </div>
        </div>

        {factory.publicSummary !== null && (
          <p className="mt-3 text-sm leading-5 text-[#191C1C]">{factory.publicSummary}</p>
        )}

        <ul className="mt-3 flex flex-wrap gap-1.5">
          {factory.capabilityKinds.map((capabilityKind) => (
            <li
              key={capabilityKind}
              className="rounded-full bg-[#D6E3FF] px-3 py-1 text-xs leading-4 font-medium text-[#00696E]"
            >
              {FACTORY_CAPABILITY_LABELS[capabilityKind]}
            </li>
          ))}
        </ul>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {factory.acceptingInquiries ? (
            <Link
              href={`/store/factories/${factory.slug}/inquire`}
              className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Write to this factory
            </Link>
          ) : (
            // Not a disabled button: there is nothing to enable. Saying why is the affordance.
            <p className="rounded-full bg-[#F2F4F4] px-4 py-2 text-sm text-[#6F7979]">
              This factory is not taking new inquiries.
            </p>
          )}

          {/* Shown regardless of `acceptingInquiries`: a buyer with an open conversation still
              needs to reach it after the factory closes its inbox. */}
          <Link
            href="/store/factory-inquiries"
            className="rounded-full bg-background px-4 py-2 text-sm font-medium text-[#00696E] outline -outline-offset-1 outline-[#6F7979] transition-colors hover:bg-muted"
          >
            Your inquiries
          </Link>

          {/* The seller's own way in. The route reads the same public projection this page does,
              which is why it takes the slug rather than an organization id — see §6.6. */}
          <Link
            href={`/studio/factory-profile?factorySlug=${encodeURIComponent(factory.slug)}`}
            className="text-xs leading-4 text-[#6F7979] hover:underline"
          >
            Is this your factory? Edit its profile
          </Link>
        </div>
      </header>

      <FactSection title="At a glance">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fact
            label="Minimum order"
            // Both halves or neither — a bare number without its unit is not a minimum.
            value={
              factory.minimumOrderQuantity !== null &&
              factory.minimumOrderQuantityUnitLabel !== null
                ? `${formatCountLabel(factory.minimumOrderQuantity)} ${factory.minimumOrderQuantityUnitLabel}`
                : null
            }
            absentLabel="Not stated"
          />
          <Fact label="Production lead time" value={leadTimeLabel} absentLabel="Not stated" />
          <Fact
            label="On-time shipments"
            value={
              factory.fulfillmentMetrics.onTimeShipmentRate === null
                ? null
                : `${formatPercentageLabel(factory.fulfillmentMetrics.onTimeShipmentRate)} across ${formatCountLabel(factory.fulfillmentMetrics.onTimeSampleSize)} orders`
            }
            // NOT "0%". A null rate is too small a sample, so the count is the honest answer.
            absentLabel={`Not enough data — ${formatCountLabel(factory.fulfillmentMetrics.completedOrderCount)} orders completed`}
          />
          <Fact
            label="Last site audit"
            value={detail.lastAuditedAt === null ? null : formatIsoDateLabel(detail.lastAuditedAt)}
            absentLabel="Never audited by Qatoto"
          />
          <Fact
            // "HAS SHIPPED TO", NOT "SHIPS TO", because this list is DERIVED and not declared:
            // the backend computes it from delivery-address countries on completed orders, so the
            // factory cannot edit it and it describes what happened rather than what is offered.
            // A13's rule forces the distinction — a derived stat and a declared stat must not read
            // the same, and everything else in this block is declared.
            label="Has shipped to"
            value={
              detail.exportMarkets.length === 0
                ? null
                : detail.exportMarkets.map(countryLabelFromCode).join(", ")
            }
            absentLabel="No completed orders shipped abroad yet"
          />
        </dl>
      </FactSection>

      {detail.productionLines.length > 0 && (
        <FactSection title="Production lines">
          <ul className="space-y-3">
            {detail.productionLines.map((productionLine) => (
              <li key={productionLine.id}>
                <ProductionLineRow productionLine={productionLine} />
              </li>
            ))}
          </ul>
        </FactSection>
      )}

      {detail.certificationRecords.length > 0 && (
        <FactSection title="Certifications">
          {/* Says what these are before listing them. A certificate is the factory's document,
              reviewed at whatever depth `verificationState` states — it is not a Qatoto guarantee. */}
          <p className="pb-3 text-xs leading-4 text-[#6F7979]">
            Certificates the factory has provided. Check the validity dates — Qatoto records them,
            it does not issue them.
          </p>
          <ul className="space-y-2">
            {detail.certificationRecords.map((certificationRecord) => (
              <li
                key={`${certificationRecord.certification}-${certificationRecord.validFrom ?? "na"}`}
              >
                <CertificationRow certificationRecord={certificationRecord} />
              </li>
            ))}
          </ul>
        </FactSection>
      )}

      {detail.otherCertifications.length > 0 && (
        <FactSection title="Other certificates">
          {/* THE STANDARDS THE FILTER CANNOT SEE. `certification` is a closed eight-value enum so
              the filter chips are buildable and two spellings of one standard cannot sit side by
              side — but a factory holds standards no enum will finish enumerating, and dropping
              them would mean silently refusing to show a valid certificate somebody paid an
              auditor for. These are read, never matched. */}
          <p className="pb-3 text-xs leading-4 text-[#6F7979]">
            Held by this factory but outside the set you can filter on. Same rules — check the
            dates, Qatoto records these rather than issuing them.
          </p>
          <ul className="space-y-2">
            {detail.otherCertifications.map((otherCertification) => (
              <li
                key={`${otherCertification.standardName}-${otherCertification.validFrom ?? "na"}`}
              >
                <OtherCertificationRow otherCertification={otherCertification} />
              </li>
            ))}
          </ul>
        </FactSection>
      )}

      {detail.sites.length > 0 && (
        <FactSection title="Sites">
          {/*
            BOTH AREA FIGURES ARE PUBLISHED AND NEITHER IS RECONCILED (§16.3). The organization-wide
            floor area and these per-site figures are separately seller-declared, and when they
            disagree the read shows both rather than summing or preferring one — a platform that
            silently picked a winner would be asserting something neither party said. This line is
            what stops a reader assuming the per-site numbers add up to the headline one.
          */}
          <p className="pb-3 text-xs leading-4 text-[#6F7979]">
            Stated by the factory, site by site. The organization-wide floor area above is a
            separate figure it also stated; the two need not add up, and Qatoto does not reconcile
            them.
          </p>
          <ul className="space-y-3">
            {detail.sites.map((site) => (
              <li key={site.id}>
                <SiteRow site={site} />
              </li>
            ))}
          </ul>
        </FactSection>
      )}

      <FactSection title="Samples">
        <SamplePolicyBlock samplePolicy={detail.samplePolicy} />
      </FactSection>
    </article>
  );
}

// --- Pieces ------------------------------------------------------------------

function FactSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 lg:px-6">
      <h2 className="pb-2 text-sm font-medium tracking-wide text-[#191C1C] xl:text-base">
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * One labelled fact, where absence is rendered rather than hidden.
 *
 * `absentLabel` IS REQUIRED, deliberately. Every caller has to decide what a `null` means on its own
 * field — "Not stated", "Never audited", "Not enough data" — because those are three different
 * facts and a shared em-dash would flatten them into one shrug.
 */
function Fact({
  label,
  value,
  absentLabel,
}: {
  label: string;
  value: string | null;
  absentLabel: string;
}) {
  return (
    <div>
      <dt className="text-xs leading-4 text-[#6F7979]">{label}</dt>
      <dd
        className={
          value === null
            ? "text-sm leading-5 text-[#6F7979] italic"
            : "text-sm leading-5 text-[#191C1C]"
        }
      >
        {value ?? absentLabel}
      </dd>
    </div>
  );
}

function ProductionLineRow({ productionLine }: { productionLine: FactoryProductionLine }) {
  return (
    <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
      <p className="text-sm leading-5 font-medium text-[#191C1C]">{productionLine.name}</p>
      <p className="mt-0.5 text-xs leading-4 text-[#6F7979]">{productionLine.processSummary}</p>
      <p className="mt-1 text-[11px] leading-4 text-[#6F7979]">
        {/* Null capacity is "not measured", never zero — "0 pieces" would say this line produces
            nothing, which is a claim about a line that is plainly running. */}
        {productionLine.monthlyCapacityUnits === null
          ? `Monthly capacity not stated (${productionLine.unitLabel})`
          : `${formatCountLabel(productionLine.monthlyCapacityUnits)} ${productionLine.unitLabel} per month`}
      </p>
    </div>
  );
}

function CertificationRow({
  certificationRecord,
}: {
  certificationRecord: FactoryCertificationRecord;
}) {
  const { validFrom, validUntil } = certificationRecord;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[#CAC4D0]/60 px-4 py-2.5">
      <span className="text-sm leading-5 font-medium text-[#191C1C]">
        {/* THE LABEL, NOT `standardName`. The enum's short label is what the filter chip says, so
            the row a buyer landed on from a chip must read the same. `standardName` is what the
            paper says — longer, usually carrying a revision year — and it goes below. */}
        {FACTORY_CERTIFICATION_LABELS[certificationRecord.certification]}
      </span>

      {/* Only when it adds something. Repeating "ISO 9001" under "ISO 9001" is noise. */}
      {certificationRecord.standardName !==
        FACTORY_CERTIFICATION_LABELS[certificationRecord.certification] && (
        <span className="text-xs leading-4 text-[#6F7979]">{certificationRecord.standardName}</span>
      )}

      {certificationRecord.issuingBody !== null && (
        <span className="text-xs leading-4 text-[#6F7979]">
          issued by {certificationRecord.issuingBody}
        </span>
      )}

      {certificationRecord.certificateNumber !== null && (
        <span className="text-xs leading-4 text-[#6F7979]">
          no. {certificationRecord.certificateNumber}
        </span>
      )}

      <span className="text-xs leading-4 text-[#6F7979]">
        {validUntil === null
          ? // NOT "valid indefinitely". Nobody recorded an end date; that is all this says.
            validFrom === null
            ? "No validity dates recorded"
            : `From ${formatIsoDateLabel(validFrom)} · no expiry recorded`
          : `${validFrom === null ? "Until" : `${formatIsoDateLabel(validFrom)} –`} ${formatIsoDateLabel(validUntil)}`}
      </span>

      {/* Only a record WITH an end date can lapse. Rendering the pill for a null `validUntil` would
          ask a client component to decide something the data does not contain. */}
      {validUntil !== null && <CertificationValidityPill validUntil={validUntil} />}
    </div>
  );
}

/**
 * A certificate whose standard is outside the closed eight.
 *
 * SAME EXPIRY DISCIPLINE, DIFFERENT HEADLINE. There is no enum label to lead with, so
 * `standardName` is the name — it is the only name this certificate has on the wire. Everything
 * else reads identically to `CertificationRow`, deliberately: a buyer should not have to work out
 * that one of these lists is second class, because it is not. It is only unfilterable.
 */
function OtherCertificationRow({
  otherCertification,
}: {
  otherCertification: FactoryOtherCertification;
}) {
  const { validFrom, validUntil } = otherCertification;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[#CAC4D0]/60 px-4 py-2.5">
      <span className="text-sm leading-5 font-medium text-[#191C1C]">
        {otherCertification.standardName}
      </span>

      {otherCertification.issuingBody !== null && (
        <span className="text-xs leading-4 text-[#6F7979]">
          issued by {otherCertification.issuingBody}
        </span>
      )}

      {otherCertification.certificateNumber !== null && (
        <span className="text-xs leading-4 text-[#6F7979]">
          no. {otherCertification.certificateNumber}
        </span>
      )}

      <span className="text-xs leading-4 text-[#6F7979]">
        {validUntil === null
          ? // NOT "valid indefinitely" — nobody recorded an end date, that is all this says.
            validFrom === null
            ? "No validity dates recorded"
            : `From ${formatIsoDateLabel(validFrom)} · no expiry recorded`
          : `${validFrom === null ? "Until" : `${formatIsoDateLabel(validFrom)} –`} ${formatIsoDateLabel(validUntil)}`}
      </span>

      {validUntil !== null && <CertificationValidityPill validUntil={validUntil} />}
    </div>
  );
}

function SiteRow({ site }: { site: FactorySite }) {
  return (
    <div className="rounded-xl border border-[#CAC4D0]/60 px-4 py-3">
      <p className="text-sm leading-5 font-medium text-[#191C1C]">{site.label}</p>
      <p className="mt-0.5 text-xs leading-4 text-[#6F7979]">
        {site.locality === null
          ? countryLabelFromCode(site.countryCode)
          : `${site.locality}, ${countryLabelFromCode(site.countryCode)}`}
      </p>
      <p className="mt-1 text-[11px] leading-4 text-[#6F7979]">
        {site.floorAreaSquareMetres === null
          ? "Floor area not stated"
          : formatSquareMetresLabel(site.floorAreaSquareMetres)}
        {" · "}
        {site.productionStaffCount === null
          ? "staff count not stated"
          : `${formatCountLabel(site.productionStaffCount)} production staff`}
      </p>
    </div>
  );
}

function SamplePolicyBlock({ samplePolicy }: { samplePolicy: FactorySamplePolicy }) {
  if (!samplePolicy.offersSamples) {
    return (
      <p className="text-sm leading-5 text-[#6F7979]">
        This factory does not offer samples. Ask in an inquiry if you need one anyway — a policy is
        not a refusal.
      </p>
    );
  }

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Fact
        label="Sample lead time"
        value={
          samplePolicy.sampleLeadTimeDays === null
            ? null
            : `About ${samplePolicy.sampleLeadTimeDays} days`
        }
        absentLabel="Not stated"
      />
      {/* THE THREE-WAY BRANCH THIS SURFACE EXISTS TO GET RIGHT. `0` is free and `null` is unstated,
          and an unstated fee rendered as free is a charge the buyer meets at invoice time. */}
      <Fact
        label="Sample fee"
        value={
          samplePolicy.sampleFeeInCents === null
            ? null
            : samplePolicy.sampleFeeInCents === 0
              ? "Free"
              : formatCentsLabel(samplePolicy.sampleFeeInCents, samplePolicy.currency)
        }
        absentLabel="Not stated — ask before ordering one"
      />
    </dl>
  );
}
