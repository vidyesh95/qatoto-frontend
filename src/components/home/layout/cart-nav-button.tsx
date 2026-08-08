// TRANSPORT: client-query — reads the cart through React Query for the count badge.
"use client";

// The navbar cart entry: a link to `/cart` with a count of the lines waiting there.
//
// IT IS ITS OWN COMPONENT RATHER THAN A HOOK CALL INSIDE `Navbar`, and that is not tidiness. The
// button lives in the navbar's `isAuthenticated` branch, so a `useCartBadgeQuery()` at the top of
// `Navbar` would fire on every page of the `(home)` group for signed-out visitors and earn a 401 each
// time. Mounting the query with the component keeps the rules-of-hooks contract intact AND keeps the
// request gated behind the session.
//
// THE BADGE IS ABSENT, NEVER ZERO, UNTIL THE SERVER HAS SPOKEN. No badge while the query is pending,
// none on a thrown transport error, none on a `success: false`, none on an empty cart. A "0" painted
// during load is a claim about the buyer's cart that the client has not earned — and the one it would
// most often be wrong about, because a returning buyer's cart is rarely empty.
//
// THE COUNT IS DISTINCT LINES, NOT UNITS. A B2B cart holding 50 + 100 + 40 units is three lines, and
// a badge reading "190" would be read as variety rather than volume. This is what Alibaba shows;
// Amazon's unit count only reads sensibly because consumer quantities are single digits.

import Image from "next/image";
import Link from "next/link";

import { useCartBadgeQuery } from "@/hooks/store/cart";
import { formatCountLabel } from "@/lib/store/format";

/** Above this the badge shows `99+`, so a long cart cannot deform the navbar row. */
const MAXIMUM_DISPLAYED_LINE_COUNT = 99;

export default function CartNavButton() {
  const cartQuery = useCartBadgeQuery();

  const result = cartQuery.data;
  // Every branch that is not an authoritative, non-empty cart collapses to `null` — pending, thrown,
  // refused, and empty all render the same bare icon.
  const lineCount =
    result !== undefined && result.success && result.data.items.length > 0
      ? result.data.items.length
      : null;

  return (
    <Link
      href={"/cart"}
      // The count is in the accessible name rather than left to the badge, which is `aria-hidden`
      // below — a screen reader should hear "Cart, 3 items" once, not "Cart" and then a loose "3".
      aria-label={lineCount === null ? "Cart" : `Cart, ${formatCountLabel(lineCount)} items`}
      className={"relative cursor-pointer rounded-full border border-primary bg-white p-1.75"}
    >
      <Image
        src={"/icons/shopping_cart_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"}
        alt={""}
        width={24}
        height={24}
      />
      {lineCount !== null && (
        <span
          aria-hidden
          className="absolute -top-1 -right-1 grid min-w-4.5 place-items-center rounded-full bg-[#00696E] px-1 text-[10px] leading-4 font-medium text-white"
        >
          {lineCount > MAXIMUM_DISPLAYED_LINE_COUNT
            ? `${formatCountLabel(MAXIMUM_DISPLAYED_LINE_COUNT)}+`
            : formatCountLabel(lineCount)}
        </span>
      )}
    </Link>
  );
}
