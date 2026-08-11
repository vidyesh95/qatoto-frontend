// TRANSPORT: client-query — reads the organization's saved delivery addresses.
//
// The "Deliver to" row. Shows the selected saved address and opens the sheet to change it.
//
// THE ADDRESSES ARE THE ORGANIZATION'S, FETCHED. This used to hold two hardcoded personal
// addresses in `useState` that evaporated on unmount — fabricated, PII-shaped data on a page that
// otherwise renders a real seller's real terms. They belong to a buyer ORGANIZATION, which is
// auto-provisioned on the first action that needs one, so a signed-in visitor has somewhere to save
// one without filling in a company form first.
//
// A SIGNED-OUT VISITOR SEES THE PROMPT, NOT AN EMPTY ROW. The read is gated on the session, because
// without one it can only come back 401 — and an anonymous visitor firing an authenticated request
// on every product view is a request that exists to fail.
"use client";

import { useState } from "react";

import Link from "next/link";

import AddressSheet from "@/components/home/store/sheets/address-sheet";
import { useOrganizationAddressesQuery, useViewerOrganizationId } from "@/hooks/store/addresses";
import { useSession } from "@/lib/auth-client";
import { formatAddressLines, type OrganizationAddress } from "@/lib/store/addresses.schemas";

export default function DeliverTo() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);

  const { data: session, isPending: isSessionPending } = useSession();
  const isSignedIn = session !== null && session !== undefined;

  const organizationId = useViewerOrganizationId();
  const addressesQuery = useOrganizationAddressesQuery(isSignedIn ? organizationId : null);

  const result = addressesQuery.data;
  const allAddresses = result !== undefined && result.success ? result.data : [];
  // Only delivery addresses belong on this row. The other kinds are the seller's own operations —
  // where goods ship from, where returns go — and are not places a buyer's order can be sent.
  const deliveryAddresses = allAddresses.filter((address) => address.addressKind === "delivery");

  const selectedAddress: OrganizationAddress | null =
    deliveryAddresses.find((address) => address.id === selectedAddressId) ??
    deliveryAddresses.find((address) => address.isDefault) ??
    deliveryAddresses[0] ??
    null;

  if (!isSessionPending && !isSignedIn) {
    return (
      <div className="px-4 py-2 text-xs leading-4 text-[#6F7979] lg:px-6">
        <Link href="/sign-in" className="font-medium text-[#00696E]">
          Sign in
        </Link>{" "}
        to use a saved delivery address.
      </div>
    );
  }

  return (
    <>
      <div className="flex items-start gap-2 px-4 py-2 lg:px-6">
        <div className="min-w-0 flex-1">
          {selectedAddress === null ? (
            <p className="text-sm text-[#191C1C]">
              {addressesQuery.isPending ? "Loading addresses…" : "No delivery address saved"}
            </p>
          ) : (
            <>
              <p className="truncate text-sm text-[#191C1C]">
                Deliver to:{" "}
                <span className="font-medium">
                  {selectedAddress.recipientName ?? selectedAddress.label ?? "Saved address"}
                </span>
              </p>
              <p className="truncate text-xs leading-4 text-[#6F7979]">
                {formatAddressLines(selectedAddress)}
              </p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsSheetOpen(true)}
          className="shrink-0 text-xs font-medium text-[#00696E]"
        >
          {selectedAddress === null ? "Add" : "Change"}
        </button>
      </div>

      {isSheetOpen && (
        <AddressSheet
          organizationId={organizationId}
          addresses={deliveryAddresses}
          selectedAddressId={selectedAddress?.id ?? null}
          onSelectAddress={setSelectedAddressId}
          onClose={() => setIsSheetOpen(false)}
        />
      )}
    </>
  );
}
