// TRANSPORT: client-query — reads and writes the caller's own channel profile.
"use client";

// THE ONE EDITOR, RENDERED BY TWO SURFACES: the account dropdown's panel and `/studio/customize`.
//
// IT TAKES NO `onBack` AND RENDERS NO HEADER, which is what lets both hosts own their own chrome —
// the panel wraps it in the sticky back-arrow header every other account panel has, and the studio
// page wraps it in a page title.
//
// WHY NOT LINK ONE SURFACE TO THE OTHER. `AccountMenu` takes only `onClose`: it has no `initialView`
// prop, no URL, and an outside-mousedown handler that would close it against the studio page behind
// it. `/settings` and `/your-account` were deleted as routes for the same reason — the dropdown owns
// its panels and there is no address to link. So the shared thing is a component, not a route.
//
// NARROW-FIRST, because the dropdown is `sm:w-95`. The studio page constrains the width itself
// rather than this file assuming a canvas it does not have.
//
// THE PREVIEW IS THE REAL RENDERER. `ChannelProfileDetails` is the same component the channel About
// panel uses, so the preview cannot drift from the page — the same argument `channel-page.tsx` makes
// about reusing the feed's own video projection rather than describing it a second time.

import { useState } from "react";

import ChannelProfileDetails from "@/components/home/channel/channel-profile-details";
import {
  useMyChannelProfileQuery,
  useUpdateMyChannelProfileMutation,
} from "@/hooks/account/channel-profile";
import {
  CHANNEL_BIO_MAXIMUM_LENGTH,
  CHANNEL_BIO_MINIMUM_LENGTH,
  CHANNEL_LINK_LABEL_MAXIMUM_LENGTH,
  MAXIMUM_CHANNEL_LINKS,
} from "@/lib/account/channel-profile.schemas";

/**
 * One row being edited.
 *
 * `localId` IS A CLIENT ID AND NEVER REACHES THE WIRE. It exists to be a stable React key: keying
 * on the array index makes removing a row re-key every row after it, so the inputs keep their old
 * values and the wrong one appears to clear. `chapters-editor.tsx` mints ids for the same reason.
 */
interface LinkRowDraft {
  localId: string;
  label: string;
  url: string;
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string };

/** One message per row, by position — `null` where the row is fine. */
function validateLinkRows(linkRows: readonly LinkRowDraft[]): readonly (string | null)[] {
  return linkRows.map((linkRow) => {
    const trimmedLabel = linkRow.label.trim();
    const trimmedUrl = linkRow.url.trim();
    if (trimmedLabel === "" && trimmedUrl === "") return null;
    if (trimmedLabel === "") return "Give this link a label.";
    if (trimmedUrl === "") return "Add the address this link points to.";
    // The database CHECK is the actual control; this is the message that explains it before the
    // round trip rather than after a 422.
    if (!trimmedUrl.startsWith("https://")) return "Links must start with https://";
    return null;
  });
}

export default function ChannelProfileEditor({ onSaved }: { readonly onSaved?: () => void }) {
  const channelProfileQuery = useMyChannelProfileQuery();
  const updateChannelProfileMutation = useUpdateMyChannelProfileMutation();

  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [linkRowsDraft, setLinkRowsDraft] = useState<LinkRowDraft[] | null>(null);
  const [isChannelListedDraft, setIsChannelListedDraft] = useState<boolean | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  // DERIVED FROM THE SERVER UNTIL THE FIRST EDIT, rather than seeded by an effect. `null` means
  // "untouched", so a refetch that arrives while somebody is typing cannot overwrite them.
  const savedProfile = channelProfileQuery.data;
  const bio = bioDraft ?? savedProfile?.bio ?? "";
  const linkRows: LinkRowDraft[] =
    linkRowsDraft ??
    (savedProfile?.links ?? []).map((link, linkIndex) => ({
      localId: `saved-${linkIndex}`,
      label: link.label,
      url: link.url,
    }));

  // SAME `null`-MEANS-UNTOUCHED RULE as the two above, and it matters more here: a refetch landing
  // between a click and a save must not silently put a consent flag back.
  const isChannelListed = isChannelListedDraft ?? savedProfile?.isChannelListed ?? false;

  const linkErrors = validateLinkRows(linkRows);
  const trimmedBio = bio.trim();
  const isBioTooShort = trimmedBio !== "" && trimmedBio.length < CHANNEL_BIO_MINIMUM_LENGTH;
  const hasLinkError = linkErrors.some((linkError) => linkError !== null);
  const isSaveBlocked = isBioTooShort || hasLinkError || updateChannelProfileMutation.isPending;

  function updateLinkRows(nextLinkRows: LinkRowDraft[]) {
    setLinkRowsDraft(nextLinkRows);
    setSaveState({ status: "idle" });
  }

  function handleAddLinkClick() {
    updateLinkRows([...linkRows, { localId: crypto.randomUUID(), label: "", url: "" }]);
  }

  function handleLinkFieldChange(localId: string, patch: Partial<LinkRowDraft>) {
    updateLinkRows(
      linkRows.map((linkRow) => (linkRow.localId === localId ? { ...linkRow, ...patch } : linkRow)),
    );
  }

  function handleRemoveLinkClick(localId: string) {
    updateLinkRows(linkRows.filter((linkRow) => linkRow.localId !== localId));
  }

  /** Swap with a neighbour. There is no drag library in this repo and this needs none. */
  function handleMoveLinkClick(linkIndex: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? linkIndex - 1 : linkIndex + 1;
    if (targetIndex < 0 || targetIndex >= linkRows.length) return;
    const reordered = [...linkRows];
    [reordered[linkIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[linkIndex]];
    updateLinkRows(reordered);
  }

  async function handleSaveClick() {
    setSaveState({ status: "saving" });
    try {
      await updateChannelProfileMutation.mutateAsync({
        isChannelListed,
        // AN EMPTY DESCRIPTION IS `null`, NOT `""`. The column's CHECK refuses text shorter than 20
        // characters, so an empty string would be a 422 where the person meant "remove it".
        bio: trimmedBio === "" ? null : trimmedBio,
        // Blank rows are dropped rather than refused — somebody who pressed Add and changed their
        // mind should not have to find the row again to save.
        links: linkRows
          .filter((linkRow) => linkRow.label.trim() !== "" || linkRow.url.trim() !== "")
          .map((linkRow) => ({ label: linkRow.label.trim(), url: linkRow.url.trim() })),
      });
      setSaveState({ status: "saved" });
      setBioDraft(null);
      setLinkRowsDraft(null);
      setIsChannelListedDraft(null);
      onSaved?.();
    } catch (saveError) {
      setSaveState({
        status: "error",
        message:
          saveError instanceof Error ? saveError.message : "Your profile could not be saved.",
      });
    }
  }

  if (channelProfileQuery.isPending) {
    return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;
  }

  if (channelProfileQuery.isError) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        Your profile could not be loaded. Please try again.
      </p>
    );
  }

  const isHiddenByModerator = savedProfile?.profileModerationState === "hidden_by_moderator";

  return (
    <div className="flex flex-col gap-5 p-4">
      {/*
        THE ONLY PLACE A PERSON LEARNS THIS. Upholding a report hides their text and notifies
        nobody, so without this banner the editor below would look exactly as it did before and
        somebody asked to fix a problem would not know there was one.

        IT NAMES WHAT WAS HIDDEN AND WHAT WAS NOT, because "your profile was hidden" would read as
        an account suspension, and the lever does not reach that far.
      */}
      {isHiddenByModerator && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs leading-4 text-destructive">
          A moderator has hidden your description and links, so visitors to your channel cannot see
          them. Your videos, your name and your account are unaffected. You can still edit the text
          below — editing it does not put it back, but it is what a review will look at.
        </p>
      )}
      <section>
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">Description</span>
          <span className="block text-[11px] leading-4 text-muted-foreground">
            Shown in the About panel on your channel. Anyone can read it.
          </span>
          <textarea
            value={bio}
            onChange={(changeEvent) => {
              setBioDraft(changeEvent.target.value);
              setSaveState({ status: "idle" });
            }}
            rows={6}
            maxLength={CHANNEL_BIO_MAXIMUM_LENGTH}
            className="mt-1 w-full rounded-xl border border-black/10 bg-card px-4 py-3 text-base text-secondary-foreground outline-none focus:border-primary"
          />
        </label>
        {isBioTooShort ? (
          <p className="mt-1 text-xs text-destructive">
            A description needs at least {CHANNEL_BIO_MINIMUM_LENGTH} characters, or leave it empty.
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-muted-foreground">
            {trimmedBio.length} of {CHANNEL_BIO_MAXIMUM_LENGTH}
          </p>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">Links</span>
          <span className="text-[11px] text-muted-foreground">
            {linkRows.length} of {MAXIMUM_CHANNEL_LINKS}
          </span>
        </div>

        {linkRows.length === 0 ? (
          <p className="mt-1 text-sm text-muted-foreground">
            No links yet — add one to point visitors somewhere.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {linkRows.map((linkRow, linkIndex) => (
              <li key={linkRow.localId} className="flex flex-col gap-1">
                <input
                  type="text"
                  value={linkRow.label}
                  onChange={(changeEvent) =>
                    handleLinkFieldChange(linkRow.localId, { label: changeEvent.target.value })
                  }
                  placeholder="Label"
                  maxLength={CHANNEL_LINK_LABEL_MAXIMUM_LENGTH}
                  className="h-10 rounded-lg border border-black/10 bg-card px-3 text-sm text-secondary-foreground outline-none focus:border-primary"
                />
                <input
                  type="url"
                  value={linkRow.url}
                  onChange={(changeEvent) =>
                    handleLinkFieldChange(linkRow.localId, { url: changeEvent.target.value })
                  }
                  placeholder="https://example.com"
                  className="h-10 rounded-lg border border-black/10 bg-card px-3 text-sm text-secondary-foreground outline-none focus:border-primary"
                />
                {linkErrors[linkIndex] !== null && linkErrors[linkIndex] !== undefined && (
                  <p className="text-xs text-destructive">{linkErrors[linkIndex]}</p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    aria-label="Move link up"
                    disabled={linkIndex === 0}
                    onClick={() => handleMoveLinkClick(linkIndex, "up")}
                    className="cursor-pointer text-xs font-medium text-foreground underline disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    aria-label="Move link down"
                    disabled={linkIndex === linkRows.length - 1}
                    onClick={() => handleMoveLinkClick(linkIndex, "down")}
                    className="cursor-pointer text-xs font-medium text-foreground underline disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveLinkClick(linkRow.localId)}
                    className="cursor-pointer text-xs font-medium text-destructive underline"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {linkRows.length < MAXIMUM_CHANNEL_LINKS && (
          <button
            type="button"
            onClick={handleAddLinkClick}
            className="mt-3 cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border"
          >
            Add a link
          </button>
        )}
      </section>

      {/*
        THE LISTING OPT-IN.
        
        ⚠️ THE COPY IS THE FEATURE. This flag governs DISCOVERABILITY, not visibility: the channel
        page is public either way and is already linked from every feed card, so the only thing it
        changes is whether `GET /channels` announces the handle to a search engine. Wording that
        implies unchecking it makes the channel private would be a promise the backend cannot keep,
        and a creator who believed it would think they had hidden something they had not.

        IT DEFAULTS OFF, and it is a checkbox rather than a pre-ticked convenience because a
        directory of PEOPLE is not a directory of products — the cofounder directory made the same
        argument first.

        IT SAVES WITH THE REST rather than on click. Every other field on this screen is saved by
        the Save button; a toggle that wrote immediately would be the one control on the page whose
        state disagreed with the button next to it.
      */}
      <section>
        <div className="flex items-start gap-3">
          <input
            id="channel-listing-opt-in"
            type="checkbox"
            checked={isChannelListed}
            onChange={(event) => {
              setIsChannelListedDraft(event.target.checked);
              setSaveState({ status: "idle" });
            }}
            aria-describedby="channel-listing-opt-in-help"
            className="mt-0.5 size-4 cursor-pointer"
          />
          <div>
            <label
              htmlFor="channel-listing-opt-in"
              className="block cursor-pointer text-sm font-medium text-foreground"
            >
              List this channel in Qatoto&apos;s sitemap
            </label>
            <p id="channel-listing-opt-in-help" className="text-xs text-muted-foreground">
              Lets search engines find your channel page. It stays public either way — this only
              controls whether Qatoto points crawlers at it. Channels with no published video are
              never listed.
            </p>
          </div>
        </div>
      </section>

      <section>
        <p className="text-xs font-medium text-muted-foreground">How this looks on your channel</p>
        <div className="mt-1 rounded-xl border border-black/10 p-3">
          {/* The real renderer, not a mock-up of it — so the preview cannot drift from the page. */}
          <ChannelProfileDetails
            bio={trimmedBio === "" ? null : trimmedBio}
            links={linkRows
              .filter((linkRow) => linkRow.label.trim() !== "" && linkRow.url.trim() !== "")
              .map((linkRow) => ({ label: linkRow.label.trim(), url: linkRow.url.trim() }))}
          />
          {trimmedBio === "" && linkRows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing yet. The About panel will show your join date and counts either way.
            </p>
          )}
        </div>
      </section>

      <div>
        <button
          type="button"
          disabled={isSaveBlocked}
          onClick={() => void handleSaveClick()}
          className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saveState.status === "saving" ? "Saving…" : "Save"}
        </button>
        {saveState.status === "error" && (
          <p className="mt-2 text-xs text-destructive">{saveState.message}</p>
        )}
        {saveState.status === "saved" && (
          <p className="mt-2 text-xs text-muted-foreground">Saved.</p>
        )}
      </div>
    </div>
  );
}
