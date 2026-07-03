"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Step 3 — checks. Real copyright scanning is a backend job; the UI phase
// fakes a short "checking" pass that always lands on "No issues found".
type CopyrightCheckStage = "checking" | "complete";

const FAKE_CHECK_DURATION_MS = 1500;

export default function ChecksStep() {
  const [copyrightCheckStage, setCopyrightCheckStage] = useState<CopyrightCheckStage>("checking");

  useEffect(() => {
    const checkTimeoutId = setTimeout(() => {
      setCopyrightCheckStage("complete");
    }, FAKE_CHECK_DURATION_MS);
    return () => clearTimeout(checkTimeoutId);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-4 rounded-2xl border border-border p-6">
        <div>
          <h3 className="text-base font-semibold text-foreground">Checks</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            We check your video for issues that may restrict its visibility before it is published.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
          {copyrightCheckStage === "checking" ? (
            <>
              <span className="size-5 shrink-0 animate-spin rounded-full border-2 border-border border-t-[#1DBDC5]" />
              <div>
                <p className="text-sm font-medium text-foreground">Copyright</p>
                <p className="text-xs text-muted-foreground">Checking…</p>
              </div>
            </>
          ) : (
            <>
              <Image
                src="/icons/check_circle_24dp_6F7979_FILL1_wght400_GRAD0_opsz24.svg"
                alt=""
                width={20}
                height={20}
                className="shrink-0"
              />
              <div>
                <p className="text-sm font-medium text-foreground">Copyright</p>
                <p className="text-xs text-muted-foreground">
                  No issues found. Copyright check complete.
                </p>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Remember: these check results aren&apos;t final. Issues may come up in the future that
          affect your video.
        </p>
      </section>
    </div>
  );
}
