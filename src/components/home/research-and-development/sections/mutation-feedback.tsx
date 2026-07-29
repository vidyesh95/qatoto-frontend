// TRANSPORT: props-only — presentational. Fetches nothing; it renders whatever a
// client-query island's mutation is currently doing. Safe on either side of the
// boundary, though in practice only islands use it.
import type { ApiError } from "@/lib/http";

/**
 * The one place a failed R&D write is rendered.
 *
 * IT NEVER INVENTS A REASON. The backend's message is shown verbatim and the code beside
 * it, because this domain's refusals are specific and load-bearing —
 * `409 RATE_NOT_LOCKED`, `409 SNAPSHOT_STALE`, `422 SELF_COUNTERSIGN_FORBIDDEN`,
 * `409 STATEMENT_CHAIN_BROKEN` — and paraphrasing them into "something went wrong" throws
 * away the only thing that tells the user what to do next.
 *
 * `fieldErrors` from a `422` render as a list. Every backend body schema is `.strict()`,
 * so an unknown key is a 422 rather than an ignored field, and seeing WHICH key was
 * rejected is the difference between a fixable form and a stuck one.
 *
 * A `404` here is NOT rendered as a permission hint. Project-scoped writes answer 404 for
 * "no access or no such thing" so a stranger cannot probe which ids exist; the message the
 * backend chose is what appears, and nothing is added to it.
 */
export function MutationErrorNotice({ error }: { error: ApiError }) {
  const fieldErrorEntries = Object.entries(error.fieldErrors ?? {});

  return (
    <div
      role="alert"
      className="space-y-1 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
    >
      <p>{error.message}</p>
      {fieldErrorEntries.length > 0 && (
        <ul className="list-inside list-disc text-xs">
          {fieldErrorEntries.map(([fieldName, messages]) => (
            <li key={fieldName}>
              <span className="font-medium">{fieldName}</span>: {messages.join(" ")}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs opacity-70">Code {error.code}</p>
    </div>
  );
}

/**
 * The `202` branch — accepted, not decided.
 *
 * Claim submit, re-verify, receipt upload and problem-report submit all return 202, and
 * the number they eventually produce does not exist yet. This says so. Nothing here may
 * name a verdict, a minute count or a slice: on a Slicing Pie surface an optimistic
 * verdict is an optimistic equity split.
 */
export function MutationAcceptedNotice({ message }: { message: string }) {
  return (
    <output className="block rounded-2xl border border-[#00696E]/30 bg-[#00696E]/5 p-3 text-sm text-[#00696E]">
      {message}
    </output>
  );
}

/** Plain confirmation for a write that DID decide synchronously — a 200 or a 201. */
export function MutationSuccessNotice({ message }: { message: string }) {
  return <output className="block rounded-2xl bg-muted p-3 text-sm">{message}</output>;
}
