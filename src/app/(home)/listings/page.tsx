import { redirect } from "next/navigation";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// No `metadata` export, matching the other four redirects: a redirect renders no document, so
// any title it produced would be for a page nobody sees.

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
