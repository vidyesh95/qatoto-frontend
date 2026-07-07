"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

// Self-contained "back this project" trigger + bottom sheet (§8.3). Mock phase:
// confirming flips the trigger to "Backed ✓" in local state only — funding
// progress bars deliberately do NOT move, and every escrow figure is a static
// display. Pledges, escrow and releases are backend-owned later.

const PLEDGE_PRESETS = ["$50", "$100", "$250", "$500"];

const INPUT_CLASS =
  "w-full rounded-lg border border-[#6F7979] bg-transparent px-3 py-2 text-sm outline-none focus:border-[#00696E]";

type BackProjectSheetProps = {
  projectName: string;
};

export default function BackProjectSheet({ projectName }: BackProjectSheetProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasBacked, setHasBacked] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(PLEDGE_PRESETS[1]);
  const [customAmount, setCustomAmount] = useState("");

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

  const pledgeAmountLabel = customAmount.trim() !== "" ? `$${customAmount.trim()}` : selectedPreset;
  const isPledgeValid = pledgeAmountLabel !== null;

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
                  <p className="text-base font-medium">You backed {projectName}</p>
                  <p className="text-sm text-muted-foreground">
                    Mock phase: your pledge lives in this session only and the funding bar
                    doesn&apos;t move.
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
                    <span className="text-xs font-medium text-[#6F7979]">Pledge amount</span>
                    <div className="flex flex-wrap gap-2">
                      {PLEDGE_PRESETS.map((presetAmount) => {
                        const isPresetSelected =
                          selectedPreset === presetAmount && customAmount.trim() === "";
                        return (
                          <button
                            key={presetAmount}
                            type="button"
                            aria-pressed={isPresetSelected}
                            onClick={() => {
                              setSelectedPreset(presetAmount);
                              setCustomAmount("");
                            }}
                            className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                              isPresetSelected
                                ? "bg-[#00696E] text-white"
                                : "bg-muted text-foreground hover:bg-muted/70"
                            }`}
                          >
                            {presetAmount}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={customAmount}
                      onChange={(changeEvent) => setCustomAmount(changeEvent.target.value)}
                      placeholder="Custom amount (USD)"
                      className={INPUT_CLASS}
                    />
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl bg-[#00696E]/5 p-4">
                    <Image
                      src="/icons/lock_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
                      alt=""
                      width={24}
                      height={24}
                      className="shrink-0"
                    />
                    <p className="text-xs text-muted-foreground">
                      Funds are held in Qatoto escrow and released per verified milestone — Proof of
                      Effort logs and milestone checks gate every release. Escrow is display-only in
                      this phase.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={!isPledgeValid}
                    className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Confirm pledge{pledgeAmountLabel ? ` · ${pledgeAmountLabel}` : ""}
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
