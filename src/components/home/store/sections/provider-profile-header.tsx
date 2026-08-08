// TRANSPORT: props-only — renders the parsed provider card, fetches nothing.
//
// The provider detail header: identity, where it works, what it lists, and whether it is taking
// requests.
//
// `operatedKinds` is DERIVED FROM THE PROVIDER'S OFFERINGS by the page above, and the copy says so
// — "lists services under", not "verified for". Per-kind verification lives on
// `commerce_provider_kind_link.verificationState`, which no public read projects, so a stronger
// claim than this one has nothing behind it.

import Image from "next/image";

import ProviderKindBadge from "@/components/commerce/shared/provider-kind-badge";
import { countryLabelFromCode } from "@/lib/store/format";
import {
  PROVIDER_VERIFICATION_LABELS,
  type PublicProviderCard,
} from "@/lib/store/providers.schemas";
import type { ProviderKind } from "@/lib/store/shared.schemas";

export default function ProviderProfileHeader({
  provider,
  operatedKinds,
}: {
  provider: PublicProviderCard;
  operatedKinds: ProviderKind[];
}) {
  return (
    <header className="px-4 pt-4 lg:px-6">
      <div className="flex items-start gap-3">
        {provider.logoUrl === null ? (
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[#D6E3FF] text-base font-medium text-[#00696E]">
            {provider.displayName.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <Image
            src={provider.logoUrl}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-full object-cover"
          />
        )}

        <div className="min-w-0 flex-1">
          <h1 className="font-serif text-xl font-semibold text-[#191C1C] md:text-2xl">
            {provider.displayName}
          </h1>
          <p className="mt-0.5 text-xs leading-4 text-[#6F7979]">
            {countryLabelFromCode(provider.countryCode)}
            {provider.serviceRegionSummary !== null && ` · serves ${provider.serviceRegionSummary}`}
          </p>
          <p className="mt-1 text-xs leading-4 text-[#00696E]">
            {PROVIDER_VERIFICATION_LABELS[provider.verificationState]}
          </p>
        </div>
      </div>

      {operatedKinds.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] leading-4 font-medium tracking-[0.5px] text-[#6F7979] uppercase">
            Lists services under
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {operatedKinds.map((providerKind) => (
              <ProviderKindBadge key={providerKind} providerKind={providerKind} />
            ))}
          </div>
        </div>
      )}

      {/* Not accepting requests is a fact worth stating prominently: it changes whether the buyer
          should spend time reading the rest. Accepting them is the default and gets no banner. */}
      {!provider.acceptingRequests && (
        <p className="mt-3 rounded-lg bg-[#F2F4F4] px-3 py-2 text-xs leading-4 text-[#6F7979]">
          This provider is not taking new requests at the moment. Its offerings stay listed so you
          can compare them.
        </p>
      )}
    </header>
  );
}
