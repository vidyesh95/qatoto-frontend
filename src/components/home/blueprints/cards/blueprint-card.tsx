// TRANSPORT: props-only — the blueprint arrives from whichever rail rendered it.
// This component fetches nothing.

import Link from "next/link";

import BlueprintCardBody from "@/components/home/blueprints/cards/blueprint-card-body";
import { type Blueprint, buildBlueprintHref } from "@/lib/blueprints/schemas";

/**
 * One blueprint in a horizontal rail.
 *
 * THE FIXED WIDTH AND THE SNAP POINT ARE THIS COMPONENT'S WHOLE JOB — everything else lives in
 * `BlueprintCardBody`, which the grid card also renders. See the note there.
 *
 * The href goes through `buildBlueprintHref` rather than a template literal, because a blueprint's
 * URL now depends on its category and the flat `/blueprints/<slug>` shape only survives as a
 * redirect. One function means a grep can prove nothing mints the old shape.
 */
export default function BlueprintCard({ blueprint }: { blueprint: Blueprint }) {
  return (
    <Link
      href={buildBlueprintHref(blueprint)}
      className="group/card block w-56 shrink-0 snap-start sm:w-64 lg:w-72"
    >
      <BlueprintCardBody blueprint={blueprint} imageSizes="288px" />
    </Link>
  );
}
