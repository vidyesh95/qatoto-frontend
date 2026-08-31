// TRANSPORT: client-query — reads GET /commerce/provider/earnings through SellerEarningsPanel.
"use client";

// WHAT YOU HAVE BEEN PAID. This route was a `StudioPlannedPage` stub whose "instead" link pointed
// at `/studio/sales`, which is where the earnings panel actually lived. That was backwards: Sales
// is about ORDERS, and the one page in the studio named after money rendered a card saying it did
// not exist yet. The panel moved here and the stub is gone.
//
// THE PAGE IS DELIBERATELY THIN. Every figure, every empty state and the "profit and margin are
// not shown" card belong to `SellerEarningsPanel`, which is also mounted nowhere else — keeping
// the copy in one component is what stops two surfaces disagreeing about what a seller earned.
//
// STILL NOT SHOWN AND STILL NOT FAKED: profit. Nothing in this platform records what a seller PAID
// for their goods — no cost-of-goods column, no purchase record, no link from a listing to the
// quote that sourced it — so margin has no input. The panel says so in as many words.
//
// NOTE WHAT "EARN" DOES NOT YET COVER. The roadmap entry promised video monetisation and payouts
// beside seller revenue. Neither exists: there is no entitlement model and no payout rail. This
// page is the half that is real, and it does not imply the other half by silence.

import SellerEarningsPanel from "@/components/commerce/sections/seller-earnings-panel";

export default function EarnPage() {
  return (
    <div className="mx-auto w-full max-w-4xl pb-10">
      <header className="px-4 pt-4 lg:px-6">
        <h1 className="font-serif text-2xl font-semibold text-foreground md:text-3xl">Earn</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          What has settled to you, what came back, and what nobody has counted yet.
        </p>
      </header>

      <section aria-label="What you have been paid" className="mt-4 px-4 lg:px-6">
        <SellerEarningsPanel />
      </section>
    </div>
  );
}
