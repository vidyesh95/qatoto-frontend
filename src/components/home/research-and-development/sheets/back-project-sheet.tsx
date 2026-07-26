"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import { formatMoneyFromCents } from "@/components/home/research-and-development/sections/compensation-format";
import { INPUT_CLASS } from "@/components/ui/field-classes";

// Self-contained "back this project" trigger + bottom sheet (§8.3, extended per
// §14.6 with tiers and multi-currency). Mock phase: confirming flips the trigger
// to "Backed ✓" in local state only, and funding progress bars deliberately do
// NOT move.
//
// Copy rule, non-negotiable: a pledge is a **commitment**, not a charge. Qatoto
// holds no funds, charges nobody and operates no payment rail in this domain, so
// nothing here may imply money moves. The founder contacts backers directly.

type PledgeTier = {
  key: string;
  displayLabel: string;
  amountInCents: number;
  commitmentNote: string;
};

// Ladders are authored per currency rather than converted from a base — a
// converted "$50" reads as an odd number in every other market, and FX drift
// would silently change what a tier means.
const PLEDGE_TIERS_BY_CURRENCY: Record<string, PledgeTier[]> = {
  USD: [
    {
      key: "supporter",
      displayLabel: "Supporter",
      amountInCents: 5000,
      commitmentNote: "Name on the backer wall.",
    },
    {
      key: "believer",
      displayLabel: "Believer",
      amountInCents: 10000,
      commitmentNote: "Backer wall + monthly build letter.",
    },
    {
      key: "champion",
      displayLabel: "Champion",
      amountInCents: 25000,
      commitmentNote: "Above + a seat on the quarterly team call.",
    },
    {
      key: "patron",
      displayLabel: "Patron",
      amountInCents: 100000,
      commitmentNote: "Above + first access to the pilot unit.",
    },
  ],
  EUR: [
    {
      key: "supporter",
      displayLabel: "Supporter",
      amountInCents: 5000,
      commitmentNote: "Name on the backer wall.",
    },
    {
      key: "believer",
      displayLabel: "Believer",
      amountInCents: 10000,
      commitmentNote: "Backer wall + monthly build letter.",
    },
    {
      key: "champion",
      displayLabel: "Champion",
      amountInCents: 25000,
      commitmentNote: "Above + a seat on the quarterly team call.",
    },
    {
      key: "patron",
      displayLabel: "Patron",
      amountInCents: 100000,
      commitmentNote: "Above + first access to the pilot unit.",
    },
  ],
  KES: [
    {
      key: "supporter",
      displayLabel: "Supporter",
      amountInCents: 500000,
      commitmentNote: "Name on the backer wall.",
    },
    {
      key: "believer",
      displayLabel: "Believer",
      amountInCents: 1500000,
      commitmentNote: "Backer wall + monthly build letter.",
    },
    {
      key: "champion",
      displayLabel: "Champion",
      amountInCents: 3000000,
      commitmentNote: "Above + a seat on the quarterly team call.",
    },
    {
      key: "patron",
      displayLabel: "Patron",
      amountInCents: 10000000,
      commitmentNote: "Above + first access to the pilot unit.",
    },
  ],
  INR: [
    {
      key: "supporter",
      displayLabel: "Supporter",
      amountInCents: 400000,
      commitmentNote: "Name on the backer wall.",
    },
    {
      key: "believer",
      displayLabel: "Believer",
      amountInCents: 800000,
      commitmentNote: "Backer wall + monthly build letter.",
    },
    {
      key: "champion",
      displayLabel: "Champion",
      amountInCents: 2000000,
      commitmentNote: "Above + a seat on the quarterly team call.",
    },
    {
      key: "patron",
      displayLabel: "Patron",
      amountInCents: 8000000,
      commitmentNote: "Above + first access to the pilot unit.",
    },
  ],
};

const SUPPORTED_CURRENCIES = Object.keys(PLEDGE_TIERS_BY_CURRENCY);

const CENTS_PER_UNIT = 100;

type BackProjectSheetProps = {
  projectName: string;
};

export default function BackProjectSheet({ projectName }: BackProjectSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasBacked, setHasBacked] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(SUPPORTED_CURRENCIES[0]);
  const [selectedTierKey, setSelectedTierKey] = useState<string | null>("believer");
  const [customAmountInUnits, setCustomAmountInUnits] = useState("");

  useEffect(() => {
    if (!isSheetOpen) return undefined;
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === "Escape") setIsSheetOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isSheetOpen]);

  const availableTiers = PLEDGE_TIERS_BY_CURRENCY[selectedCurrency] ?? [];
  const parsedCustomAmount = Number(customAmountInUnits);
  const hasCustomAmount =
    customAmountInUnits.trim() !== "" &&
    Number.isFinite(parsedCustomAmount) &&
    parsedCustomAmount > 0;
  const selectedTier = availableTiers.find((tier) => tier.key === selectedTierKey);
  const pledgeAmountInCents = hasCustomAmount
    ? Math.round(parsedCustomAmount * CENTS_PER_UNIT)
    : (selectedTier?.amountInCents ?? 0);
  const isPledgeValid = pledgeAmountInCents > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsSheetOpen(true)}
        className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium ${
          hasBacked ? "bg-[#00696E]/10 text-[#00696E]" : "bg-primary text-primary-foreground"
        }`}
      >
        {hasBacked ? "Backed ✓" : "Back this project"}
      </button>

      {isSheetOpen && (
        <>
          <button
            type="button"
            aria-label="Close back project sheet"
            onClick={() => setIsSheetOpen(false)}
            className="fixed inset-0 z-55 bg-black/40"
          />

          <div
            aria-label={`Back ${projectName}`}
            className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
          >
            {/* Drag handle — mobile affordance only. */}
            <div className="flex justify-center pt-3 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-black/15" />
            </div>

            <header className="flex shrink-0 items-center gap-2 px-4 py-3">
              <h2 className="flex-1 truncate text-base font-medium">Back {projectName}</h2>
              <button
                type="button"
                onClick={() => setIsSheetOpen(false)}
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
              {hasBacked ? (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-[#00696E]/10 text-2xl text-[#00696E]">
                    ✓
                  </span>
                  <p className="text-base font-medium">You committed to {projectName}</p>
                  <p className="text-sm text-muted-foreground">
                    Mock phase: your commitment lives in this session only, nothing was charged, and
                    the funding bar doesn&apos;t move.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSheetOpen(false)}
                    className="mt-2 cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form
                  className="flex flex-col gap-4 px-4 pb-6"
                  onSubmit={(submitEvent) => {
                    submitEvent.preventDefault();
                    if (isPledgeValid) setHasBacked(true);
                  }}
                >
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-[#6F7979]">Currency</span>
                    <div className="flex flex-wrap gap-2">
                      {SUPPORTED_CURRENCIES.map((currency) => (
                        <button
                          key={currency}
                          type="button"
                          aria-pressed={selectedCurrency === currency}
                          onClick={() => setSelectedCurrency(currency)}
                          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            selectedCurrency === currency
                              ? "bg-[#00696E] text-white"
                              : "bg-muted hover:bg-muted/70"
                          }`}
                        >
                          {currency}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-[#6F7979]">Tier</span>
                    <div className="space-y-2">
                      {availableTiers.map((tier) => {
                        const isTierSelected = selectedTierKey === tier.key && !hasCustomAmount;
                        return (
                          <button
                            key={tier.key}
                            type="button"
                            aria-pressed={isTierSelected}
                            onClick={() => {
                              setSelectedTierKey(tier.key);
                              setCustomAmountInUnits("");
                            }}
                            className={`flex w-full cursor-pointer flex-col gap-0.5 rounded-2xl border p-3 text-left transition-colors ${
                              isTierSelected
                                ? "border-[#00696E] bg-[#00696E]/5"
                                : "border-[#CAC4D0]/60 hover:bg-muted/40"
                            }`}
                          >
                            <span className="flex items-center justify-between text-sm font-medium">
                              {tier.displayLabel}
                              <span>
                                {formatMoneyFromCents(tier.amountInCents, selectedCurrency)}
                              </span>
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {tier.commitmentNote}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={customAmountInUnits}
                      onChange={(changeEvent) => setCustomAmountInUnits(changeEvent.target.value)}
                      placeholder={`Custom amount (${selectedCurrency})`}
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-[#00696E]/5 p-4">
                    <Image
                      src="/icons/verified_24dp_00696E_FILL1_wght400_GRAD0_opsz24.svg"
                      alt=""
                      width={24}
                      height={24}
                      className="shrink-0"
                    />
                    <p className="text-xs text-muted-foreground">
                      This is a <span className="font-medium text-foreground">commitment</span>, not
                      a payment. Qatoto collects nothing, holds nothing and charges no fee — the
                      founder contacts you directly to arrange it if the round closes.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!isPledgeValid}
                    className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Commit
                    {isPledgeValid
                      ? ` · ${formatMoneyFromCents(pledgeAmountInCents, selectedCurrency)}`
                      : ""}
                  </button>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
