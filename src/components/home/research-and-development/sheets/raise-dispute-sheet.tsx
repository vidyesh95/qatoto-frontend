// TRANSPORT: props-only — client island. Holds interaction state only; all data
// arrives as props from a server parent. Fetches nothing, so it needs no
// QueryProvider. If this ever calls a hook in src/hooks/rnd, relabel it client-query.
"use client";

import { useEffect, useState } from "react";

import Image from "next/image";

import { INPUT_CLASS, LABEL_CLASS } from "@/components/ui/field-classes";
import type { DisputeWindowEntry } from "@/types/research-and-development";

// Self-contained "raise a dispute" trigger + bottom sheet (§14.1). Mock phase:
// submitting flips the trigger to "Dispute raised" in local state only. No
// slices freeze, no case opens, nothing is sent.

const DISPUTE_GROUNDS = [
  "Hours look double-counted",
  "Work was unattended, not worked",
  "Already covered by another allocation",
  "Receipts don't support the claim",
] as const;

export default function RaiseDisputeSheet({ openEntries }: { openEntries: DisputeWindowEntry[] }) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [hasRaised, setHasRaised] = useState(false);
  const [selectedEntryId, setSelectedEntryId] = useState(openEntries[0]?.id ?? "");
  const [selectedGround, setSelectedGround] = useState<string>(DISPUTE_GROUNDS[0]);
  const [disputeDetail, setDisputeDetail] = useState("");

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

  const isDisputeValid = selectedEntryId !== "" && disputeDetail.trim() !== "";

  return (
    <>
      <button
        type="button"
        disabled={openEntries.length === 0}
        onClick={() => setIsSheetOpen(true)}
        className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
          hasRaised ? "bg-[#00696E]/10 text-[#00696E]" : "bg-primary text-primary-foreground"
        }`}
      >
        {hasRaised ? "Dispute raised ✓" : "Raise a dispute"}
      </button>

      {isSheetOpen && (
        <>
          <button
            type="button"
            aria-label="Close raise dispute sheet"
            onClick={() => setIsSheetOpen(false)}
            className="fixed inset-0 z-55 bg-black/40"
          />

          <div
            aria-label="Raise a dispute"
            className="fixed inset-x-0 bottom-0 z-60 flex max-h-[85dvh] flex-col rounded-t-2xl bg-background shadow-lg sm:inset-0 sm:m-auto sm:h-max sm:max-h-[80dvh] sm:w-md sm:rounded-2xl sm:border sm:border-black/10"
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <span className="h-1.5 w-10 rounded-full bg-black/15" />
            </div>

            <header className="flex shrink-0 items-center gap-2 px-4 py-3">
              <h2 className="flex-1 truncate text-base font-medium">Raise a dispute</h2>
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
              {hasRaised ? (
                <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
                  <span className="grid size-12 place-items-center rounded-full bg-[#00696E]/10 text-2xl text-[#00696E]">
                    ✓
                  </span>
                  <p className="text-base font-medium">Dispute raised</p>
                  <p className="text-sm text-muted-foreground">
                    Mock phase: no case opened and no slices froze. Nothing was sent.
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
                    if (isDisputeValid) setHasRaised(true);
                  }}
                >
                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Allocation</span>
                    <select
                      value={selectedEntryId}
                      onChange={(changeEvent) => setSelectedEntryId(changeEvent.target.value)}
                      className={INPUT_CLASS}
                    >
                      {openEntries.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.proposedAllocationSummary} · {entry.proposedSlicesLabel}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>Grounds</span>
                    <div className="flex flex-wrap gap-2">
                      {DISPUTE_GROUNDS.map((ground) => (
                        <button
                          key={ground}
                          type="button"
                          aria-pressed={selectedGround === ground}
                          onClick={() => setSelectedGround(ground)}
                          className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                            selectedGround === ground
                              ? "bg-[#00696E] text-white"
                              : "bg-muted hover:bg-muted/70"
                          }`}
                        >
                          {ground}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="flex flex-col gap-1.5">
                    <span className={LABEL_CLASS}>What you saw</span>
                    <textarea
                      rows={4}
                      value={disputeDetail}
                      onChange={(changeEvent) => setDisputeDetail(changeEvent.target.value)}
                      placeholder="Point at the evidence — a calendar, a commit range, a shift sheet."
                      className={INPUT_CLASS}
                    />
                  </label>

                  <p className="rounded-2xl bg-[#00696E]/5 p-4 text-xs text-muted-foreground">
                    A dispute freezes the proposed slices outside the pie until the team votes. It
                    never touches anyone&apos;s cash — a verification verdict gates equity only.
                  </p>

                  <button
                    type="submit"
                    disabled={!isDisputeValid}
                    className="rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
                  >
                    Raise dispute
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
