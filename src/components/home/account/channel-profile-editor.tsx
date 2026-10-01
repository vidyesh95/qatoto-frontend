// TRANSPORT: client-query — reads `GET /users/me/channel-profile` and mutates via `PATCH`.
"use client";

import { useChannelProfileEditorState } from "@/hooks/account/use-channel-profile-editor-state";
import {
  ChannelProfileBioSection,
  ChannelProfileLinksSection,
  ChannelProfileListingSection,
  ChannelProfilePreviewSection,
} from "./channel-profile-editor-sections";

export default function ChannelProfileEditor({ onSaved }: { readonly onSaved?: () => void }) {
  const {
    channelProfileQuery,
    saveState,
    bio,
    trimmedBio,
    isBioTooShort,
    linkRows,
    linkErrors,
    isChannelListed,
    isSaveBlocked,
    handleBioChange,
    handleListingChange,
    handleLinkFieldChange,
    handleMoveLinkClick,
    handleRemoveLinkClick,
    handleAddLinkClick,
    handleSaveClick,
  } = useChannelProfileEditorState({ onSaved });

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

  const savedProfile = channelProfileQuery.data;
  const isHiddenByModerator = savedProfile?.profileModerationState === "hidden_by_moderator";

  return (
    <div className="flex flex-col gap-5 p-4">
      {isHiddenByModerator && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs leading-4 text-destructive">
          A moderator has hidden your description and links, so visitors to your channel cannot see
          them. Your videos, your name and your account are unaffected. You can still edit the text
          below — editing it does not put it back, but it is what a review will look at.
        </p>
      )}

      <ChannelProfileBioSection
        bio={bio}
        trimmedBio={trimmedBio}
        isBioTooShort={isBioTooShort}
        onBioChange={handleBioChange}
      />

      <ChannelProfileLinksSection
        linkRows={linkRows}
        linkErrors={linkErrors}
        onLinkFieldChange={handleLinkFieldChange}
        onMoveLinkClick={handleMoveLinkClick}
        onRemoveLinkClick={handleRemoveLinkClick}
        onAddLinkClick={handleAddLinkClick}
      />

      <ChannelProfileListingSection
        isChannelListed={isChannelListed}
        onListingChange={handleListingChange}
      />

      <ChannelProfilePreviewSection trimmedBio={trimmedBio} linkRows={linkRows} />

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
