import SignInWithPassword from "@/components/auth/sign-in-with-password";
import { readSafeReturnPath, RETURN_PATH_QUERY_KEY } from "@/lib/auth-return-path";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export default async function SignInWithPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { [RETURN_PATH_QUERY_KEY]: rawReturnPath } = await searchParams;

  return <SignInWithPassword returnPath={readSafeReturnPath(rawReturnPath)} />;
}
