import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Advertise With Us",
  description: "Advertise With Us page for Qatoto",
};

export default function AdvertiseWithUs() {
  return <h1>Advertise with us</h1>;
}
