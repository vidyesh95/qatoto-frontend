"use client";

const HANDLE_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

function formatHandleDate(isoString: string): string {
  return HANDLE_DATE_FORMATTER.format(new Date(isoString));
}

export type AvailabilityState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "invalid"; reason: string }
  | { status: "available" }
  | { status: "taken"; suggestions: string[] }
  | { status: "revertable"; expiresAt: string }
  | { status: "current" }
  | { status: "error"; message: string };

export type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "error"; message: string };

export type ReadyMetadata = {
  handle: string | null;
  maxChanges: number;
  windowDays: number;
  changesRemaining: number;
  isChangeLocked: boolean;
  cooldownResetAt: string | null;
  revertableHandle: string | null;
  revertableExpiresAt: string | null;
};

export function HandleAvailabilityRow({
  state,
  normalizedHandle,
  onPickSuggestion,
}: {
  readonly state: AvailabilityState;
  readonly normalizedHandle: string;
  readonly onPickSuggestion: (suggestion: string) => void;
}) {
  switch (state.status) {
    case "idle":
      return null;
    case "checking":
      return <span className="text-xs text-muted-foreground">Checking availability…</span>;
    case "invalid":
      return <span className="text-xs text-destructive">{state.reason}</span>;
    case "available":
      return <span className="text-xs text-green-600">@{normalizedHandle} is available ✓</span>;
    case "current":
      return <span className="text-xs text-muted-foreground">This is your current handle.</span>;
    case "revertable":
      return (
        <span className="text-xs text-primary-imprint">
          This is your reserved handle — revert before {formatHandleDate(state.expiresAt)} to
          reclaim it.
        </span>
      );
    case "taken":
      return (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-destructive">@{normalizedHandle} is unavailable</span>
          {state.suggestions.length > 0 ? (
            <div className="flex flex-row flex-wrap gap-2">
              {state.suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onPickSuggestion(suggestion)}
                  className="cursor-pointer rounded-full border border-border px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-muted"
                >
                  @{suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
    case "error":
      return <span className="text-xs text-destructive">{state.message}</span>;
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }
}

export function HandlePanelForm({
  metadata,
  handle,
  normalizedHandle,
  onHandleChange,
  availabilityState,
  saveState,
  isSaveDisabled,
  saveButtonLabel,
  onSubmit,
  onPickSuggestion,
}: {
  readonly metadata: ReadyMetadata;
  readonly handle: string;
  readonly normalizedHandle: string;
  readonly onHandleChange: (val: string) => void;
  readonly availabilityState: AvailabilityState;
  readonly saveState: SaveState;
  readonly isSaveDisabled: boolean;
  readonly saveButtonLabel: string;
  readonly onSubmit: (formEvent: React.FormEvent<HTMLFormElement>) => void;
  readonly onPickSuggestion: (suggestion: string) => void;
}) {
  const revertableHandle = metadata.revertableHandle;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6 p-4">
      {metadata.isChangeLocked ? (
        <div className="flex flex-col gap-1 rounded-xl bg-destructive/10 px-4 py-3 text-xs text-destructive">
          <p className="font-medium">
            You&apos;ve used all {metadata.maxChanges} handle changes for now.
          </p>
          <p>
            {metadata.cooldownResetAt
              ? `You can change it again on ${formatHandleDate(metadata.cooldownResetAt)}.`
              : "Try again later."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          <p className="font-medium text-secondary-foreground">
            {metadata.changesRemaining} of {metadata.maxChanges} handle changes remaining.
          </p>
          <p>
            You can change your handle up to {metadata.maxChanges} times every {metadata.windowDays}{" "}
            days. The {metadata.windowDays}-day countdown starts at your first change, and reverting
            to a past handle counts as a change.
          </p>
        </div>
      )}

      {revertableHandle && normalizedHandle !== revertableHandle ? (
        <button
          type="button"
          onClick={() => onPickSuggestion(revertableHandle)}
          className="cursor-pointer self-start rounded-full border border-border px-4 py-2 text-sm font-medium text-secondary-foreground transition-colors hover:bg-muted"
        >
          Revert to @{revertableHandle}
        </button>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-secondary-foreground">Handle</span>
        <div className="flex flex-row items-center gap-1 rounded-xl border border-border bg-card px-4 py-3 focus-within:border-primary">
          <span className="text-base text-muted-foreground">@</span>
          <input
            type="text"
            aria-label="Handle"
            value={handle}
            onChange={(inputEvent) => onHandleChange(inputEvent.target.value)}
            placeholder="yourhandle"
            maxLength={30}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            disabled={metadata.isChangeLocked}
            className="flex-1 bg-transparent text-base text-secondary-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          Your unique @handle. 3–30 characters: lowercase letters, numbers, dots, underscores and
          hyphens.
        </span>
        <HandleAvailabilityRow
          state={availabilityState}
          normalizedHandle={normalizedHandle}
          onPickSuggestion={onPickSuggestion}
        />
        {saveState.status === "error" ? (
          <span className="text-xs text-destructive">{saveState.message}</span>
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
  );
}
