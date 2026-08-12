// TRANSPORT: client-query — reads GET /commerce/organizations/mine and writes the country
// declaration through PATCH /commerce/organizations/:organizationId.
"use client";

// WHAT THIS EXISTS TO PREVENT: a buyer filling a cart, pricing it, reserving stock, and then being
// told `403` with no explanation and nothing to press.
//
// A37 made the buyer path start for a brand-new account — the first cart call mints a `pending`
// workspace and the cart, the delivery estimate and `checkout/prepare` all run on it. Confirm does
// not: it keeps `requireActiveBuyerCommerceOrganization`, because §14's rule is that a cart is a
// draft and an order is not. And a `pending` shell cannot become `active` on its own, because it was
// minted with no country and `commerce_organization_country_pending_ck` refuses the transition
// without one.
//
// So there are exactly two things to say, and they are different sentences with different actions:
// declare a country (the buyer can do this), and wait for review (only staff can).
//
// IT NEVER CLAIMS THE BUYER CAN ACTIVATE THEMSELVES. `POST /commerce/organizations/:id/activate`
// exists and does something else entirely — it selects which organization the session acts through.
// The `pending → active` trade-state transition is `moderate_commerce`-gated staff work, so the copy
// says a person will look at it and does not offer a button that would 403.
//
// IT RENDERS NOTHING ON THE HAPPY PATH, and nothing while it does not know. A panel that appeared
// during loading would flash a warning at every buyer with a perfectly good organization.

import { useState } from "react";

import MutationNotice from "@/components/home/store/shared/mutation-notice";
import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import {
  useBuyerWorkspaceReadinessQuery,
  useUpdateCommerceOrganization,
} from "@/hooks/store/organizations";
import { newIdempotencyKey } from "@/lib/idempotency";
import type { MyCommerceOrganization } from "@/lib/store/organizations.schemas";

const PANEL_CLASS = "rounded-xl border border-[#CAC4D0]/60 bg-[#F2F4F4] px-4 py-3";

export default function BuyerWorkspaceNotice() {
  const readinessQuery = useBuyerWorkspaceReadinessQuery();
  const readiness = readinessQuery.data;

  // `isPending` AND an absent value both mean "no answer yet". The query has `retry: false`, so a
  // transport failure settles quickly and lands on `unknown`, which renders nothing either.
  if (readinessQuery.isPending || readiness === undefined) return null;

  switch (readiness.status) {
    case "unknown":
    case "ready":
      return null;
    case "country_required":
      return <CountryDeclarationForm organization={readiness.organization} />;
    case "awaiting_review":
      return (
        <div className={PANEL_CLASS}>
          <p className="text-sm leading-5 text-[#191C1C]">
            {readiness.organization.displayName} is waiting to be reviewed.
          </p>
          <p className="mt-1 text-xs leading-4 text-[#6F7979]">
            You can keep building this cart and reserve stock. Placing the order needs the review to
            finish first — someone checks it, and this is not something you can do from here.
          </p>
        </div>
      );
    case "blocked":
      return (
        <div className={PANEL_CLASS}>
          <p className="text-sm leading-5 text-[#191C1C]">
            {readiness.organizations.length === 1
              ? `${readiness.organizations[0]?.displayName} cannot trade right now.`
              : "None of your organizations can trade right now."}
          </p>
          <p className="mt-1 text-xs leading-4 text-[#6F7979]">
            Orders are on hold until that changes. Contact support if you think this is wrong.
          </p>
        </div>
      );
    case "none":
      return (
        <div className={PANEL_CLASS}>
          <p className="text-sm leading-5 text-[#191C1C]">
            You do not have a buying workspace yet.
          </p>
          {/* Honest about the mechanism: `GET /commerce/cart` is what mints the shell — the READ,
              not the first add, because `requireProvisionedBuyerCommerceWorkspace` sits in front of
              the whole cart router. Verified live. Offering a "create one" button here would
              duplicate a row the server makes on its own.

              THIS BRANCH IS NEAR-UNREACHABLE ON THE CHECKOUT PAGE and is kept anyway. The page only
              renders this notice once its own cart query has succeeded, and that query is the thing
              that mints the workspace — so by the time these words could appear, they are already
              false. It stays because `deriveBuyerWorkspaceReadiness` is not checkout-specific and
              `none` is a real state of the data; a silent gap here would be worse than copy that
              rarely runs. */}
          <p className="mt-1 text-xs leading-4 text-[#6F7979]">
            Opening your cart creates one automatically.
          </p>
        </div>
      );
    default: {
      const exhaustiveCheck: never = readiness;
      return exhaustiveCheck;
    }
  }
}

/**
 * The one control on this panel, and the only step of activation that belongs to the buyer.
 *
 * TWO-LETTER UPPERCASE, ENFORCED BEFORE THE REQUEST rather than after. The backend's schema is
 * `^[A-Z]{2}$` and `.strict()`, so `in` is a 422 rather than a coerced `IN`. Uppercasing the input
 * as it is typed is a convenience; the length check is what stops a submit that could only fail.
 *
 * THE KEY ROTATES ONLY AFTER A CONFIRMED SUCCESS. `useResettableAttemptIdempotencyKey`'s reasoning
 * applies in miniature here: this form stays mounted after it succeeds, and a key that never
 * rotated would make a genuine second edit — a buyer fixing a mistyped country — dedupe into
 * silence against the first. Rotating on FAILURE would be worse: that is the retry the key exists
 * to make safe.
 */
function CountryDeclarationForm({ organization }: { organization: MyCommerceOrganization }) {
  const [countryCode, setCountryCode] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const updateOrganization = useUpdateCommerceOrganization();

  const isSubmittable = countryCode.length === 2 && !updateOrganization.isPending;

  const handleSubmit = () => {
    if (!isSubmittable) return;
    updateOrganization.mutate(
      { organizationId: organization.id, input: { countryCode }, idempotencyKey },
      {
        onSuccess: (result) => {
          if (!result.success) return;
          setIdempotencyKey(newIdempotencyKey());
        },
      },
    );
  };

  return (
    <div className={PANEL_CLASS}>
      <p className="text-sm leading-5 text-[#191C1C]">
        Tell us where {organization.displayName} is registered.
      </p>
      <p className="mt-1 text-xs leading-4 text-[#6F7979]">
        We opened this workspace for you when you started your cart, so we do not know its country
        yet. Orders cannot be placed until it is reviewed, and the review cannot start without this.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className={LABEL_CLASS} htmlFor="buyer-workspace-country">
            Country code
          </label>
          <input
            id="buyer-workspace-country"
            className={`${INPUT_CLASS} w-24 uppercase`}
            value={countryCode}
            maxLength={2}
            autoComplete="country"
            placeholder="IN"
            onChange={(changeEvent) =>
              setCountryCode(changeEvent.target.value.toUpperCase().replace(/[^A-Z]/g, ""))
            }
          />
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isSubmittable}
          className="cursor-pointer rounded-full bg-[#00696E] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {updateOrganization.isPending ? "Saving…" : "Submit for review"}
        </button>
      </div>

      <p className="mt-1.5 text-[11px] leading-4 text-[#6F7979]">
        Two-letter country code, like IN or DE. This is also what asks a reviewer to look at the
        workspace, so it is not something you can change back yourself afterwards.
      </p>

      <MutationNotice
        result={updateOrganization.data}
        hasThrown={updateOrganization.isError}
        fallbackMessage="Couldn't reach the server. Nothing was saved."
      />
    </div>
  );
}
