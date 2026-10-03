// TRANSPORT: props-only — renders the deliverables the engagement detail read already carried.
//
// What the provider has delivered against this engagement. For three kinds the backend also returns
// a typed result, and this renders it: an insurer's policy, a laboratory's test result, a warehouse's
// stock movement. Every other kind shows the deliverable's title and state only — no field is
// invented for a result shape this surface has not transcribed (`parseDeliverableResult`).
//
// ⚠️ A LABORATORY RESULT IS THE LABORATORY'S. "Passed" here is what the laboratory reported through
// its deliverable, and the row says so. Qatoto did not test anything and does not endorse the result.
//
// ⚠️ A POLICY HERE IS THE INSURER'S STATEMENT. It does not mean the goods are covered for any given
// loss — the policy wording does, and Qatoto has not read it.

import { API_BASE_URL } from "@/lib/api";
import {
  DELIVERABLE_STATE_LABELS,
  parseDeliverableResult,
  WAREHOUSE_MOVEMENT_KIND_LABELS,
  type EngagementDeliverable,
  type InsuranceDeliverableResult,
  type ServiceEngagementDetail,
  type TestingDeliverableResult,
  type WarehouseDeliverableResult,
} from "@/lib/store/fulfillment.schemas";
import { formatCentsLabel, formatIsoInstantLabel } from "@/lib/store/format";

/** Renders nothing for an engagement with no deliverables — the absence is not a finding. */
export default function EngagementDeliverablesSection({
  engagement,
}: {
  engagement: ServiceEngagementDetail;
}) {
  if (engagement.deliverables.length === 0) return null;

  const sortedDeliverables = engagement.deliverables.toSorted(
    (first, second) => first.sequence - second.sequence,
  );

  return (
    <section aria-label="Deliverables" className="rounded-xl border border-border px-4 py-3">
      <p className="text-sm font-medium text-foreground">Deliverables</p>
      <ul className="mt-1 divide-y divide-border">
        {sortedDeliverables.map((deliverable) => (
          <li key={deliverable.id} className="space-y-1 py-3">
            <DeliverableRow deliverable={deliverable} engagement={engagement} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function DeliverableRow({
  deliverable,
  engagement,
}: {
  deliverable: EngagementDeliverable;
  engagement: ServiceEngagementDetail;
}) {
  const parsedResult = parseDeliverableResult(engagement.providerKind, deliverable.result);

  return (
    <>
      <p className="text-sm leading-5 font-medium text-foreground">
        {deliverable.title}
        {!deliverable.isRequired && (
          <span className="font-normal text-muted-foreground"> · optional</span>
        )}
      </p>
      <p className="text-xs leading-4 text-muted-foreground">
        {DELIVERABLE_STATE_LABELS[deliverable.state]}
        {deliverable.submittedAt !== null &&
          ` · submitted ${formatIsoInstantLabel(deliverable.submittedAt)}`}
      </p>
      {(() => {
        switch (parsedResult.kind) {
          case "insurance":
            return <InsuranceResult result={parsedResult.value} />;
          case "testing":
            return <TestingResult result={parsedResult.value} />;
          case "warehouse":
            return <WarehouseResult result={parsedResult.value} />;
          case "none":
            return null;
          default: {
            const exhaustiveCheck: never = parsedResult;
            return exhaustiveCheck;
          }
        }
      })()}
      {deliverable.reviewNote !== null && (
        <p className="text-xs leading-4 text-muted-foreground">
          Buyer&apos;s note: {deliverable.reviewNote}
        </p>
      )}
      {deliverable.evidenceDocumentId !== null && (
        <a
          href={`${API_BASE_URL}/commerce/documents/${encodeURIComponent(deliverable.evidenceDocumentId)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs leading-4 font-medium text-primary-imprint underline underline-offset-2 hover:text-foreground"
        >
          Open the attached document
        </a>
      )}
    </>
  );
}

function ResultPairs({ pairs }: { pairs: readonly (readonly [string, string | null])[] }) {
  const presentPairs = pairs.filter((pair): pair is readonly [string, string] => pair[1] !== null);
  if (presentPairs.length === 0) return null;
  return (
    <dl className="grid gap-x-4 gap-y-0.5 text-xs leading-4 text-muted-foreground sm:grid-cols-[auto_1fr]">
      {presentPairs.map(([term, description]) => (
        <div key={term} className="contents">
          <dt>{term}</dt>
          <dd className="text-foreground">{description}</dd>
        </div>
      ))}
    </dl>
  );
}

function InsuranceResult({ result }: { result: InsuranceDeliverableResult }) {
  return (
    <>
      <ResultPairs
        pairs={[
          ["Policy", result.policyReference],
          ["Cover class", result.coverageClass],
          [
            "Value stated on the policy",
            formatMinorUnitsLabel(result.insuredValueMinorUnits, result.currency),
          ],
          ["Cover limit", formatMinorUnitsLabel(result.coverageLimitMinorUnits, result.currency)],
          [
            "From",
            result.effectiveFrom === null ? null : formatIsoInstantLabel(result.effectiveFrom),
          ],
          ["To", result.effectiveTo === null ? null : formatIsoInstantLabel(result.effectiveTo)],
        ]}
      />
      <p className="text-xs leading-4 text-muted-foreground">
        As stated by the insurer. What a policy covers is set by its wording, which Qatoto has not
        read.
      </p>
    </>
  );
}

const TESTING_RESULT_LABELS: Record<TestingDeliverableResult["result"], string> = {
  passed: "Passed",
  failed: "Failed",
  inconclusive: "Inconclusive",
};

function TestingResult({ result }: { result: TestingDeliverableResult }) {
  return (
    <>
      <ResultPairs
        pairs={[
          ["Standard", result.standard],
          ["Reported by the laboratory", TESTING_RESULT_LABELS[result.result]],
          ["Specimen", result.specimenReference],
          ["Laboratory location", result.laboratoryLocation],
          [
            "Reported",
            result.reportedAt === null ? null : formatIsoInstantLabel(result.reportedAt),
          ],
        ]}
      />
      <p className="text-xs leading-4 text-muted-foreground">
        The laboratory&apos;s own result. Qatoto did not test the product and does not endorse it.
      </p>
    </>
  );
}

function WarehouseResult({ result }: { result: WarehouseDeliverableResult }) {
  return (
    <ResultPairs
      pairs={[
        ["Movement", WAREHOUSE_MOVEMENT_KIND_LABELS[result.movementKind]],
        [
          "Quantity",
          `${formatFixedPointQuantity(result.quantityUnits, result.quantityScale)} ${result.unitLabel}`,
        ],
        ["Facility", result.facilityIdentifier],
        ["When", result.occurredAt === null ? null : formatIsoInstantLabel(result.occurredAt)],
      ]}
    />
  );
}

/**
 * Minor units arrive as a string (bigint on the wire). Formatted as money only when the integer is
 * safe AND a currency was stated; otherwise null, which renders no row rather than a wrong figure.
 */
function formatMinorUnitsLabel(minorUnits: string | null, currency: string | null): string | null {
  if (minorUnits === null || currency === null) return null;
  const amountInMinorUnits = Number(minorUnits);
  if (!Number.isSafeInteger(amountInMinorUnits)) return null;
  return formatCentsLabel(amountInMinorUnits, currency);
}

/**
 * `units / 10^scale`, done on the digits rather than in floating point — "12345" at scale 2 is
 * "123.45", never 123.44999.
 */
function formatFixedPointQuantity(units: string, scale: number): string {
  const isNegative = units.startsWith("-");
  const digits = (isNegative ? units.slice(1) : units).padStart(scale + 1, "0");
  const wholePart = scale === 0 ? digits : digits.slice(0, digits.length - scale);
  const fractionalPart = scale === 0 ? "" : digits.slice(digits.length - scale).replace(/0+$/, "");
  const formattedWhole = Number(wholePart).toLocaleString("en-US");
  return `${isNegative ? "-" : ""}${formattedWhole}${fractionalPart === "" ? "" : `.${fractionalPart}`}`;
}
