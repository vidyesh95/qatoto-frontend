import type { Metadata } from "next";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: "Sign Out",
  description: "Sign Out page for Qatoto",
};

export default function SignOut() {
  return <h1>Sign out</h1>;
}
