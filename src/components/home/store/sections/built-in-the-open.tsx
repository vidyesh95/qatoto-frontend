// TRANSPORT: props-only — renders the venture the product read already carried, no network.
import Image from "next/image";
import Link from "next/link";

import { formatEffortFromMinutes, formatIsoInstant } from "@/lib/rnd/format";
import { PROJECT_STAGE_LABELS } from "@/lib/rnd/labels";
import type { ProductVentureProvenance } from "@/lib/store/products.schemas";

// "Built in the open" on the product page. The R&D → Store link, finally pointed at the BUYER.
//
// `product.researchProjectId` has been a real FK since the go-to-market handoff shipped, and until
// now it reached no wire at all — the store knew which venture built a listing and could tell
// nobody. This block is that answer, and it is the store's one differentiator a general marketplace
// cannot copy, because they do not have the record.
//
// NO NETWORK, AND IT COULD NOT DO ONE IF IT WANTED TO. Every R&D read is addressed by slug and the
// store holds a UUID, so the join happens server-side and this component receives the finished
// shape. See `commerce-product-venture.service.ts` (backend Appendix A42).
//
// A NULL STAT IS AN ABSENCE, NEVER A ZERO. Both figures stay NULL until the R&D stats jobs have
// run. Rendering "0 hrs verified" would assert that a venture actively shipping a product has done
// no verified work — the same rule `launch-ready-projects-rail.tsx` states on the R&D side, and the
// reason `statsComputedAt` rides along: every number here is as-of, never live.
//
// DELIBERATELY NOT A SECOND HERO. This is a credit line with proof attached, sized to sit beside
// "Company details" — which answers the same question about the seller — not to compete with the
// product. Nothing here carries equity, payouts, escrow state or a milestone: see the backend
// service for why each one was left out.

const FALLBACK_COVER_IMAGE_SRC = "/dummy/rnd_project_cover_01.avif";

export default function BuiltInTheOpen({
  venture,
}: {
  readonly venture: ProductVentureProvenance;
}) {
  const effortLabel =
    venture.verifiedEffortMinutesTotal === null
      ? "Verified effort not computed yet"
      : `${formatEffortFromMinutes(venture.verifiedEffortMinutesTotal)} of verified effort`;

  // Null when the venture has no `project_stats` row yet — a missing cache, not a team of zero.
  const teamLabel =
    venture.teamMemberCount === null
      ? null
      : `${venture.teamMemberCount} ${venture.teamMemberCount === 1 ? "member" : "members"}`;

  const stageAndTeamLabel =
    teamLabel === null
      ? PROJECT_STAGE_LABELS[venture.stage]
      : `${PROJECT_STAGE_LABELS[venture.stage]} · ${teamLabel}`;

  return (
    <section className="px-4 py-3 lg:px-6">
      <h2 className="text-sm leading-5 tracking-wide text-[#191C1C]">Built in the open</h2>
      <p className="mt-0.5 text-xs text-[#3F4948]">
        This listing came out of a project built in public, with its record attached.
      </p>

      <Link
        href={`/research-and-development/project/${venture.projectSlug}`}
        className="group mt-2 flex gap-3 rounded-xl border border-[#CAC4D0] p-3 transition hover:bg-[#F4FBFA]"
      >
        <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg sm:w-36">
          <Image
            src={venture.projectCoverImageUrl ?? FALLBACK_COVER_IMAGE_SRC}
            fill
            sizes="(min-width: 640px) 144px, 112px"
            alt={venture.projectName}
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>

        <div className="min-w-0 flex-1 space-y-1">
          <p className="truncate text-sm font-semibold text-[#191C1C]">{venture.projectName}</p>
          <p className="line-clamp-2 text-xs text-[#3F4948]">{venture.projectTagline}</p>
          <p className="text-xs text-[#3F4948]">{stageAndTeamLabel}</p>
          <p className="text-xs text-[#3F4948]">{effortLabel}</p>
          {venture.statsComputedAt !== null && (
            <p className="text-xs text-[#6F7979]">
              As of {formatIsoInstant(venture.statsComputedAt)}
            </p>
          )}
          <p className="text-xs font-medium text-[#00696E]">See how it was built</p>
        </div>
      </Link>
    </section>
  );
}
