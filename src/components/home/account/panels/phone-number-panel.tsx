// TRANSPORT: props-only — authored copy. Fetches nothing, and there is nothing to fetch.

import Image from "next/image";

/**
 * Phone number — an honest placeholder, because the backend for it does not exist.
 *
 * ⚠️ THIS PANEL USED TO SHIP A WORKING-LOOKING OTP FLOW THAT COULD NOT WORK. It drove
 * `authClient.phoneNumber.sendOtp()` and `.verify()`, both declared client-side through
 * `inferAdditionalFields` in `auth-client.ts` — so they type-checked, and pressing "Send code" put a
 * request on the wire. `POST /api/auth/phone-number/send-otp` answers **404**: the Express backend
 * mounts no Better Auth `phoneNumber` plugin and `rg phoneNumber qatoto-backend/src` returns
 * nothing. Anyone who opened this panel and pressed the button got an error for a feature that was
 * never wired.
 *
 * IT IS BLOCKED ON A PURCHASE, NOT ON CODE. The plugin requires a `sendOTP` implementation, and
 * there is no SMS provider in `src/config/index.ts` or `.env.example` — the only OTP delivery
 * configured anywhere is Brevo, which is email. Writing the plugin first would leave a route that
 * mints codes nobody receives, which is the same failure one layer down.
 *
 * WHY THE PANEL STAYS MOUNTED rather than being deleted from the settings menu: it marks where the
 * feature will live, and its absence would tell a reader nothing. The rule behind that is the one
 * `customer-service.tsx` used to be the example of — an unanswered form is worse than an honest
 * signpost, because the person believes they have been heard. ⚠️ THAT PAGE IS NO LONGER THE
 * EXAMPLE: `/support` shipped, so customer service now runs a real case queue somebody answers.
 * The principle is unchanged and this panel is now the surface it applies to.
 *
 * WHAT TO DO WHEN AN SMS PROVIDER IS BOUGHT: add the provider to config, mount the `phoneNumber`
 * plugin with a real `sendOTP`, then restore the two-step flow. `git log` has the version that was
 * removed; nothing about it was wrong except that nothing answered it.
 */
export function PhoneNumberPanel({
  initialPhoneNumber,
  onBack,
}: {
  /** The stored number, which is `undefined` for everybody — there is no column behind it. */
  readonly initialPhoneNumber: string;
  readonly onBack: () => void;
}) {
  const storedPhoneNumber = initialPhoneNumber.trim();

  return (
    <div>
      <header className="sticky top-0 z-10 flex flex-row items-center gap-4 border-b border-black/10 bg-background p-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="cursor-pointer rounded-full p-1 transition-colors hover:bg-muted"
        >
          <Image
            src="/icons/arrow_back_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            alt=""
            width={24}
            height={24}
          />
        </button>
        <h2 className="text-xl font-medium text-secondary-foreground">Phone number</h2>
      </header>

      <div className="flex flex-col gap-4 p-4">
        <div>
          <p className="text-sm font-medium text-secondary-foreground">Your phone number</p>
          {/*
            "Not set" for everybody, and that is the honest value rather than a fallback: there is
            no `phone_number` column, so there is nothing that could be set.
          */}
          <p className="mt-0.5 text-sm text-muted-foreground">
            {storedPhoneNumber === "" ? "Not set" : storedPhoneNumber}
          </p>
        </div>

        <div className="rounded-xl border border-border px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            Phone verification is not available yet
          </p>
          <p className="mt-1 text-xs leading-4 text-muted-foreground">
            Qatoto cannot send SMS codes yet, so there is nothing to enter here. Your account is
            secured by email, and by a passkey or password if you have set one. This page will do
            something when text messaging is switched on.
          </p>
        </div>
      </div>
    </div>
  );
}
