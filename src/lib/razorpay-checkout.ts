// TRANSPORT: props-only — loads a third-party script. No Qatoto backend call.
//
// RAZORPAY CHECKOUT IS A GLOBAL CONSTRUCTOR ON `window`, loaded from Razorpay's CDN. The module-level
// promise below is the same fix `youtube-iframe-api.ts` uses: the first caller appends the script
// tag, every later caller awaits the same promise, and a failed load clears it so a retry can try
// again instead of inheriting a rejection forever.
//
// There is no official typed package worth a dependency, so only the surface this app touches is
// declared. Everything Razorpay hands BACK (`handler`'s argument, the `payment.failed` event) is typed
// `unknown` on purpose and parsed with Zod at the call site — it is third-party data arriving at a
// money screen, which is exactly where CLAUDE.md forbids an `as`.
//
// THE KEY ID IS PUBLIC. `NEXT_PUBLIC_RAZORPAY_KEY_ID` is the test key id; the key SECRET lives only in
// the backend, which is what verifies the signature.

const CHECKOUT_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

/** Null when unset, so the control can say "not configured" instead of opening a broken modal. */
export const RAZORPAY_KEY_ID: string | null = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null;

/** The option keys are Razorpay's own snake_case contract. */
export interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  handler: (checkoutSuccess: unknown) => void;
  modal: { ondismiss: () => void };
}

export interface RazorpayCheckoutInstance {
  open: () => void;
  on: (eventName: "payment.failed", listener: (paymentFailure: unknown) => void) => void;
}

export interface RazorpayCheckoutConstructor {
  new (options: RazorpayCheckoutOptions): RazorpayCheckoutInstance;
}

declare global {
  interface Window {
    Razorpay?: RazorpayCheckoutConstructor;
  }
}

let checkoutScriptPromise: Promise<RazorpayCheckoutConstructor> | null = null;

/**
 * Resolves with the Checkout constructor, loading the script on first call only.
 *
 * Rejects rather than hanging — an ad blocker or a network failure will stop the script, and a pay
 * button that silently does nothing is worse than one that says why.
 */
export function loadRazorpayCheckout(): Promise<RazorpayCheckoutConstructor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay Checkout is browser-only."));
  }
  if (window.Razorpay !== undefined) return Promise.resolve(window.Razorpay);
  if (checkoutScriptPromise !== null) return checkoutScriptPromise;

  checkoutScriptPromise = new Promise<RazorpayCheckoutConstructor>((resolve, reject) => {
    const scriptElement = document.createElement("script");
    scriptElement.src = CHECKOUT_SCRIPT_SRC;
    scriptElement.async = true;
    scriptElement.addEventListener(
      "load",
      () => {
        if (window.Razorpay === undefined) {
          checkoutScriptPromise = null;
          reject(new Error("Razorpay Checkout loaded without its constructor."));
          return;
        }
        resolve(window.Razorpay);
      },
      { once: true },
    );
    scriptElement.addEventListener(
      "error",
      () => {
        checkoutScriptPromise = null;
        scriptElement.remove();
        reject(new Error("Razorpay Checkout failed to load."));
      },
      { once: true },
    );
    document.head.append(scriptElement);
  });

  return checkoutScriptPromise;
}
