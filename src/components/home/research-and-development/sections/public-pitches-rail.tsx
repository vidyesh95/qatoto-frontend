// TRANSPORT: server-fetch — `GET /pitches`, which is PUBLIC and unauthenticated.
import Image from "next/image";
import Link from "next/link";

import { describeLinkDestination } from "@/components/pitches/pitch-shared";
import RndStatusPanel, {
  RndErrorPanel,
} from "@/components/home/research-and-development/sections/rnd-status-panel";
import { listPublicPitches } from "@/lib/rnd/pitches.api";
import { toListViewState } from "@/lib/view-state";

const PITCHES_RAIL_LIMIT = 6;

/**
 * Published pitches, on the deal-flow page.
 *
 * WHY IT SITS BESIDE DEAL FLOW RATHER THAN ON ITS OWN ROUTE: the two answer the same
 * question — "who is raising" — from opposite ends, and R&D deliberately stays at five
 * sidebar items. A sixth nav entry for one rail would cost more than it explains.
 *
 * THE TWO HALVES ARE NOT THE SAME KIND OF THING, and the copy has to keep them apart:
 *
 *   - A FUNDING ROUND is on-platform. It has a goal, a pledge control and backers, and
 *     `GET /funding/deals` is `requireAuth` — a signed-out visitor sees a sign-in prompt.
 *   - A PITCH is a listing. It has no amount, no pledge button and no goal, because the
 *     ask lives on the licensed third-party page its link points at. `GET /pitches` is
 *     public, so this rail renders for signed-out visitors while the grid above it does
 *     not — which is correct rather than an inconsistency: there is nothing here to gate.
 *
 * Nothing in this rail may imply Qatoto holds funds, takes a fee, or vouches for a pitch.
 */
export default async function PublicPitchesRail() {
  // `toListViewState`, not `toArrayViewState`: `GET /pitches` is offset-paginated and
  // answers `{ rows, pagination }`. The pagination is unused here — the rail shows one page
  // and links onward — but taking the right mapper is what keeps the rows typed.
  const pitchesState = toListViewState(await listPublicPitches({ limit: PITCHES_RAIL_LIMIT }));

  return (
    <section className="space-y-3 px-4 lg:px-6">
      <header className="space-y-1">
        <h2 className="font-serif text-xl font-semibold">Pitches</h2>
        <p className="text-sm text-muted-foreground">
          Founders raising <strong>off Qatoto</strong>. Each pitch links out to wherever that
          founder actually takes funding — Qatoto lists them, holds no funds, and does not vet or
          endorse them.
        </p>
      </header>

      {renderRail()}
    </section>
  );

  function renderRail() {
    switch (pitchesState.status) {
      case "error":
        // No sign-in branch: this read needs no session, so a failure here is a failure.
        return <RndErrorPanel message="Couldn't load pitches." />;
      case "empty":
        return <RndStatusPanel message="No pitches are listed yet." />;
      case "ready":
        return (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pitchesState.rows.map((pitch) => (
              <li key={pitch.id}>
                <Link
                  href={`/research-and-development/pitches/${pitch.slug}`}
                  className="block h-full rounded-2xl border border-border p-4 hover:bg-secondary/40"
                >
                  {pitch.pitchVideo !== null && pitch.pitchVideo.thumbnailUrl !== null && (
                    <Image
                      src={pitch.pitchVideo.thumbnailUrl}
                      alt=""
                      width={320}
                      height={180}
                      className="mb-2 aspect-video w-full rounded-lg object-cover"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">{pitch.projectName}</p>
                  <h3 className="mt-0.5 text-sm font-medium text-foreground">{pitch.title}</h3>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{pitch.summary}</p>
                  {/* The destination host, on the card. Someone scanning a list of pitches is
                      entitled to see where each one would send them before they open it. */}
                  {pitch.externalFundingUrl !== null && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Funds via {describeLinkDestination(pitch.externalFundingUrl)}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        );
      default: {
        const exhaustiveCheck: never = pitchesState;
        return exhaustiveCheck;
      }
    }
  }
}
