"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useSession } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/api";
import { HandlePanelForm, type AvailabilityState, type SaveState } from "./handle-panel-form";

function normalizeHandle(rawHandle: string): string {
  return rawHandle.trim().replace(/^@/, "").toLowerCase();
}

const HANDLE_REGEX = /^[a-z0-9._-]{3,30}$/;
const HANDLE_LENGTH_MESSAGE = "Handle must be 3–30 characters.";
const HANDLE_CHARSET_MESSAGE =
  "Handle may use only lowercase letters, numbers, dots, underscores and hyphens.";

const HandleMetadataEnvelopeSchema = z.object({
  data: z.object({
    handle: z.string().nullable(),
    maxChanges: z.number(),
    windowDays: z.number(),
    changesRemaining: z.number(),
    isChangeLocked: z.boolean(),
    cooldownResetAt: z.string().nullable(),
    revertableHandle: z.string().nullable(),
    revertableExpiresAt: z.string().nullable(),
  }),
});

const HandleAvailabilityEnvelopeSchema = z.object({
  data: z.discriminatedUnion("status", [
    z.object({ status: z.literal("available"), handle: z.string() }),
    z.object({
      status: z.literal("taken"),
      handle: z.string(),
      suggestions: z.array(z.string()),
    }),
    z.object({ status: z.literal("revertable"), handle: z.string(), expiresAt: z.string() }),
    z.object({ status: z.literal("current"), handle: z.string() }),
    z.object({ status: z.literal("invalid"), handle: z.string(), reason: z.string() }),
  ]),
});

const ErrorEnvelopeSchema = z.object({
  message: z.string().optional(),
  errors: z.record(z.string(), z.array(z.string())).optional(),
});

function readHandleError(payload: unknown): string {
  const fallback = "Couldn't update your handle. Please try again.";
  const parsed = ErrorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) return fallback;
  return parsed.data.errors?.handle?.[0] ?? parsed.data.message ?? fallback;
}

function deriveImmediateAvailability(
  metadataStatus: MetadataState["status"],
  normalizedHandle: string,
  currentHandle: string | null,
): AvailabilityState | "needs_probe" {
  if (metadataStatus !== "ready") return { status: "idle" };
  if (normalizedHandle.length === 0) return { status: "idle" };
  if (normalizedHandle === currentHandle) return { status: "current" };
  if (!HANDLE_REGEX.test(normalizedHandle)) {
    const reason =
      normalizedHandle.length < 3 || normalizedHandle.length > 30
        ? HANDLE_LENGTH_MESSAGE
        : HANDLE_CHARSET_MESSAGE;
    return { status: "invalid", reason };
  }
  return "needs_probe";
}

type MetadataState =
  | { status: "loading" }
  | {
      status: "ready";
      handle: string | null;
      maxChanges: number;
      windowDays: number;
      changesRemaining: number;
      isChangeLocked: boolean;
      cooldownResetAt: string | null;
      revertableHandle: string | null;
      revertableExpiresAt: string | null;
    }
  | { status: "error"; message: string };

type HandlePanelProps = {
  /** Return to the settings action list. */
  onBack: () => void;
};

export function HandlePanel({ onBack }: HandlePanelProps) {
  const { refetch } = useSession();
  const [handle, setHandle] = useState("");
  const [metadataState, setMetadataState] = useState<MetadataState>({ status: "loading" });
  const [probedAvailability, setProbedAvailability] = useState<{
    handle: string;
    state: AvailabilityState;
  } | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const normalizedHandle = normalizeHandle(handle);
  const currentHandle = metadataState.status === "ready" ? metadataState.handle : null;
  const isChangeLocked = metadataState.status === "ready" && metadataState.isChangeLocked;

  const immediateAvailability: AvailabilityState | "needs_probe" = deriveImmediateAvailability(
    metadataState.status,
    normalizedHandle,
    currentHandle,
  );
  const availabilityState: AvailabilityState =
    immediateAvailability === "needs_probe"
      ? probedAvailability?.handle === normalizedHandle
        ? probedAvailability.state
        : { status: "checking" }
      : immediateAvailability;

  useEffect(() => {
    const abortController = new AbortController();

    async function loadMetadata() {
      try {
        const response = await fetch(`${API_BASE_URL}/users/me/handle`, {
          credentials: "include",
          signal: abortController.signal,
        });
        if (!response.ok) {
          setMetadataState({ status: "error", message: "Couldn't load your handle settings." });
          return;
        }
        const parsed = HandleMetadataEnvelopeSchema.safeParse(await response.json());
        if (!parsed.success) {
          setMetadataState({ status: "error", message: "Couldn't load your handle settings." });
          return;
        }
        setMetadataState({ status: "ready", ...parsed.data.data });
        setHandle(parsed.data.data.handle ?? "");
      } catch {
        if (abortController.signal.aborted) return;
        setMetadataState({ status: "error", message: "Network error. Please try again." });
      }
    }

    void loadMetadata();
    return () => abortController.abort();
  }, []);

  useEffect(() => {
    if (immediateAvailability !== "needs_probe") return undefined;

    const abortController = new AbortController();
    const debounceTimer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/handles/availability?handle=${encodeURIComponent(normalizedHandle)}`,
          { credentials: "include", signal: abortController.signal },
        );
        if (response.status === 429) {
          setProbedAvailability({
            handle: normalizedHandle,
            state: {
              status: "error",
              message: "Checking too fast — try again in a moment.",
            },
          });
          return;
        }
        if (!response.ok) {
          setProbedAvailability({
            handle: normalizedHandle,
            state: { status: "error", message: "Couldn't check availability." },
          });
          return;
        }
        const parsed = HandleAvailabilityEnvelopeSchema.safeParse(await response.json());
        if (!parsed.success) {
          setProbedAvailability({
            handle: normalizedHandle,
            state: { status: "error", message: "Couldn't check availability." },
          });
          return;
        }
        const availability = parsed.data.data;
        switch (availability.status) {
          case "available":
            setProbedAvailability({ handle: normalizedHandle, state: { status: "available" } });
            return;
          case "taken":
            setProbedAvailability({
              handle: normalizedHandle,
              state: { status: "taken", suggestions: availability.suggestions },
            });
            return;
          case "revertable":
            setProbedAvailability({
              handle: normalizedHandle,
              state: { status: "revertable", expiresAt: availability.expiresAt },
            });
            return;
          case "current":
            setProbedAvailability({ handle: normalizedHandle, state: { status: "current" } });
            return;
          case "invalid":
            setProbedAvailability({
              handle: normalizedHandle,
              state: { status: "invalid", reason: availability.reason },
            });
            return;
          default: {
            const exhaustiveCheck: never = availability;
            setProbedAvailability({
              handle: normalizedHandle,
              state: {
                status: "error",
                message: `Couldn't check availability (${String(exhaustiveCheck)}).`,
              },
            });
          }
        }
      } catch {
        if (abortController.signal.aborted) return;
        setProbedAvailability({
          handle: normalizedHandle,
          state: { status: "error", message: "Network error." },
        });
      }
    }, 400);

    return () => {
      clearTimeout(debounceTimer);
      abortController.abort();
    };
  }, [normalizedHandle, immediateAvailability]);

  const isSaveDisabled =
    saveState.status === "saving" ||
    isChangeLocked ||
    !(availabilityState.status === "available" || availabilityState.status === "revertable");

  const saveButtonLabel =
    saveState.status === "saving"
      ? "Saving…"
      : availabilityState.status === "revertable"
        ? `Revert to @${normalizedHandle}`
        : "Save";

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (isSaveDisabled) return;
    setSaveState({ status: "saving" });

    try {
      const response = await fetch(`${API_BASE_URL}/users/me/handle`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handle: normalizedHandle }),
      });
      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        setSaveState({ status: "error", message: readHandleError(errorPayload) });
        return;
      }
      await refetch();
      onBack();
    } catch {
      setSaveState({ status: "error", message: "Network error. Please try again." });
    }
  }

  function handleSuggestionPick(suggestion: string) {
    setHandle(suggestion);
    if (saveState.status === "error") setSaveState({ status: "idle" });
  }

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-border bg-background p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl font-medium text-secondary-foreground">Set handle</h2>
      </header>

      {metadataState.status === "loading" ? (
        <p className="p-4 text-sm text-muted-foreground">Loading…</p>
      ) : metadataState.status === "error" ? (
        <p className="p-4 text-sm text-destructive">{metadataState.message}</p>
      ) : (
        <HandlePanelForm
          metadata={metadataState}
          handle={handle}
          normalizedHandle={normalizedHandle}
          onHandleChange={(val) => {
            setHandle(val);
            if (saveState.status === "error") setSaveState({ status: "idle" });
          }}
          availabilityState={availabilityState}
          saveState={saveState}
          isSaveDisabled={isSaveDisabled}
          saveButtonLabel={saveButtonLabel}
          onSubmit={handleSubmit}
          onPickSuggestion={handleSuggestionPick}
        />
      )}
    </div>
  );
}
