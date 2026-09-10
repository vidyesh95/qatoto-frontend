// TRANSPORT: props-only — the state arrives on the teardown.

import type { BlueprintModerationState } from "@/lib/blueprints/schemas";

/**
 * What a reader is told when a teardown is under an IP report.
 *
 * ⚠️ THIS IS THE SECOND SANCTIONED DEPARTURE FROM "ABSENCE RENDERS NOTHING" ON THIS SURFACE, and it
 * is the same argument the case-study index makes for its empty `sources[]`: silence here would be
 * read as a statement. A quarantined teardown with its files simply missing looks like a publisher
 * who uploaded nothing, which is both wrong and unfair to them. A flagged one that says nothing
 * lets a reader take files that may be withdrawn tomorrow without knowing there is a question over
 * them. Neither absence is neutral, so both render copy.
 *
 * ⚠️ THE TWO STATES ARE NOT THE SAME NOTICE AND MUST NOT BE COLLAPSED.
 * - `flagged` — somebody reported a concern and NOBODY HAS RULED ON IT. Everything still renders.
 *   Hiding a row on the strength of an unexamined report would make the report control a takedown
 *   control, which is the failure every notice-and-takedown system is judged on.
 * - `quarantined` — substantiated, or raised by a verified rights holder. Files, model and
 *   composition are WITHHELD. The page still resolves, because a reader who followed an existing
 *   link is owed the reason rather than a 404 that reads as a broken bookmark.
 *
 * ⚠️ NEITHER NOTICE NAMES THE CLAIMANT AND NEITHER TAKES A SIDE. Qatoto has ruled on nothing at the
 * `flagged` stage and, at the `quarantined` stage, has acted on a claim rather than adjudicated
 * one. Copy that said "this teardown infringes" would be Qatoto stating a verdict it has no
 * standing to state, about a publisher who is not present to answer it.
 *
 * `draft`, `pending_review` and `removed` never reach this component: `getBlueprint` returns `null`
 * for all three and the route answers 404. The exhaustive `switch` still handles them, because a
 * `never` default is what makes a seventh state a compile error here rather than a blank section.
 */
export default function TeardownModerationNotice({
  moderationState,
}: {
  readonly moderationState: BlueprintModerationState;
}) {
  switch (moderationState) {
    case "flagged":
      return (
        <aside className="mt-5 max-w-2xl rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <h2 className="text-sm font-medium text-destructive">An IP concern has been reported</h2>
          <p className="mt-2 text-sm leading-6 text-foreground">
            Somebody has raised an intellectual-property concern about this teardown. Nothing has
            been ruled on and nothing has been withdrawn, so what you see is what the publisher
            posted. Weigh that before you rely on it commercially.
          </p>
        </aside>
      );

    case "quarantined":
      return (
        <aside className="mt-5 max-w-2xl rounded-xl border border-destructive/40 bg-destructive/5 p-4">
          <h2 className="text-sm font-medium text-destructive">
            This teardown is quarantined pending review
          </h2>
          <p className="mt-2 text-sm leading-6 text-foreground">
            A rights holder has raised a claim against it. The files, the 3D model and the material
            composition are withheld while it is reviewed. The page stays up so that anyone holding
            a link knows why, and the publisher keeps their work.
          </p>
        </aside>
      );

    // NONE OF THESE RENDER A PUBLIC NOTICE. `published` has nothing to say; the other four never
    // reach a public page at all — `getBlueprint` returns `null` for them and the route 404s. They
    // are listed rather than defaulted so that a seventh state is a compile error here, which is
    // exactly how `rejected` was caught when it was added to the enum.
    case "published":
    case "draft":
    case "pending_review":
    case "rejected":
    case "removed":
      return null;

    default: {
      const exhaustiveCheck: never = moderationState;
      return exhaustiveCheck;
    }
  }
}

/**
 * Whether the payload — files, model, composition, bill of materials — may render at all.
 *
 * EXPORTED FROM HERE rather than derived at each call site, because it is the same decision in five
 * places and five copies of `state !== "quarantined"` is five places to forget one.
 */
export function canRenderTeardownPayload(moderationState: BlueprintModerationState): boolean {
  return moderationState !== "quarantined";
}
