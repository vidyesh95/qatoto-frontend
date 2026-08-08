// TRANSPORT: props-only

import Image from "next/image";
import type { PublicProviderCard } from "@/lib/store/catalog.schemas";
import { providerVerificationStateLabel } from "@/lib/store/labels";

/**
 * A connector-provider tile.
 *
 * NOT a link. `/store/providers/[organizationSlug]` is a shipped backend route with no
 * frontend page yet, so linking here would 404 (STORE_STRUCTURE §3.1). It becomes a link
 * when that page lands.
 *
 * The badge says "Profile verified", never a bare check mark: `verificationState` is the
 * ORGANIZATION's profile state, and per-connector-kind approval lives on a table the public
 * projection does not expose (§5.6 item 4). Claiming kind-specific approval here would be
 * asserting something the backend has not said.
 */
export default function ProviderCard({ provider }: { provider: PublicProviderCard }) {
  return (
    <div className="flex w-40 shrink-0 flex-col items-center gap-2 rounded-xl px-2 py-3 text-center sm:w-44">
      <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#E8F2F2]">
        {provider.logoUrl ? (
          <Image
            src={provider.logoUrl}
            width={48}
            height={48}
            alt=""
            className="size-12 object-cover"
          />
        ) : (
          <span aria-hidden className="text-sm font-semibold text-[#00696E]">
            {provider.displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </span>
      <p className="line-clamp-2 text-xs font-medium tracking-wide">{provider.displayName}</p>
      <p className="text-[11px] text-foreground/55">
        {providerVerificationStateLabel(provider.verificationState)}
      </p>
      {!provider.acceptingRequests ? (
        <p className="text-[11px] text-foreground/55">Not accepting requests</p>
      ) : null}
    </div>
  );
}
