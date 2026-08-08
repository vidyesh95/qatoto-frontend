// TRANSPORT: props-only — renders a result someone else already has.
"use client";

// A refused write is a VALUE, not a throw, so it surfaces here rather than vanishing.
//
// THE SERVER'S OWN MESSAGE IS SHOWN. On a `409` the backend names the actual conflict — the minimum
// order quantity it wanted, the stock it actually has, the variant it required — and a generic
// "something went wrong" would discard exactly the sentence the buyer can act on. The fallback exists
// only for the case where nothing came back at all, which is what `hasThrown` distinguishes: a
// transport that never resolved, as opposed to a `success: false` payload that did.

export default function MutationNotice({
  result,
  fallbackMessage,
  hasThrown,
}: {
  result: { readonly success: boolean; readonly error?: { readonly message: string } } | undefined;
  fallbackMessage: string;
  hasThrown: boolean;
}) {
  if (hasThrown) {
    return <p className="mt-1 text-xs leading-4 text-destructive">{fallbackMessage}</p>;
  }
  if (result === undefined || result.success) return null;
  return (
    <p className="mt-1 text-xs leading-4 text-destructive">
      {result.error?.message ?? fallbackMessage}
    </p>
  );
}
