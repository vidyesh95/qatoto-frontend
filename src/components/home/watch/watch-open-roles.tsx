// TRANSPORT: client-query — renders the watch payload's recruiting blurbs and mounts the
// existing R&D apply sheet, which writes POST /research-projects/:slug/applications.
"use client";

import ApplyRoleSheet from "@/components/home/research-and-development/sheets/apply-role-sheet";
import type { WatchPayload } from "@/lib/feed/schemas";
import { ROLE_COMMITMENT_LABELS } from "@/lib/rnd/labels";

/**
 * "This venture is hiring" — under the player.
 *
 * THIS IS WHAT TURNS THE WATCH PAGE FROM A POSTER INTO A RECRUITING SURFACE. The blurbs have
 * existed as free text for a long time; what they never had was anything to apply TO. Now a
 * blurb may name a real `projectOpenRole`, and when it does the whole R&D apply flow mounts
 * here unchanged — `ApplyRoleSheet` takes a whole `OpenRole` because it needs `projectSlug` to
 * post to and `skills` to render the chips the server validates a subset against.
 *
 * A BLURB WITHOUT A LINKED ROLE STILL RENDERS, as the label it has always been. Anime and
 * unaffiliated videos are unaffected, and so is every row written before the link existed.
 *
 * A CLOSED OR FULL ROLE SHOWS ITS REAL STATE rather than disappearing. Hiding it would leave
 * the creator's text on screen with nothing behind it; saying "closed" is the honest answer,
 * and it is the server's `status` and slot counts saying it, not this component guessing.
 *
 * NO IDEMPOTENCY KEY IS MINTED HERE, deliberately. `POST …/applications` takes none — retry
 * safety comes from two partial unique indexes plus a self-heal inside the create transaction
 * that expires the caller's own stale pending row. Adding a key would invent a contract the
 * endpoint does not have.
 */
export default function WatchOpenRoles({
  openRoles,
}: {
  readonly openRoles: WatchPayload["openRoles"];
}) {
  if (openRoles.length === 0) return null;

  return (
    <section className="space-y-2 rounded-xl border border-[#CAC4D0] p-3">
      <h2 className="text-sm font-medium text-[#191C1C]">Roles this venture is hiring for</h2>

      <ul className="space-y-2">
        {openRoles.map((openRole, index) => {
          const linkedRole = openRole.linkedRole;
          const hasOpenSeat =
            linkedRole !== null &&
            linkedRole.status === "open" &&
            linkedRole.slotsFilledCount < linkedRole.slotsTotal;

          return (
            <li
              // The blurbs carry no stable id on the wire and their rows are regenerated on
              // every save, so position is the only honest key here.
              key={`${openRole.roleTitle}-${String(index)}`}
              className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CAC4D0]/50 pb-2 last:border-b-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-[#191C1C]">{openRole.roleTitle}</p>
                {openRole.roleDescription !== null && (
                  <p className="line-clamp-2 text-xs text-[#3F4948]">{openRole.roleDescription}</p>
                )}
                {linkedRole !== null && (
                  <p className="text-xs text-[#6F7979]">
                    {ROLE_COMMITMENT_LABELS[linkedRole.commitment]} ·{" "}
                    {linkedRole.slotsTotal - linkedRole.slotsFilledCount} of {linkedRole.slotsTotal}{" "}
                    open
                  </p>
                )}
              </div>

              {/*
                Three states, and only the first is a control. An unlinked blurb has nothing to
                apply to; a linked-but-closed one says so rather than dead-ending a click.
              */}
              {linkedRole === null ? null : hasOpenSeat ? (
                <ApplyRoleSheet role={linkedRole} />
              ) : (
                <span className="text-xs text-[#6F7979]">Closed</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
