"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useSession } from "@/lib/auth-client";
import { API_BASE_URL } from "@/lib/api";

/**
 * Editor for the account's public @handle. Mirrors the backend contract in
 * qatoto-backend (handle.service.ts / handle.controller.ts): a Tier-1 debounced
 * availability probe for fast feedback, then a Tier-2 authoritative PATCH that
 * runs the rate-limit + 14-day-reservation transaction.
 *
 * NOT a trust boundary (CLAUDE.md §1.1). Every check here — normalize, regex,
 * availability — is UX only; the Express backend re-validates, re-checks
 * availability under a row lock, and is the sole authority that persists the
 * handle. A green checkmark can go stale before submit, so the PATCH may still
 * come back TAKEN — that is a normal error path, not an impossible state.
 */

/** Canonical handle: trimmed, no leading "@", lowercase. Mirrors the server. */
function normalizeHandle(rawHandle: string): string {
  return rawHandle.trim().replace(/^@/, "").toLowerCase();
}

/** Client mirror of the server regex — instant feedback, never authoritative. */
const HANDLE_REGEX = /^[a-z0-9._-]{3,30}$/;
const HANDLE_LENGTH_MESSAGE = "Handle must be 3–30 characters.";
const HANDLE_CHARSET_MESSAGE =
  "Handle may use only lowercase letters, numbers, dots, underscores and hyphens.";

// --- Boundary parsing (CLAUDE.md Pattern 2): every payload is `unknown` until a
// Zod schema vouches for it. `.strip()` keeps us forward-compatible with backend
// additions. Date fields arrive as ISO strings (the ApiResponse envelope
// serializes Date → string); we parse them to Date only when formatting.

const HandleMetadataEnvelopeSchema = z
  .object({
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
  })
  .strip();

const HandleAvailabilityEnvelopeSchema = z
  .object({
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
  })
  .strip();

const ErrorEnvelopeSchema = z
  .object({
    message: z.string().optional(),
    errors: z.record(z.string(), z.array(z.string())).optional(),
  })
  .strip();

/** Pull the handle-specific message out of the backend's error envelope. */
function readHandleError(payload: unknown): string {
  const fallback = "Couldn't update your handle. Please try again.";
  const parsed = ErrorEnvelopeSchema.safeParse(payload);
  if (!parsed.success) return fallback;
  return parsed.data.errors?.handle?.[0] ?? parsed.data.message ?? fallback;
}

/** Human date like "Jul 9, 2026" for reservation / cooldown copy. */
function formatHandleDate(isoString: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoString));
}

/** Panel bootstrap: current handle + rate-limit + revert metadata. */
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

/** Tier-1 live availability of the currently-typed handle. */
type AvailabilityState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "invalid"; reason: string }
  | { status: "available" }
  | { status: "taken"; suggestions: string[] }
  | { status: "revertable"; expiresAt: string }
  | { status: "current" }
  | { status: "error"; message: string };

/** Tier-2 submit lifecycle. */
type SaveState = { status: "idle" } | { status: "saving" } | { status: "error"; message: string };

type HandlePanelProps = {
  /** Return to the settings action list. */
  onBack: () => void;
};

export function HandlePanel({ onBack }: HandlePanelProps) {
  const { refetch } = useSession();
  const [handle, setHandle] = useState("");
  const [metadataState, setMetadataState] = useState<MetadataState>({ status: "loading" });
  const [availabilityState, setAvailabilityState] = useState<AvailabilityState>({ status: "idle" });
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const normalizedHandle = normalizeHandle(handle);
  const currentHandle = metadataState.status === "ready" ? metadataState.handle : null;
  const isChangeLocked = metadataState.status === "ready" && metadataState.isChangeLocked;

  // Bootstrap: load the current handle + rate-limit metadata, prefill the field.
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

  // Tier-1: debounced availability probe. The client regex gates obviously-bad
  // input so we never spam the backend; the request fires only after a 400ms
  // pause and is cancelled if the user keeps typing.
  useEffect(() => {
    if (metadataState.status !== "ready") return undefined;

    if (normalizedHandle.length === 0) {
      setAvailabilityState({ status: "idle" });
      return undefined;
    }
    if (normalizedHandle === currentHandle) {
      setAvailabilityState({ status: "current" });
      return undefined;
    }
    if (!HANDLE_REGEX.test(normalizedHandle)) {
      const reason =
        normalizedHandle.length < 3 || normalizedHandle.length > 30
          ? HANDLE_LENGTH_MESSAGE
          : HANDLE_CHARSET_MESSAGE;
      setAvailabilityState({ status: "invalid", reason });
      return undefined;
    }

    setAvailabilityState({ status: "checking" });
    const abortController = new AbortController();
    const debounceTimer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/handles/availability?handle=${encodeURIComponent(normalizedHandle)}`,
          { credentials: "include", signal: abortController.signal },
        );
        if (response.status === 429) {
          setAvailabilityState({
            status: "error",
            message: "Checking too fast — try again in a moment.",
          });
          return;
        }
        if (!response.ok) {
          setAvailabilityState({ status: "error", message: "Couldn't check availability." });
          return;
        }
        const parsed = HandleAvailabilityEnvelopeSchema.safeParse(await response.json());
        if (!parsed.success) {
          setAvailabilityState({ status: "error", message: "Couldn't check availability." });
          return;
        }
        const availability = parsed.data.data;
        switch (availability.status) {
          case "available":
            setAvailabilityState({ status: "available" });
            return;
          case "taken":
            setAvailabilityState({ status: "taken", suggestions: availability.suggestions });
            return;
          case "revertable":
            setAvailabilityState({ status: "revertable", expiresAt: availability.expiresAt });
            return;
          case "current":
            setAvailabilityState({ status: "current" });
            return;
          case "invalid":
            setAvailabilityState({ status: "invalid", reason: availability.reason });
            return;
          default: {
            const exhaustiveCheck: never = availability;
            throw new Error(`Unhandled availability status: ${String(exhaustiveCheck)}`);
          }
        }
      } catch {
        if (abortController.signal.aborted) return;
        setAvailabilityState({ status: "error", message: "Network error." });
      }
    }, 400);

    return () => {
      clearTimeout(debounceTimer);
      abortController.abort();
    };
  }, [normalizedHandle, currentHandle, metadataState.status]);

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
      // Backend persisted it; pull a fresh session so the new handle shows everywhere.
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

  const revertableHandle = metadataState.status === "ready" ? metadataState.revertableHandle : null;

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-black/10 bg-background p-4">
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
        <p className="p-4 text-sm text-red-600">{metadataState.message}</p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 p-4">
          {isChangeLocked ? (
            <div className="flex flex-col gap-1 rounded-xl bg-red-50 px-4 py-3 text-xs text-red-700">
              <p className="font-medium">
                You&apos;ve used all {metadataState.maxChanges} handle changes for now.
              </p>
              <p>
                {metadataState.cooldownResetAt
                  ? `You can change it again on ${formatHandleDate(metadataState.cooldownResetAt)}.`
                  : "Try again later."}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <p className="font-medium text-secondary-foreground">
                {metadataState.changesRemaining} of {metadataState.maxChanges} handle changes
                remaining.
              </p>
              <p>
                You can change your handle up to {metadataState.maxChanges} times every{" "}
                {metadataState.windowDays} days. The {metadataState.windowDays}-day countdown starts
                at your first change, and reverting to a past handle counts as a change.
              </p>
            </div>
          )}

          {revertableHandle && normalizedHandle !== revertableHandle ? (
            <button
              type="button"
              onClick={() => handleSuggestionPick(revertableHandle)}
              className="cursor-pointer self-start rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
            >
              Revert to @{revertableHandle}
            </button>
          ) : null}

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-secondary-foreground">Handle</span>
            <div className="flex flex-row items-center gap-1 rounded-xl border border-black/10 bg-card px-4 py-3 focus-within:border-primary">
              <span className="text-base text-muted-foreground">@</span>
              <input
                type="text"
                aria-label="Handle"
                value={handle}
                onChange={(inputEvent) => {
                  setHandle(normalizeHandle(inputEvent.target.value));
                  if (saveState.status === "error") setSaveState({ status: "idle" });
                }}
                placeholder="yourhandle"
                maxLength={30}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={isChangeLocked}
                className="flex-1 bg-transparent text-base text-secondary-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Your unique @handle. 3–30 characters: lowercase letters, numbers, dots, underscores
              and hyphens.
            </span>
            <HandleAvailabilityRow
              state={availabilityState}
              normalizedHandle={normalizedHandle}
              onPickSuggestion={handleSuggestionPick}
            />
            {saveState.status === "error" ? (
              <span className="text-xs text-red-600">{saveState.message}</span>
            ) : null}
          </label>

          <button
            type="submit"
            disabled={isSaveDisabled}
            className="cursor-pointer rounded-full bg-primary px-4 py-3 text-sm font-medium transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saveButtonLabel}
          </button>
        </form>
      )}
    </div>
  );
}

/** Inline status under the input — exhaustive over every availability state. */
function HandleAvailabilityRow({
  state,
  normalizedHandle,
  onPickSuggestion,
}: {
  state: AvailabilityState;
  normalizedHandle: string;
  onPickSuggestion: (suggestion: string) => void;
}) {
  switch (state.status) {
    case "idle":
      return null;
    case "checking":
      return <span className="text-xs text-muted-foreground">Checking availability…</span>;
    case "invalid":
      return <span className="text-xs text-red-600">{state.reason}</span>;
    case "available":
      return <span className="text-xs text-green-600">@{normalizedHandle} is available ✓</span>;
    case "current":
      return <span className="text-xs text-muted-foreground">This is your current handle.</span>;
    case "revertable":
      return (
        <span className="text-xs text-[#00696E]">
          This is your reserved handle — revert before {formatHandleDate(state.expiresAt)} to
          reclaim it.
        </span>
      );
    case "taken":
      return (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-red-600">@{normalizedHandle} is unavailable</span>
          {state.suggestions.length > 0 ? (
            <div className="flex flex-row flex-wrap gap-2">
              {state.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onPickSuggestion(suggestion)}
                  className="cursor-pointer rounded-full border border-black/10 px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-muted"
                >
                  @{suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    case "error":
      return <span className="text-xs text-red-600">{state.message}</span>;
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}
