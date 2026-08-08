// TRANSPORT: props-only — receives the parsed storefront, fetches nothing.
//
// Officers and shareholders. A name and a role title are what a company already prints
// on its own website, which is what makes these rows safe to publish.
//
// NOTE WHAT IS ABSENT: no email, no phone, no direct line to a named individual. The
// backend table has no column for one and this is not an oversight to fill in later —
// adding one would silently convert a public projection into a personal-data disclosure.
// Buyers reach the company through the chat rail, not through a person.

import Image from "next/image";

import type { OrganizationStakeholder } from "@/lib/store/organizations.schemas";
import StorefrontSection from "@/components/home/store/sections/organization/storefront-section";

function initialsFromName(fullName: string): string {
  return fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join("");
}

export default function StorefrontStakeholders({
  stakeholders,
}: {
  stakeholders: OrganizationStakeholder[];
}) {
  if (stakeholders.length === 0) return null;

  const orderedStakeholders = stakeholders.toSorted(
    (first, second) => first.position - second.position,
  );

  return (
    <StorefrontSection
      title="Directors and ownership"
      attribution="declared"
      description="Named by the seller. Qatoto publishes no contact details for individuals."
    >
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {orderedStakeholders.map((stakeholder) => (
          <li key={stakeholder.id} className="flex items-center gap-3">
            {stakeholder.photoUrl ? (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-[#F5F5F5]">
                <Image
                  src={stakeholder.photoUrl}
                  fill
                  sizes="40px"
                  alt=""
                  className="object-cover"
                />
              </div>
            ) : (
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#D6E3FF] text-xs font-medium text-[#00696E]">
                {initialsFromName(stakeholder.fullName)}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm leading-5 font-medium text-[#191C1C]">
                {stakeholder.fullName}
              </p>
              <p className="truncate text-xs leading-4 tracking-[0.4px] text-[#6F7979]">
                {stakeholder.roleTitle}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </StorefrontSection>
  );
}
