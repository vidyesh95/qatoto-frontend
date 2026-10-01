"use client";

import ChannelProfileDetails from "@/components/home/channel/channel-profile-details";
import {
  CHANNEL_BIO_MAXIMUM_LENGTH,
  CHANNEL_BIO_MINIMUM_LENGTH,
  CHANNEL_LINK_LABEL_MAXIMUM_LENGTH,
  MAXIMUM_CHANNEL_LINKS,
} from "@/lib/account/channel-profile.schemas";

export interface LinkRowDraft {
  localId: string;
  label: string;
  url: string;
}

export function ChannelProfileBioSection({
  bio,
  trimmedBio,
  isBioTooShort,
  onBioChange,
}: {
  readonly bio: string;
  readonly trimmedBio: string;
  readonly isBioTooShort: boolean;
  readonly onBioChange: (value: string) => void;
}) {
  return (
    <section>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">Description</span>
        <span className="block text-xs leading-4 text-muted-foreground">
          Shown in the About panel on your channel. Anyone can read it.
        </span>
        <textarea
          value={bio}
          onChange={(changeEvent) => onBioChange(changeEvent.target.value)}
          rows={6}
          maxLength={CHANNEL_BIO_MAXIMUM_LENGTH}
          className="mt-1 w-full rounded-xl border border-border bg-card px-4 py-3 text-base text-secondary-foreground outline-none focus:border-primary"
        />
      </label>
      {isBioTooShort ? (
        <p className="mt-1 text-xs text-destructive">
          A description needs at least {CHANNEL_BIO_MINIMUM_LENGTH} characters, or leave it empty.
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          {trimmedBio.length} of {CHANNEL_BIO_MAXIMUM_LENGTH}
        </p>
      )}
    </section>
  );
}

export function ChannelProfileLinksSection({
  linkRows,
  linkErrors,
  onLinkFieldChange,
  onMoveLinkClick,
  onRemoveLinkClick,
  onAddLinkClick,
}: {
  readonly linkRows: readonly LinkRowDraft[];
  readonly linkErrors: readonly (string | null)[];
  readonly onLinkFieldChange: (localId: string, patch: Partial<LinkRowDraft>) => void;
  readonly onMoveLinkClick: (linkIndex: number, direction: "up" | "down") => void;
  readonly onRemoveLinkClick: (localId: string) => void;
  readonly onAddLinkClick: () => void;
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Links</span>
        <span className="text-xs text-muted-foreground">
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
                  onLinkFieldChange(linkRow.localId, { label: changeEvent.target.value })
                }
                placeholder="Label"
                aria-label={`Link ${linkIndex + 1} label`}
                maxLength={CHANNEL_LINK_LABEL_MAXIMUM_LENGTH}
                className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-secondary-foreground outline-none focus:border-primary"
              />
              <input
                type="url"
                value={linkRow.url}
                onChange={(changeEvent) =>
                  onLinkFieldChange(linkRow.localId, { url: changeEvent.target.value })
                }
                placeholder="https://example.com"
                aria-label={`Link ${linkIndex + 1} URL`}
                className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-secondary-foreground outline-none focus:border-primary"
              />
              {linkErrors[linkIndex] !== null && linkErrors[linkIndex] !== undefined && (
                <p className="text-xs text-destructive">{linkErrors[linkIndex]}</p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  aria-label="Move link up"
                  disabled={linkIndex === 0}
                  onClick={() => onMoveLinkClick(linkIndex, "up")}
                  className="cursor-pointer text-xs font-medium text-foreground underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Up
                </button>
                <button
                  type="button"
                  aria-label="Move link down"
                  disabled={linkIndex === linkRows.length - 1}
                  onClick={() => onMoveLinkClick(linkIndex, "down")}
                  className="cursor-pointer text-xs font-medium text-foreground underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveLinkClick(linkRow.localId)}
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
          onClick={onAddLinkClick}
          className="mt-3 cursor-pointer rounded-full bg-background px-3 py-1.5 text-xs font-medium text-foreground outline -outline-offset-1 outline-border"
        >
          Add a link
        </button>
      )}
    </section>
  );
}

export function ChannelProfileListingSection({
  isChannelListed,
  onListingChange,
}: {
  readonly isChannelListed: boolean;
  readonly onListingChange: (checked: boolean) => void;
}) {
  return (
    <section>
      <div className="flex items-start gap-3">
        <input
          id="channel-listing-opt-in"
          type="checkbox"
          checked={isChannelListed}
          onChange={(event) => onListingChange(event.target.checked)}
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
            On by default. Lets search engines find your channel page — it stays public either way,
            and unticking this does not make it private, it only stops Qatoto pointing crawlers at
            it. Channels with no published video are never listed.
          </p>
        </div>
      </div>
    </section>
  );
}

export function ChannelProfilePreviewSection({
  trimmedBio,
  linkRows,
}: {
  readonly trimmedBio: string;
  readonly linkRows: readonly LinkRowDraft[];
}) {
  return (
    <section>
      <p className="text-xs font-medium text-muted-foreground">How this looks on your channel</p>
      <div className="mt-1 rounded-xl border border-border p-3">
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
  );
}
