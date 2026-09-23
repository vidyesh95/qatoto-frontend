// TRANSPORT: props-only — receives the parsed storefront, fetches nothing.
//
// What the SELLER says about itself. Sits below the measured block and looks deliberately
// unlike it — same reason the backend keeps `declaredProfile` and `measuredMetrics` as
// two objects. "Founded 2008" is a company's own assertion; presenting it in the same
// panel as a measured on-time rate would lend it the platform's credibility for free.
//
// Registered capital and the registration number are marked separately again, because
// they are a third thing: fields with no backend column at all, present only while this
// page runs on mock data.

import type {
  FrontendOnlySellerProfile,
  SellerDeclaredProfile,
} from "@/lib/store/organizations.schemas";
import {
  BUSINESS_TYPE_LABELS,
  formatCentsLabel,
  formatSquareMetresLabel,
} from "@/lib/store/organizations.schemas";
import StorefrontSection, {
  UnbackedFieldNote,
} from "@/components/home/store/sections/organization/storefront-section";

type DeclaredFact = { label: string; value: string };

function buildBackedFacts(profile: SellerDeclaredProfile): DeclaredFact[] {
  const facts: DeclaredFact[] = [];

  if (profile.yearFounded !== null) {
    facts.push({ label: "Year founded", value: String(profile.yearFounded) });
  }
  if (profile.businessType !== null) {
    facts.push({ label: "Business type", value: BUSINESS_TYPE_LABELS[profile.businessType] });
  }
  if (profile.factoryCount !== null) {
    facts.push({ label: "Factories", value: String(profile.factoryCount) });
  }
  if (profile.productionLineCount !== null) {
    facts.push({ label: "Production lines", value: String(profile.productionLineCount) });
  }
  if (profile.totalStaffCount !== null) {
    facts.push({
      label: "Total staff",
      value: profile.totalStaffCount.toLocaleString("en-US"),
    });
  }
  if (profile.factoryAreaSquareMetres !== null) {
    facts.push({
      label: "Combined factory area",
      value: formatSquareMetresLabel(profile.factoryAreaSquareMetres),
    });
  }
  if (profile.declaredResponseTimeHours !== null) {
    facts.push({
      // Named to say it is the seller's own claim. The measured figure lives in the
      // track-record block above and is a different number.
      label: "Reply time, self-reported",
      value: `≤ ${profile.declaredResponseTimeHours} h`,
    });
  }
  facts.push({
    label: "Custom orders",
    value: profile.acceptingCustomOrders ? "Accepted" : "Not accepted",
  });

  return facts;
}

export default function StorefrontDeclaredProfile({
  profile,
  frontendOnlyProfile,
}: {
  profile: SellerDeclaredProfile;
  frontendOnlyProfile: FrontendOnlySellerProfile | null;
}) {
  const backedFacts = buildBackedFacts(profile);

  return (
    <StorefrontSection
      title="Company profile"
      attribution="declared"
      description="Supplied by the seller and not independently verified by Qatoto."
    >
      {profile.publicSummary && (
        <p className="mb-3 text-sm leading-5 tracking-normal text-foreground">
          {profile.publicSummary}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-4">
        {backedFacts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-0.5">
            <dt className="text-xs leading-4 text-outline-strong">{fact.label}</dt>
            <dd className="text-sm leading-5 font-medium text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {frontendOnlyProfile && (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 lg:grid-cols-4">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs leading-4 text-outline-strong">Registered capital</dt>
              <dd className="text-sm leading-5 font-medium text-foreground">
                {formatCentsLabel(
                  frontendOnlyProfile.registeredCapitalInCents,
                  frontendOnlyProfile.registeredCapitalCurrency,
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs leading-4 text-outline-strong">Registration number</dt>
              <dd className="text-sm leading-5 font-medium text-foreground">
                {frontendOnlyProfile.businessRegistrationNumber}
              </dd>
            </div>
          </dl>

          <UnbackedFieldNote>
            Registered capital and registration number are placeholder values. The seller profile
            API has no column for either yet, so they disappear once this page reads live data.
          </UnbackedFieldNote>
        </>
      )}
    </StorefrontSection>
  );
}
