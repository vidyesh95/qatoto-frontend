import SignIn from "@/components/auth/sign-in";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * `?reason=account-deleted` is the one parameter this route reads.
 *
 * WHY THE PAGE READS IT AND NOT THE CLIENT COMPONENT. `useSearchParams` would need a
 * Suspense boundary around a component that is otherwise entirely static, for a value the
 * server already has. Threading it as a prop costs one line and no boundary.
 *
 * THERE IS DELIBERATELY NO `?next=` HERE. Nothing in the `(auth)` group has redirect
 * plumbing, and adding it for this would mean building a general open-redirect surface to
 * serve one strip of copy.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { reason } = await searchParams;

  return <SignIn hasJustDeletedAccount={reason === "account-deleted"} />;
}
