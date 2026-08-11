// TRANSPORT: props-only — renders a result someone else already has.
"use client";

// A refused write is a VALUE, not a throw, so it surfaces here rather than vanishing.
//
// THE SERVER'S OWN MESSAGE IS SHOWN. On a `409` the backend names the actual conflict — the minimum
// order quantity it wanted, the stock it actually has, the variant it required — and a generic
// "something went wrong" would discard exactly the sentence the buyer can act on. The fallback exists
// only for the case where nothing came back at all, which is what `hasThrown` distinguishes: a
// transport that never resolved, as opposed to a `success: false` payload that did.
//
// AND THE PER-FIELD DETAIL, WHICH USED TO BE DROPPED ON THE FLOOR. A schema refusal answers with the
// deliberately generic "Please check the highlighted fields." — user-facing copy chosen because ~46
// of 48 client surfaces render `message` alone — and puts every actual reason in `errors`. Rendering
// only `message` therefore reached the user as a sentence naming nothing, which is the worst case of
// all: it says there IS something to fix and refuses to say what.
//
// `form` IS A RESERVED KEY, NOT A FIELD. Object-level issues — notably `.strict()`'s
// `unrecognized_keys`, which is how every rejected server-owned field arrives — have no field path,
// so the backend files them under `form` (`project-error-response.ts:87-91`). Labelling that entry
// with the key would print "form: …" at the user. It renders as a plain sentence instead.
//
// `research-and-development/sections/mutation-feedback.tsx` solves the same problem for that domain;
// the two are now aligned in what they render, differing only in this surface's smaller type scale.

/** The reserved key the backend files object-level refusals under. Not a field name. */
const FORM_LEVEL_ERROR_KEY = "form";

export default function MutationNotice({
  result,
  fallbackMessage,
  hasThrown,
}: {
  result:
    | {
        readonly success: boolean;
        readonly error?: {
          readonly message: string;
          readonly fieldErrors?: Readonly<Record<string, readonly string[]>>;
        };
      }
    | undefined;
  fallbackMessage: string;
  hasThrown: boolean;
}) {
  if (hasThrown) {
    return (
      <p role="alert" className="mt-1 text-xs leading-4 text-destructive">
        {fallbackMessage}
      </p>
    );
  }
  if (result === undefined || result.success) return null;

  const fieldErrorEntries = Object.entries(result.error?.fieldErrors ?? {});

  return (
    <div role="alert" className="mt-1 space-y-0.5 text-xs leading-4 text-destructive">
      <p>{result.error?.message ?? fallbackMessage}</p>
      {fieldErrorEntries.length > 0 && (
        <ul className="space-y-0.5">
          {fieldErrorEntries.map(([fieldName, messages]) => (
            <li key={fieldName}>
              {fieldName !== FORM_LEVEL_ERROR_KEY && (
                <span className="font-medium">{fieldName}: </span>
              )}
              {messages.join(" ")}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
