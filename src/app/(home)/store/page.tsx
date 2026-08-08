import type { Metadata } from "next";
import StorePage from "@/components/home/store/store-page";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Store",
  description: "B2B commerce store for Qatoto",
};

export default function Store() {
  return <StorePage />;
}
