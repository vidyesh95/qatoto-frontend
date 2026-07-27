"use client";

import { useState } from "react";

import SupplierCard from "@/components/home/research-and-development/cards/supplier-card";
import type {
  SupplierCapability,
  SupplierProfile,
  SupplierVerificationState,
} from "@/types/research-and-development";

const VERIFICATION_FILTER_LABELS: Record<SupplierVerificationState | "all", string> = {
  all: "Any status",
  verified: "Verified",
  unverified: "Unverified",
  suspended: "Suspended",
};

const VERIFICATION_FILTER_ORDER: (SupplierVerificationState | "all")[] = [
  "all",
  "verified",
  "unverified",
  "suspended",
];

const FILTER_CHIP_CLASS =
  "shrink-0 cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors";

function chipClassName(isSelected: boolean): string {
  return `${FILTER_CHIP_CLASS} ${
    isSelected ? "bg-[#00696E] text-white" : "bg-muted text-foreground hover:bg-muted/70"
  }`;
}

type SupplierDirectoryProps = {
  suppliers: SupplierProfile[];
  capabilities: SupplierCapability[];
};

// Client island: the public supplier / ODM directory with capability, region
// and verification filters.
//
// Capabilities are multi-select and combine as AND, matching the API's
// repeated `?capability=` parameter: asking for injection molding *and* tooling
// means a partner who does both, not either. Matching is on the capability SLUG
// — a display-label substring match is the bug that makes "casting" match
// "broadcasting".
//
// The directory is read-only here and moderator-written on the backend: a
// self-serve public listing would need a moderation queue, a rate limiter and
// an abuse story before it earned its place.
export default function SupplierDirectory({ suppliers, capabilities }: SupplierDirectoryProps) {
  const [selectedCapabilitySlugs, setSelectedCapabilitySlugs] = useState<string[]>([]);
  // "all" is the no-filter sentinel; any other value is a region slug.
  const [selectedRegionSlug, setSelectedRegionSlug] = useState("all");
  const [selectedVerificationState, setSelectedVerificationState] = useState<
    SupplierVerificationState | "all"
  >("all");

  const availableRegions = [
    ...new Map(
      suppliers.map((supplier) => [supplier.regionSlug, supplier.regionDisplayLabel]),
    ).entries(),
  ].toSorted(([, firstLabel], [, secondLabel]) => firstLabel.localeCompare(secondLabel));

  function toggleCapabilitySlug(capabilitySlug: string) {
    setSelectedCapabilitySlugs((currentSlugs) =>
      currentSlugs.includes(capabilitySlug)
        ? currentSlugs.filter((slug) => slug !== capabilitySlug)
        : [...currentSlugs, capabilitySlug],
    );
  }

  const filteredSuppliers = suppliers.filter((supplier) => {
    const supplierCapabilitySlugs = supplier.capabilities.map((capability) => capability.slug);
    const matchesEveryCapability = selectedCapabilitySlugs.every((selectedSlug) =>
      supplierCapabilitySlugs.includes(selectedSlug),
    );
    const matchesRegion =
      selectedRegionSlug === "all" || supplier.regionSlug === selectedRegionSlug;
    const matchesVerification =
      selectedVerificationState === "all" ||
      supplier.verificationState === selectedVerificationState;
    return matchesEveryCapability && matchesRegion && matchesVerification;
  });

  return (
    <section id="supplier-directory" className="scroll-mt-20 space-y-4 px-4 lg:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium tracking-wide xl:text-lg">
          Manufacturing &amp; ODM partners
        </h2>
        <p className="text-xs text-muted-foreground">
          {filteredSuppliers.length} of {suppliers.length} partners
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedCapabilitySlugs([])}
            className={chipClassName(selectedCapabilitySlugs.length === 0)}
          >
            Any capability
          </button>
          {capabilities.map((capability) => (
            <button
              key={capability.slug}
              type="button"
              onClick={() => toggleCapabilitySlug(capability.slug)}
              className={chipClassName(selectedCapabilitySlugs.includes(capability.slug))}
            >
              {capability.displayLabel}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedRegionSlug("all")}
            className={chipClassName(selectedRegionSlug === "all")}
          >
            Every region
          </button>
          {availableRegions.map(([regionSlug, regionDisplayLabel]) => (
            <button
              key={regionSlug}
              type="button"
              onClick={() => setSelectedRegionSlug(regionSlug)}
              className={chipClassName(selectedRegionSlug === regionSlug)}
            >
              {regionDisplayLabel}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {VERIFICATION_FILTER_ORDER.map((verificationFilter) => (
            <button
              key={verificationFilter}
              type="button"
              onClick={() => setSelectedVerificationState(verificationFilter)}
              className={chipClassName(selectedVerificationState === verificationFilter)}
            >
              {VERIFICATION_FILTER_LABELS[verificationFilter]}
            </button>
          ))}
        </div>
        {selectedCapabilitySlugs.length > 1 && (
          <p className="text-[11px] text-muted-foreground">
            Showing partners with all {selectedCapabilitySlugs.length} selected capabilities.
          </p>
        )}
      </div>

      {filteredSuppliers.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSuppliers.map((supplier) => (
            <SupplierCard key={supplier.slug} supplier={supplier} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No partner matches every selected capability — drop one and try again.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        A verification status is assigned by Qatoto, never claimed by the partner. Directory
        listings carry no prices: a quote belongs to an engagement, in the project&apos;s own
        currency.
      </p>
    </section>
  );
}
