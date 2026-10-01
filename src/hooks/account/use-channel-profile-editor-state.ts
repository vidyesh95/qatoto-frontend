import { useState } from "react";
import {
  useMyChannelProfileQuery,
  useUpdateMyChannelProfileMutation,
} from "@/hooks/account/channel-profile";
import { CHANNEL_BIO_MINIMUM_LENGTH } from "@/lib/account/channel-profile.schemas";
import type { LinkRowDraft } from "@/components/home/account/channel-profile-editor-sections";

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; message: string };

function validateLinkRows(linkRows: readonly LinkRowDraft[]): readonly (string | null)[] {
  return linkRows.map((linkRow) => {
    const trimmedLabel = linkRow.label.trim();
    const trimmedUrl = linkRow.url.trim();
    if (trimmedLabel === "" && trimmedUrl === "") return null;
    if (trimmedLabel === "") return "Give this link a label.";
    if (trimmedUrl === "") return "Add the address this link points to.";
    if (!trimmedUrl.startsWith("https://")) return "Links must start with https://";
    return null;
  });
}

export function useChannelProfileEditorState({ onSaved }: { readonly onSaved?: () => void }) {
  const channelProfileQuery = useMyChannelProfileQuery();
  const updateChannelProfileMutation = useUpdateMyChannelProfileMutation();

  const [bioDraft, setBioDraft] = useState<string | null>(null);
  const [linkRowsDraft, setLinkRowsDraft] = useState<LinkRowDraft[] | null>(null);
  const [isChannelListedDraft, setIsChannelListedDraft] = useState<boolean | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const savedProfile = channelProfileQuery.data;
  const bio = bioDraft ?? savedProfile?.bio ?? "";
  const linkRows: LinkRowDraft[] =
    linkRowsDraft ??
    (savedProfile?.links ?? []).map((link, linkIndex) => ({
      localId: `saved-${linkIndex}`,
      label: link.label,
      url: link.url,
    }));

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

  function handleMoveLinkClick(linkIndex: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? linkIndex - 1 : linkIndex + 1;
    if (targetIndex < 0 || targetIndex >= linkRows.length) return;
    const reordered = [...linkRows];
    [reordered[linkIndex], reordered[targetIndex]] = [reordered[targetIndex], reordered[linkIndex]];
    updateLinkRows(reordered);
  }

  function handleBioChange(value: string) {
    setBioDraft(value);
    setSaveState({ status: "idle" });
  }

  function handleListingChange(checked: boolean) {
    setIsChannelListedDraft(checked);
    setSaveState({ status: "idle" });
  }

  async function handleSaveClick() {
    setSaveState({ status: "saving" });
    try {
      await updateChannelProfileMutation.mutateAsync({
        isChannelListed,
        bio: trimmedBio === "" ? null : trimmedBio,
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

  return {
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
  };
}
