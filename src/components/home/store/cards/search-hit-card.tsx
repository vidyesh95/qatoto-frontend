// TRANSPORT: props-only

import Link from "next/link";
import type { StoreSearchHit } from "@/lib/store/catalog.schemas";
import { providerKindLabelFromUnknown, storeSearchDocumentKindLabel } from "@/lib/store/labels";
import { storeSearchHitHref } from "@/lib/store/links";
import { formatStorePriceInCents } from "@/lib/store/shared.schemas";

/**
 * One search result.
 *
 * A search hit is a flat search document, NOT a product card — it carries no image, no
 * metrics and no seller projection, so this tile is deliberately text-only rather than a
 * product tile with holes in it.
 *
 * `priceInCents` and `currency` are independently nullable on the wire, so a price renders
 * only when BOTH are present: an amount without its currency is not a price.
 *
 * `provider_offering` hits have no destination yet — `/store/services/[offeringSlug]` is
 * backend-ready with no page — so those render unlinked instead of pointing at a 404.
 */
export default function SearchHitCard({ hit }: { hit: StoreSearchHit }) {
  const href = storeSearchHitHref(hit);
  const priceLabel =
    hit.priceInCents !== null && hit.currency !== null
      ? formatStorePriceInCents(hit.priceInCents, hit.currency)
      : null;
  const kindLabel =
    hit.providerKind !== null
      ? providerKindLabelFromUnknown(hit.providerKind)
      : storeSearchDocumentKindLabel(hit.documentKind);

  const body = (
    <>
      <p className="text-[11px] font-medium tracking-wide text-[#00696E]">{kindLabel}</p>
      <p className="line-clamp-2 text-sm font-semibold">{hit.title}</p>
      <p className="truncate text-xs text-foreground/60">
        {hit.organizationDisplayName} · {hit.organizationCountryCode}
      </p>
      {hit.summary ? (
        <p className="line-clamp-2 text-xs text-foreground/70">{hit.summary}</p>
      ) : null}
      <div className="mt-auto pt-1">
        {priceLabel ? <p className="text-sm font-medium">{priceLabel}</p> : null}
        {hit.minimumOrderQuantity !== null ? (
          <p className="text-[11px] text-foreground/55">MOQ {hit.minimumOrderQuantity}</p>
        ) : null}
      </div>
    </>
  );

  const frameClass = "flex h-full flex-col gap-1 rounded-xl border border-[#E0E3E3] p-3 transition";

  if (href === null) {
    return <div className={frameClass}>{body}</div>;
  }

  return (
    <Link href={href} className={`${frameClass} hover:border-[#2A76FD]`}>
      {body}
    </Link>
  );
}
