// TRANSPORT: props-only — an in-memory listener set. No fetching, no storage, no DOM.
//
// HOW THE REST OF THE APP TELLS THE MASCOT SOMETHING HAPPENED.
//
// The mascot is mounted once, at the root, and only when AI Assist Mode is on. The places that know
// about a purchase (checkout, the payment panel) are deep in `(home)` and must not import the
// mascot, its Pixi chunk, or anything that knows whether it is on. So they emit a signal into this
// module and forget about it: with the mascot off the listener set is empty and an emit costs one
// loop over nothing.
//
// A SIGNAL IS A FACT, NEVER A REQUEST FOR AN EXPRESSION. `order_placed` says what happened; the
// mascot decides what face that deserves (`mascot-state.ts`). That keeps checkout free of any
// opinion about sprites, and it keeps the copy rule in one place: an order placed is NOT a payment
// (`pending_payment` is not paid), and only `payment_settled` may be described as one.
//
// A plain Set rather than an EventTarget: a typed callback needs no CustomEvent `detail` and no
// cast to read it back.

export type AssistantSignal =
  | { readonly kind: "order_placed"; readonly orderCount: number }
  | { readonly kind: "payment_settled" };

type AssistantSignalListener = (signal: AssistantSignal) => void;

const assistantSignalListeners = new Set<AssistantSignalListener>();

export function emitAssistantSignal(signal: AssistantSignal): void {
  for (const listener of assistantSignalListeners) {
    listener(signal);
  }
}

/** Returns the unsubscribe function, so it drops straight into an effect's cleanup. */
export function subscribeToAssistantSignals(listener: AssistantSignalListener): () => void {
  assistantSignalListeners.add(listener);
  return () => {
    assistantSignalListeners.delete(listener);
  };
}
