import { redirect } from "next/navigation";

import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Listings",
  description: "Your product listings on Qatoto",
};

/**
 * WAS AN `<h1>` STUB. NOW A REDIRECT, AND THAT IS THE FEATURE RATHER THAN A REFUSAL TO BUILD IT.
 *
 * "Every listing this user created" is `GET /products/mine`, and `/studio/products` already renders
 * exactly that — with the create wizard, per-row edit, and the delete confirmation attached. A
 * second page over the same read would be a second place for the same list to drift, and the studio
 * one is where the controls that act on a listing live.
 *
 * A REDIRECT RATHER THAN A DELETED ROUTE because the path is a reasonable guess and somebody may
 * have it bookmarked. The legacy category URLs under `/store/[...slug]` take the same approach.
 *
 * `/products/mine` is also the one OFFSET-paginated read in the store — `{ page, limit, total,
 * totalPages }`, not the cursor envelope everything else uses — which is another reason not to grow
 * a second consumer of it.
 */
export default function ListingsRoute() {
  redirect("/studio/products");
}
