import SignIn from "@/components/auth/sign-in";
import { readSafeReturnPath, RETURN_PATH_QUERY_KEY } from "@/lib/auth-return-path";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

/**
 * `?reason=account-deleted` and `?next=` are the parameters this route reads.
 *
 * WHY THE PAGE READS IT AND NOT THE CLIENT COMPONENT. `useSearchParams` would need a
 * Suspense boundary around a component that is otherwise entirely static, for a value the
 * server already has. Threading it as a prop costs one line and no boundary.
 *
 * `?next=` IS ATTACKER-WRITABLE, so it reaches the client only through `readSafeReturnPath`,
 * which turns anything that is not a same-site path into `/`. It exists because a visitor who
 * signs in to apply for a role must land back on that role, not on the home page.
 */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { reason, [RETURN_PATH_QUERY_KEY]: rawReturnPath } = await searchParams;

  return (
    <SignIn
      hasJustDeletedAccount={reason === "account-deleted"}
      returnPath={readSafeReturnPath(rawReturnPath)}
    />
  );
}
