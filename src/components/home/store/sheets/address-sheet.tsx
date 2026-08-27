// TRANSPORT: client-query — reads and writes the organization's saved addresses.
//
// Two views: a list of saved delivery addresses, and a form to add or edit one.
//
// AN ADDRESS BELONGS TO AN ORGANIZATION, NOT A USER. There is no user-scoped address table
// anywhere, because order parties and thread participants are both derived from organization
// memberships. That collided with `commerce_organization.tradeState`, which starts `pending` and
// only a staff decision makes `active` — so a new buyer's first saved address would have sat behind
// human verification. The backend settled it (§14): a pending organization is AUTO-PROVISIONED on
// the first buyer action that needs one, and trust gates stay where they earn something — checkout
// confirm, RFQ broadcast — rather than in front of one tap.
//
// THREE THINGS THE OLD FORM GOT WRONG, all now fixed:
//   - NO COUNTRY FIELD. `country_code` is NOT NULL on the table, so every address that form could
//     produce would have been refused — and a form that cannot express a country cannot address an
//     international delivery, on a cross-border sourcing platform.
//   - A CAP OF FIVE. The server's is TEN, per kind, and its refusal names the kind.
//   - `label: HOME | WORK | OTHER`, a personal-address idiom with no wire equivalent. The wire's
//     `addressKind` is `billing | registered | warehouse | pickup | return | delivery`; `label` is
//     a free-text nickname beside it, which is where "Head office" now goes.
//
// THERE IS NO DELETE, deliberately: an address can be referenced by an order that already shipped
// to it, so the row survives and editing is how a stale one stops being used.
"use client";

import { useState } from "react";

import { COUNTRY_OPTIONS } from "@/components/home/account/menus/location-menu";
import MutationNotice from "@/components/home/store/shared/mutation-notice";
import ModalSheet from "@/components/home/shared/modal-sheet";
import {
  useCreateOrganizationAddress,
  useUpdateOrganizationAddress,
} from "@/hooks/store/addresses";
import { useResettableAttemptIdempotencyKey } from "@/hooks/use-attempt-idempotency-key";
import {
  formatAddressLines,
  MAXIMUM_ADDRESSES_PER_KIND,
  type OrganizationAddress,
  type UpsertOrganizationAddressInput,
} from "@/lib/store/addresses.schemas";

type SheetMode = { view: "list" } | { view: "form"; editing: OrganizationAddress | null };

interface AddressFormValues {
  readonly label: string;
  readonly recipientName: string;
  readonly countryCode: string;
  readonly locality: string;
  readonly regionCode: string;
  readonly postalCode: string;
  readonly addressLineOne: string;
  readonly addressLineTwo: string;
  readonly phone: string;
}

const EMPTY_FORM: AddressFormValues = {
  label: "",
  recipientName: "",
  countryCode: "",
  locality: "",
  regionCode: "",
  postalCode: "",
  addressLineOne: "",
  addressLineTwo: "",
  phone: "",
};

function formValuesFrom(address: OrganizationAddress): AddressFormValues {
  return {
    label: address.label ?? "",
    recipientName: address.recipientName ?? "",
    countryCode: address.countryCode,
    locality: address.locality,
    regionCode: address.regionCode ?? "",
    postalCode: address.postalCode ?? "",
    addressLineOne: address.addressLineOne ?? "",
    addressLineTwo: address.addressLineTwo ?? "",
    phone: address.phone ?? "",
  };
}

/**
 * A blank optional field is OMITTED from the body, never sent as `""`.
 *
 * Sending an empty string for a line the buyer left alone would overwrite a stored value with
 * emptiness, which on a `PATCH` is data loss rather than a no-op.
 */
function optionalText(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function buildUpsertInput(values: AddressFormValues): UpsertOrganizationAddressInput {
  return {
    addressKind: "delivery",
    countryCode: values.countryCode,
    locality: values.locality.trim(),
    ...(optionalText(values.label) === undefined ? {} : { label: optionalText(values.label) }),
    ...(optionalText(values.regionCode) === undefined
      ? {}
      : { regionCode: optionalText(values.regionCode) }),
    ...(optionalText(values.postalCode) === undefined
      ? {}
      : { postalCode: optionalText(values.postalCode) }),
    ...(optionalText(values.recipientName) === undefined
      ? {}
      : { recipientName: optionalText(values.recipientName) }),
    ...(optionalText(values.addressLineOne) === undefined
      ? {}
      : { addressLineOne: optionalText(values.addressLineOne) }),
    ...(optionalText(values.addressLineTwo) === undefined
      ? {}
      : { addressLineTwo: optionalText(values.addressLineTwo) }),
    ...(optionalText(values.phone) === undefined ? {} : { phone: optionalText(values.phone) }),
  };
}

function TextField({
  label,
  value,
  onChange,
  isRequired = false,
  placeholder,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly isRequired?: boolean;
  readonly placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[#6F7979]">
        {label}
        {isRequired && <span className="text-[#8C1D18]"> *</span>}
      </span>
      <input
        type="text"
        value={value}
        required={isRequired}
        placeholder={placeholder}
        onChange={(changeEvent) => onChange(changeEvent.target.value)}
        className="rounded border border-[#CAC4D0] px-3 py-2 text-sm text-[#191C1C] focus:outline-[#2A76FD]"
      />
    </label>
  );
}

export default function AddressSheet({
  organizationId,
  addresses,
  selectedAddressId,
  onSelectAddress,
  onClose,
}: {
  readonly organizationId: string | null;
  readonly addresses: readonly OrganizationAddress[];
  readonly selectedAddressId: string | null;
  readonly onSelectAddress: (addressId: string) => void;
  readonly onClose: () => void;
}) {
  const [mode, setMode] = useState<SheetMode>({ view: "list" });
  const [formValues, setFormValues] = useState<AddressFormValues>(EMPTY_FORM);

  const createAddress = useCreateOrganizationAddress(organizationId);
  const updateAddress = useUpdateOrganizationAddress(organizationId);
  // Rotated only after a confirmed success — a retry of a failed attempt must reuse its key.
  const { getIdempotencyKey, resetIdempotencyKey } = useResettableAttemptIdempotencyKey();

  const isAtCap = addresses.length >= MAXIMUM_ADDRESSES_PER_KIND;
  const isSaving = createAddress.isPending || updateAddress.isPending;

  const setField = (field: keyof AddressFormValues) => (value: string) =>
    setFormValues((previous) => ({ ...previous, [field]: value }));

  const handleSubmit = (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();
    if (organizationId === null) return;
    const input = buildUpsertInput(formValues);
    const idempotencyKey = getIdempotencyKey();

    const editing = mode.view === "form" ? mode.editing : null;
    const onSettled = (result: { success: boolean }) => {
      if (!result.success) return;
      resetIdempotencyKey();
      setMode({ view: "list" });
      setFormValues(EMPTY_FORM);
    };

    if (editing === null) {
      createAddress.mutate({ input, idempotencyKey }, { onSuccess: onSettled });
    } else {
      updateAddress.mutate(
        { addressId: editing.id, input, idempotencyKey },
        { onSuccess: onSettled },
      );
    }
  };

  if (mode.view === "form") {
    return (
      <ModalSheet
        title={mode.editing === null ? "Add delivery address" : "Edit delivery address"}
        onClose={onClose}
        leadingAction={
          <button
            type="button"
            onClick={() => setMode({ view: "list" })}
            className="cursor-pointer px-1 text-sm font-medium text-[#00696E]"
          >
            Back
          </button>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 px-4 pb-6">
          <TextField
            label="Nickname"
            value={formValues.label}
            onChange={setField("label")}
            placeholder="Head office"
          />
          <TextField
            label="Recipient name"
            value={formValues.recipientName}
            onChange={setField("recipientName")}
          />

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[#6F7979]">
              Country<span className="text-[#8C1D18]"> *</span>
            </span>
            <select
              required
              value={formValues.countryCode}
              onChange={(changeEvent) => setField("countryCode")(changeEvent.target.value)}
              className="rounded border border-[#CAC4D0] px-3 py-2 text-sm text-[#191C1C]"
            >
              <option value="">Choose a country…</option>
              {COUNTRY_OPTIONS.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <TextField
            label="City or town"
            value={formValues.locality}
            onChange={setField("locality")}
            isRequired
          />
          <TextField
            label="State or region"
            value={formValues.regionCode}
            onChange={setField("regionCode")}
          />
          <TextField
            label="Postal code"
            value={formValues.postalCode}
            onChange={setField("postalCode")}
          />
          <TextField
            label="Address line 1"
            value={formValues.addressLineOne}
            onChange={setField("addressLineOne")}
          />
          <TextField
            label="Address line 2"
            value={formValues.addressLineTwo}
            onChange={setField("addressLineTwo")}
          />
          <TextField label="Phone" value={formValues.phone} onChange={setField("phone")} />

          <button
            type="submit"
            disabled={isSaving || organizationId === null}
            className="mt-2 rounded-full bg-[#00696E] px-6 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {isSaving ? "Saving…" : "Save address"}
          </button>

          <MutationNotice
            result={mode.editing === null ? createAddress.data : updateAddress.data}
            fallbackMessage="Couldn't save that address."
            hasThrown={createAddress.isError || updateAddress.isError}
          />
        </form>
      </ModalSheet>
    );
  }

  return (
    <ModalSheet title="Delivery address" onClose={onClose}>
      <div className="flex flex-col gap-2 px-4 pb-6">
        {addresses.length === 0 && (
          <p className="rounded-lg bg-[#F2F4F4] px-3 py-4 text-sm leading-5 text-[#6F7979]">
            No delivery addresses saved yet.
          </p>
        )}

        {addresses.map((address) => {
          const isSelected = address.id === selectedAddressId;
          return (
            <div
              key={address.id}
              className={`flex items-start gap-3 rounded-lg border px-3 py-3 ${
                isSelected ? "border-[#00696E] bg-[#00696E]/5" : "border-[#CAC4D0]"
              }`}
            >
              <input
                type="radio"
                name="delivery-address"
                checked={isSelected}
                onChange={() => {
                  onSelectAddress(address.id);
                  onClose();
                }}
                aria-label={address.label ?? formatAddressLines(address)}
                className="mt-1 size-4 shrink-0 accent-[#00696E]"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[#191C1C]">
                  {address.recipientName ?? address.label ?? "Delivery address"}
                  {address.isDefault && (
                    <span className="ml-2 rounded bg-[#D6E3FF] px-1.5 py-0.5 text-[11px] font-medium text-[#191C1C]">
                      Default
                    </span>
                  )}
                </p>
                <p className="text-xs leading-4 text-[#6F7979]">{formatAddressLines(address)}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFormValues(formValuesFrom(address));
                  setMode({ view: "form", editing: address });
                }}
                className="shrink-0 text-xs font-medium text-[#00696E]"
              >
                Edit
              </button>
            </div>
          );
        })}

        <button
          type="button"
          disabled={isAtCap || organizationId === null}
          onClick={() => {
            setFormValues(EMPTY_FORM);
            setMode({ view: "form", editing: null });
          }}
          className="mt-1 rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#00696E] disabled:opacity-40"
        >
          + Add new address
        </button>

        <p className="text-[11px] leading-4 text-[#6F7979]">
          {addresses.length} of {MAXIMUM_ADDRESSES_PER_KIND} delivery addresses saved.
        </p>
      </div>
    </ModalSheet>
  );
}
