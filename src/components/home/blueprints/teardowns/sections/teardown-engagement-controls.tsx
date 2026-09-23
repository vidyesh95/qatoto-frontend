"use client";

// TRANSPORT: client-query — the like and save controls on a teardown, over
// `@/hooks/blueprints/engagement`.
//
// ⚠️ TWO OF THE FOUR SLOTS IN THE BAR, NOT ALL FOUR. Comment stays a readout that links to the
// thread — the number belongs to a section further down the page, and two copies of it could
// disagree. Share stays its own island. This island owns like and save, which are the two that now
// have routes.

import Image from "next/image";
import { useState } from "react";

import { describeEngagementError, useBlueprintToggleMutation } from "@/hooks/blueprints/engagement";
import { useBlueprintViewerStateQuery } from "@/hooks/blueprints/engagement";
import { useViewerSignedIn } from "@/hooks/use-viewer-signed-in";
import { formatCompactCountLabel } from "@/lib/feed/format";
import { formatCountLabel } from "@/lib/store/format";

/**
 * One pill: an icon, a count, and a pressed state.
 *
 * Keeps `BlueprintStatReadout`'s exact shape — the same pill, the same 24px icon, the same
 * compact/exact number pair — so a signed-out reader's readouts and a signed-in reader's controls
 * line up in the same grid without the row re-flowing when the session resolves.
 */
function TeardownTogglePill({
  iconBaseName,
  noun,
  count,
  isSet,
  isPending,
  onToggle,
}: {
  readonly iconBaseName: string;
  readonly noun: string;
  readonly count: number;
  readonly isSet: boolean;
  readonly isPending: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSet}
      disabled={isPending}
      className={`flex w-full cursor-pointer flex-row items-center justify-center gap-2 rounded-full px-2.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-imprint disabled:cursor-default lg:w-24 ${
        isSet
          ? "bg-primary-imprint text-primary-imprint-foreground"
          : "bg-primary text-foreground hover:bg-primary/80"
      }`}
    >
      {/*
        ⚠️ `FILL1` WHEN SET, `FILL0` WHEN NOT — the same pair `VideoEngagementBar` uses, and the
        reason the filled variants are in `public/icons` at all. `BlueprintStatReadout` only ever
        draws FILL0 because nothing it renders can be set; a control has both states.
      */}
      <Image
        src={`/icons/${iconBaseName}_24dp_000000_FILL${isSet ? "1" : "0"}_wght400_GRAD0_opsz24.svg`}
        alt=""
        width={18}
        height={18}
        className={`size-4.5 shrink-0 ${isSet ? "invert" : ""}`}
      />
      <span className="tabular-nums">
        <span aria-hidden="true">{formatCompactCountLabel(count)}</span>
        <span className="sr-only">
          {formatCountLabel(count)} {noun}. {isSet ? `You ${noun.slice(0, -1)}d this.` : ""}
        </span>
      </span>
    </button>
  );
}

/**
 * The like and save controls for one teardown.
 *
 * ⚠️ A SIGNED-OUT READER GETS NOTHING FROM THIS ISLAND — the bar renders its readouts instead. A
 * disabled pill would say "you cannot do this"; a readout says "this is a number", which is the
 * true statement for somebody with no account.
 *
 * ⚠️ AND A WITHHELD TEARDOWN GETS NOTHING EITHER. The server gates like and save on `published`
 * alone: `flagged` means a report stands and `quarantined` means an unresolved rights claim, and
 * nothing new may be endorsed on a page the platform is actively withholding. `canEngage` is
 * threaded from the page, and the server refuses it either way — this is not the only thing
 * deciding.
 */
export default function TeardownEngagementControls({
  slug,
  likeCount,
  saveCount,
  isViewerSignedIn,
  canEngage,
}: {
  readonly slug: string;
  readonly likeCount: number;
  readonly saveCount: number;
  readonly isViewerSignedIn: boolean;
  readonly canEngage: boolean;
}) {
  const isSignedIn = useViewerSignedIn(isViewerSignedIn);
  const viewerState = useBlueprintViewerStateQuery({
    teardowns: [slug],
    isSignedIn: isSignedIn && canEngage,
  });

  const like = useBlueprintToggleMutation("teardown", "like");
  const save = useBlueprintToggleMutation("teardown", "save");

  const [likeState, setLikeState] = useState<{ isSet: boolean; count: number } | null>(null);
  const [saveState, setSaveState] = useState<{ isSet: boolean; count: number } | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  const likeIsSet = likeState?.isSet ?? viewerState.data?.teardowns[slug]?.hasLiked ?? false;
  const saveIsSet = saveState?.isSet ?? viewerState.data?.teardowns[slug]?.hasSaved ?? false;
  const likeDisplayCount = likeState?.count ?? likeCount;
  const saveDisplayCount = saveState?.count ?? saveCount;

  function toggle(
    verb: "like" | "save",
    currentIsSet: boolean,
    currentCount: number,
    setState: (next: { isSet: boolean; count: number } | null) => void,
  ): void {
    const nextIsSet = !currentIsSet;
    setRefusal(null);
    setState({
      isSet: nextIsSet,
      count: nextIsSet ? currentCount + 1 : Math.max(currentCount - 1, 0),
    });

    const mutation = verb === "like" ? like : save;
    mutation.mutate(
      { slug, isSet: nextIsSet },
      {
        // The server's own number, which is what every other reader sees.
        onSuccess: (result) => {
          setState({ isSet: result.isSet, count: result.count });
        },
        onError: (error) => {
          setState({ isSet: currentIsSet, count: currentCount });
          setRefusal(describeEngagementError(error).message);
        },
      },
    );
  }

  if (!isSignedIn || !canEngage) return null;

  return (
    <>
      <TeardownTogglePill
        iconBaseName="favorite"
        noun="likes"
        count={likeDisplayCount}
        isSet={likeIsSet}
        isPending={like.isPending}
        onToggle={() => {
          toggle("like", likeIsSet, likeDisplayCount, setLikeState);
        }}
      />
      <TeardownTogglePill
        iconBaseName="bookmark"
        noun="saves"
        count={saveDisplayCount}
        isSet={saveIsSet}
        isPending={save.isPending}
        onToggle={() => {
          toggle("save", saveIsSet, saveDisplayCount, setSaveState);
        }}
      />
      {refusal === null ? null : (
        <output className="col-span-4 block text-xs text-destructive lg:col-span-1">
          {refusal}
        </output>
      )}
    </>
  );
}
