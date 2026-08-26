import type { Metadata } from "next";

import AdvertiseWithUs from "@/components/home/advertise-with-us";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Advertise With Us",
  description: "The surfaces Qatoto has, and how to start a conversation about placement.",
};

export default function AdvertiseWithUsPage() {
  return <AdvertiseWithUs />;
}
