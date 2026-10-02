// TRANSPORT: props-only — pure state shapes and reaction tables. No React, no DOM, no Pixi.
//
// WHERE THE MASCOT IS, AND WHAT IT IS FEELING, AS TWO SEPARATE CHANNELS.
//
// Placement and mood change for unrelated reasons — a scroll moves it, a purchase cheers it — so
// they are two unions rather than one bag of flags. Neither is React state: both are read and
// written every animation frame by `mascot-controller.ts`, and a React commit per frame is the cost
// this feature exists to avoid. React only hears about the speech bubble, which changes rarely.

import type { AssistantSignal } from "@/lib/assistant/assistant-signals";
import type { MascotExpression, MascotPointingDirection } from "@/lib/assistant/mascot-expressions";

/**
 * `travelling` carries the perch it is heading for, or `null` when it is heading home to the dock.
 * `dragged` is the viewer holding it: it follows the pointer exactly and nothing else moves it.
 * A perched mascot follows its perch every frame without a tween; only a change of destination is
 * animated.
 */
export type MascotPlacement =
  | { readonly mode: "docked" }
  | { readonly mode: "travelling"; readonly toPerchId: string | null }
  | { readonly mode: "perched"; readonly perchId: string }
  | { readonly mode: "dragged" };

/** Lowest first. A mood only replaces one of the same or lower priority, or one that has expired. */
export const MASCOT_MOOD_PRIORITIES = ["ambient", "interaction", "signal"] as const;
export type MascotMoodPriority = (typeof MASCOT_MOOD_PRIORITIES)[number];

export interface MascotMood {
  readonly expression: MascotExpression;
  readonly priority: MascotMoodPriority;
  /** `null` for the ambient mood, which lasts until something displaces it. */
  readonly expiresAtMs: number | null;
}

export const AMBIENT_MASCOT_MOOD: MascotMood = {
  expression: "neutral",
  priority: "ambient",
  expiresAtMs: null,
};

export function canMoodReplace(incomingMood: MascotMood, currentMood: MascotMood, nowMs: number) {
  if (currentMood.expiresAtMs !== null && currentMood.expiresAtMs <= nowMs) return true;
  return (
    MASCOT_MOOD_PRIORITIES.indexOf(incomingMood.priority) >=
    MASCOT_MOOD_PRIORITIES.indexOf(currentMood.priority)
  );
}

/**
 * A pointing pose laid OVER the mood while it lasts: the mascot points, then goes back to
 * whatever it was feeling. `expiresAtMs: null` is "for as long as this lasts" — pointing the way
 * while it travels, which ends when it arrives.
 */
export interface MascotPointing {
  readonly direction: MascotPointingDirection;
  readonly expiresAtMs: number | null;
}

/** Perch ids, as written in `data-assistant-perch="<id>"`. One constant or builder per perch. */
export const CHECKOUT_CONFIRMED_PERCH_ID = "checkout-confirmed";
export const SUBMISSION_RECEIPT_PERCH_ID = "submission-receipt";
/** Per product, because a page can list several "Add to cart" buttons. */
export function buildAddToCartPerchId(productId: string): string {
  return `add-to-cart-${productId}`;
}

export interface MascotReaction {
  readonly expression: MascotExpression;
  readonly holdMs: number;
  /** Where to go and stand, or `null` to react wherever it already is. */
  readonly perchId: string | null;
  readonly bubbleText: string;
}

const SIGNAL_REACTION_HOLD_MS = 6_000;

/**
 * THE COPY HERE IS HELD TO THE MONEY RULE. An order placed is `pending_payment`, which is not paid,
 * so its line says the order exists and how it settles, never "paid" or "bought". Only
 * `payment_settled` speaks of a payment, and it attributes the verdict to the provider that gave it.
 * A submission is sent for review, never "published": a moderator decides that.
 * No exclamation marks and no em dashes: the mascot is cheerful in its face, not in its prose.
 */
export function resolveSignalReaction(signal: AssistantSignal): MascotReaction {
  switch (signal.kind) {
    case "order_placed":
      return {
        expression: "joy",
        holdMs: SIGNAL_REACTION_HOLD_MS,
        perchId: CHECKOUT_CONFIRMED_PERCH_ID,
        bubbleText:
          signal.orderCount === 1
            ? "Order placed. You settle with the seller directly."
            : "Orders placed. You settle with each seller directly.",
      };
    case "payment_settled":
      return {
        expression: "excited",
        holdMs: SIGNAL_REACTION_HOLD_MS,
        perchId: null,
        bubbleText: "The payment provider confirmed this payment as settled.",
      };
    case "cart_item_added":
      return {
        expression: "joy",
        holdMs: SIGNAL_REACTION_HOLD_MS,
        perchId: buildAddToCartPerchId(signal.productId),
        bubbleText: "Added to your cart.",
      };
    case "submission_received":
      return {
        expression: "enlightened",
        holdMs: SIGNAL_REACTION_HOLD_MS,
        perchId: SUBMISSION_RECEIPT_PERCH_ID,
        bubbleText: "Sent for review. A moderator reads it before anyone else sees it.",
      };
    default: {
      const exhaustiveCheck: never = signal;
      return exhaustiveCheck;
    }
  }
}
