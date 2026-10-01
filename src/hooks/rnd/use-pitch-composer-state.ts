import { useState } from "react";
import {
  useCreatePitchMutation,
  useMyPitchesQuery,
  useUpdatePitchMutation,
} from "@/hooks/rnd/pitches";
import { useMyProjectsQuery } from "@/hooks/rnd/projects";

export function usePitchComposerState(pitchId?: string) {
  const isEditing = pitchId !== undefined;

  const projectsQuery = useMyProjectsQuery("active");
  const myPitchesQuery = useMyPitchesQuery(1, undefined);

  const existingPitch = isEditing
    ? myPitchesQuery.data?.rows.find((row) => row.id === pitchId)
    : undefined;

  const [projectSlug, setProjectSlug] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [fundingUrl, setFundingUrl] = useState("");
  const [contactUrl, setContactUrl] = useState("");
  const [hasSeededFromServer, setHasSeededFromServer] = useState(false);
  const [pitchVideoId, setPitchVideoId] = useState<string | null>(null);
  const [pitchVideoTitle, setPitchVideoTitle] = useState<string | null>(null);
  const [isVideoPickerOpen, setIsVideoPickerOpen] = useState(false);

  const createMutation = useCreatePitchMutation(projectSlug);
  const updateMutation = useUpdatePitchMutation();

  if (isEditing && existingPitch !== undefined && !hasSeededFromServer) {
    setTitle(existingPitch.title);
    setSummary(existingPitch.summary);
    setFundingUrl(existingPitch.externalFundingUrl ?? "");
    setContactUrl(existingPitch.externalContactUrl ?? "");
    setProjectSlug(existingPitch.projectSlug);
    setPitchVideoId(existingPitch.pitchVideo?.videoId ?? null);
    setPitchVideoTitle(existingPitch.pitchVideo?.title ?? null);
    setHasSeededFromServer(true);
  }

  const activeMutation = isEditing ? updateMutation : createMutation;
  const isSaveDisabled =
    activeMutation.isPending ||
    title.trim().length < 3 ||
    summary.trim().length < 20 ||
    (!isEditing && projectSlug.length === 0);

  const handleSubmit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (isEditing) {
      updateMutation.mutate({
        pitchId,
        input: {
          title: title.trim(),
          summary: summary.trim(),
          pitchVideoId,
          externalFundingUrl: fundingUrl.trim().length === 0 ? null : fundingUrl.trim(),
          externalContactUrl: contactUrl.trim().length === 0 ? null : contactUrl.trim(),
        },
      });
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      summary: summary.trim(),
      ...(pitchVideoId === null ? {} : { pitchVideoId }),
      ...(fundingUrl.trim().length === 0 ? {} : { externalFundingUrl: fundingUrl.trim() }),
      ...(contactUrl.trim().length === 0 ? {} : { externalContactUrl: contactUrl.trim() }),
    });
  };

  return {
    isEditing,
    existingPitch,
    projectsQuery,
    myPitchesQuery,
    projectSlug,
    setProjectSlug,
    title,
    setTitle,
    summary,
    setSummary,
    fundingUrl,
    setFundingUrl,
    contactUrl,
    setContactUrl,
    pitchVideoId,
    setPitchVideoId,
    pitchVideoTitle,
    setPitchVideoTitle,
    isVideoPickerOpen,
    setIsVideoPickerOpen,
    activeMutation,
    isSaveDisabled,
    handleSubmit,
  };
}
