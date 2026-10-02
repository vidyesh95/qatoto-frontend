// TRANSPORT: props-only — reads and writes browser preferences.
"use client";

// AI ASSIST MODE FOR EVERYONE, SIGNED IN OR NOT.
//
// The account menu is the signed-in way to switch the assistant on. This sheet is the other one:
// the signed-out navbar's "AI Assist" button and the sidebar's "AI Assist" row both open it. It is
// the same `AiAssistPanel` the menu shows — On/Off and the mascot's size and speed — inside the
// shared `ModalSheet`, so the two entry points can never offer different settings.
//
// Switching it on needs no account: the mascot, its reactions, Places and on-device chat (where
// Chrome has a built-in model) all work signed out. Only the cloud route is Premium AI.

import ModalSheet from "@/components/home/shared/modal-sheet";
import { AiAssistPanel } from "@/components/home/account/menus/ai-assist-menu";
import { useBrowserPreferences } from "@/state/browser-preferences-context";

export default function AiAssistSheet({
  idPrefix,
  onClose,
}: {
  /** Unique per entry point, so the navbar's and the sidebar's copies never share radio names. */
  readonly idPrefix: string;
  readonly onClose: () => void;
}) {
  const { preferences, setPreference } = useBrowserPreferences();
  return (
    <ModalSheet title="AI Assist Mode" onClose={onClose}>
      <AiAssistPanel
        variant="sheet"
        idPrefix={idPrefix}
        selected={preferences.isAiAssistModeOn}
        onSelect={(isAiAssistModeOn) => setPreference("isAiAssistModeOn", isAiAssistModeOn)}
        mascotSize={preferences.assistantMascotSize}
        mascotSpeed={preferences.assistantMascotSpeed}
        onMascotSizeChange={(mascotSize) => setPreference("assistantMascotSize", mascotSize)}
        onMascotSpeedChange={(mascotSpeed) => setPreference("assistantMascotSpeed", mascotSpeed)}
      />
    </ModalSheet>
  );
}
