"use client";

import { useEffect, useRef, useState } from "react";

import Image from "next/image";

// Address management bottom sheet for the product page (UI-only phase, no fetch).
// Two modes: a list of saved addresses (select one, edit, or add) and a form
// (add a new address or edit an existing one). Backed by parent state — when
// the backend phase starts these callbacks call the Express API instead.

export type AddressLabel = "HOME" | "WORK" | "OTHER";

export type Address = {
  id: string;
  recipientName: string;
  pincode: string;
  fullAddress: string;
  label: AddressLabel;
};

export const MAX_SAVED_ADDRESSES = 5;

const ADDRESS_LABELS: AddressLabel[] = ["HOME", "WORK", "OTHER"];

type SheetMode = { view: "list" } | { view: "form"; editing: Address | null };

const EMPTY_FORM: Omit<Address, "id"> = {
  recipientName: "",
  pincode: "",
  fullAddress: "",
  label: "HOME",
};

function AddressRadio({
  address,
  isSelected,
  onSelect,
  onEdit,
}: {
  address: Address;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${
        isSelected ? "border-[#00696E] bg-[#00696E]/5" : "border-[#CAC4D0]/60"
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={isSelected}
        aria-label={`Deliver to ${address.recipientName}`}
        className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-[#6F7979]"
      >
        {isSelected && <span className="size-2.5 rounded-full bg-[#00696E]" />}
      </button>

      <button type="button" onClick={onSelect} className="flex-1 text-left text-xs">
        <p className="flex items-center gap-2 font-medium">
          {address.recipientName}, {address.pincode}
          <span className="rounded bg-[#D6E3FF] px-1 py-0.5 text-[11px] font-medium text-[#191C1C]">
            {address.label}
          </span>
        </p>
        <p className="mt-0.5 text-[#6F7979]">{address.fullAddress}</p>
      </button>

      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-sm font-medium text-[#00696E]"
      >
        Edit
      </button>
    </div>
  );
}

function AddressForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: Address | null;
  onCancel: () => void;
  onSubmit: (values: Omit<Address, "id">) => void;
}) {
  const [values, setValues] = useState<Omit<Address, "id">>(
    initial
      ? {
          recipientName: initial.recipientName,
          pincode: initial.pincode,
          fullAddress: initial.fullAddress,
          label: initial.label,
        }
      : EMPTY_FORM,
  );

  const isValid =
    values.recipientName.trim() !== "" &&
    values.pincode.trim() !== "" &&
    values.fullAddress.trim() !== "";

  const inputClass =
    "w-full rounded-lg border border-[#6F7979] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#00696E]";

  return (
    <form
      className="flex flex-col gap-4 px-4 pb-6"
      onSubmit={(submitEvent) => {
        submitEvent.preventDefault();
        if (isValid) onSubmit(values);
      }}
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#6F7979]">Full name</span>
        <input
          type="text"
          aria-label="Full name"
          value={values.recipientName}
          onChange={(changeEvent) =>
            setValues((previous) => ({ ...previous, recipientName: changeEvent.target.value }))
          }
          placeholder="Recipient name"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#6F7979]">Pincode</span>
        <input
          type="text"
          inputMode="numeric"
          aria-label="Pincode"
          value={values.pincode}
          onChange={(changeEvent) =>
            setValues((previous) => ({ ...previous, pincode: changeEvent.target.value }))
          }
          placeholder="401301"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#6F7979]">Address</span>
        <textarea
          aria-label="Address"
          value={values.fullAddress}
          onChange={(changeEvent) =>
            setValues((previous) => ({ ...previous, fullAddress: changeEvent.target.value }))
          }
          placeholder="House no, building, area, city, district"
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[#6F7979]">Save as</span>
        <div className="flex gap-2">
          {ADDRESS_LABELS.map((addressLabel) => {
            const isActive = values.label === addressLabel;
            return (
              <button
                key={addressLabel}
                type="button"
                onClick={() => setValues((previous) => ({ ...previous, label: addressLabel }))}
                className={`rounded-full border px-4 py-1.5 text-xs font-medium ${
                  isActive
                    ? "border-[#00696E] bg-[#00696E]/5 text-[#00696E]"
                    : "border-[#6F7979] text-[#191C1C]"
                }`}
              >
                {addressLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!isValid}
          className="flex-1 rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Save address
        </button>
      </div>
    </form>
  );
}

// Bottom sheet on mobile, centered modal on desktop — mirrors CommentSheet /
// ShareSheet shells. Dismiss on backdrop tap, Escape, or the X.
export default function AddressSheet({
  addresses,
  selectedAddressId,
  onSelectAddress,
  onSaveAddress,
  onClose,
}: {
  addresses: Address[];
  selectedAddressId: string;
  onSelectAddress: (addressId: string) => void;
  onSaveAddress: (values: Omit<Address, "id">, editingId: string | null) => void;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<SheetMode>({ view: "list" });

  useEffect(() => {
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const isAtAddressLimit = addresses.length >= MAX_SAVED_ADDRESSES;
  const isFormView = mode.view === "form";

  return (
    <>
      <button
        type="button"
        aria-label="Close addresses"
        onClick={onClose}
        className="fixed inset-0 z-55 bg-black/40"
      />

      <div
        ref={panelRef}
        aria-label="Delivery addresses"
        className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
      >
        {/* Drag handle — mobile affordance only. */}
        <div className="flex justify-center pt-3 sm:hidden">
          <span className="h-1.5 w-10 rounded-full bg-black/15" />
        </div>

        <header className="flex shrink-0 flex-row items-center gap-2 px-4 py-3">
          {isFormView && (
            <button
              type="button"
              onClick={() => setMode({ view: "list" })}
              aria-label="Back to address list"
              className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
            >
              <Image
                src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                alt=""
                width={24}
                height={24}
              />
            </button>
          )}
          <h2 className="flex-1 text-base font-medium">
            {mode.view === "form"
              ? mode.editing
                ? "Edit address"
                : "Add new address"
              : "Select delivery address"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
          >
            <Image
              src="/icons/close_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
              alt=""
              width={24}
              height={24}
            />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          {mode.view === "list" ? (
            <div className="flex flex-col gap-3 px-4 pb-6">
              {addresses.map((address) => (
                <AddressRadio
                  key={address.id}
                  address={address}
                  isSelected={address.id === selectedAddressId}
                  onSelect={() => {
                    onSelectAddress(address.id);
                    onClose();
                  }}
                  onEdit={() => setMode({ view: "form", editing: address })}
                />
              ))}

              <button
                type="button"
                disabled={isAtAddressLimit}
                onClick={() => setMode({ view: "form", editing: null })}
                className="rounded-full border border-dashed border-[#6F7979] px-4 py-2.5 text-sm font-medium text-[#00696E] disabled:opacity-40"
              >
                + Add new address
              </button>

              <p className="text-center text-[11px] text-[#6F7979]">
                {isAtAddressLimit
                  ? `You can save up to ${MAX_SAVED_ADDRESSES} addresses.`
                  : `${addresses.length} of ${MAX_SAVED_ADDRESSES} addresses saved.`}
              </p>
            </div>
          ) : (
            <AddressForm
              initial={mode.editing}
              onCancel={() => setMode({ view: "list" })}
              onSubmit={(values) => {
                onSaveAddress(values, mode.editing?.id ?? null);
                setMode({ view: "list" });
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
