"use client";

import { useState } from "react";

import AddressSheet, { MAX_SAVED_ADDRESSES } from "@/components/home/store/sheets/address-sheet";

import type { Address } from "@/types/store";

// "Deliver to" row on the product page. UI-only mock — these addresses will come
// from the backend API later (the client never owns address truth). For now the
// list lives in local state so the Change sheet can select / add / edit.

const MOCK_ADDRESSES: Address[] = [
  {
    id: "address-1",
    recipientName: "Vidyesh Bipin Churi",
    pincode: "401301",
    label: "HOME",
    fullAddress:
      "1457, Vinay house, Agashi-Crossnaka, near cross naka bus stop, Virar west, Tal: Vasai, Dist: Palghar",
  },
  {
    id: "address-2",
    recipientName: "Vidyesh Churi",
    pincode: "400001",
    label: "WORK",
    fullAddress: "12th floor, Maker Chambers, Nariman Point, Mumbai, Dist: Mumbai City",
  },
];

export default function DeliverTo() {
  const [addresses, setAddresses] = useState<Address[]>(MOCK_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(MOCK_ADDRESSES[0].id);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const selectedAddress =
    addresses.find((address) => address.id === selectedAddressId) ?? addresses[0];

  const handleSaveAddress = (values: Omit<Address, "id">, editingId: string | null) => {
    if (editingId) {
      setAddresses((previous) =>
        previous.map((address) => (address.id === editingId ? { ...address, ...values } : address)),
      );
      return;
    }

    if (addresses.length >= MAX_SAVED_ADDRESSES) return;

    const newAddressId = `address-${addresses.length + 1}-${values.pincode}`;
    setAddresses((previous) => [...previous, { id: newAddressId, ...values }]);
    setSelectedAddressId(newAddressId);
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 lg:px-6">
        <div className="flex-1 text-xs">
          <p className="flex items-center gap-0.75">
            <span className="text-[#191C1C]">Deliver to:</span>
            <span className="flex-1 truncate text-black">{selectedAddress.recipientName}</span>
            <span className="text-black">,{selectedAddress.pincode}</span>
            <span className="rounded bg-[#D6E3FF] p-1 leading-4 text-[#191C1C]">
              {selectedAddress.label}
            </span>
          </p>
          <p className="mt-0.5 text-black">{selectedAddress.fullAddress}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsSheetOpen(true)}
          className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          Change
        </button>
      </div>

      {isSheetOpen && (
        <AddressSheet
          addresses={addresses}
          selectedAddressId={selectedAddressId}
          onSelectAddress={setSelectedAddressId}
          onSaveAddress={handleSaveAddress}
          onClose={() => setIsSheetOpen(false)}
        />
      )}
    </>
  );
}
