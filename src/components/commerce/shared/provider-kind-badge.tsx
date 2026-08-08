// TRANSPORT: props-only — renders one enum value, no network.
//
// The connector kind, as an icon PLUS its label.
//
// NEVER THE ICON ALONE, and that is the whole reason this is a component rather than an inline
// `<Image>`. Nine kinds cannot be told apart by glyph — a shield reads as "insurance" only to
// someone who already knows the list is nine long — and the consequence of a misread here is a
// buyer sending a customs brief to a testing laboratory.
//
// IT ALSO CARRIES NO VERIFICATION SIGNAL, deliberately. Verification is recorded PER KIND on
// `commerce_provider_kind_link.verificationState`, which the public reads filter on and never
// project. So there is no value this component could read to justify a tick, and adding one from
// the profile-level `verificationState` would assert an approval that may not exist for this kind.
// A verified freight forwarder is not thereby an approved customs broker.
//
// `src/components/commerce/` and semantic tokens, because studio provider surfaces render this too.

import Image from "next/image";

import { PROVIDER_KIND_ICONS, PROVIDER_KIND_LABELS } from "@/lib/store/labels";
import type { ProviderKind } from "@/lib/store/shared.schemas";

export default function ProviderKindBadge({
  providerKind,
  isCompact = false,
}: {
  providerKind: ProviderKind;
  /** Drops the pill background for use inside a denser row. The label always stays. */
  isCompact?: boolean;
}) {
  const iconSize = isCompact ? 14 : 16;

  return (
    <span
      className={
        isCompact
          ? "inline-flex items-center gap-1 text-[11px] leading-4 font-medium text-muted-foreground"
          : "inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"
      }
    >
      <Image
        src={`/icons/${PROVIDER_KIND_ICONS[providerKind]}`}
        alt=""
        width={iconSize}
        height={iconSize}
      />
      {PROVIDER_KIND_LABELS[providerKind]}
    </span>
  );
}
