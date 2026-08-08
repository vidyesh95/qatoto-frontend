// TRANSPORT: props-only

import Link from "next/link";

type StoreStatusPanelProps =
  | { status: "error"; message: string; isSignInRequired?: boolean }
  | { status: "empty"; title: string; message: string; resetHref?: string };

/**
 * Shared empty/error chrome for wired store catalog pages.
 * Never collapses transport failure into "no products".
 */
export default function StoreStatusPanel(props: StoreStatusPanelProps) {
  if (props.status === "error") {
    return (
      <div className="mx-auto max-w-lg space-y-3 px-4 py-16 text-center lg:px-6">
        <h1 className="text-lg font-medium tracking-wide">Store unavailable</h1>
        <p className="text-sm text-foreground/70">{props.message}</p>
        {props.isSignInRequired ? (
          <Link href="/sign-in" className="inline-block text-sm font-medium text-[#00696E]">
            Sign in
          </Link>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-3 px-4 py-16 text-center lg:px-6">
      <h1 className="text-lg font-medium tracking-wide">{props.title}</h1>
      <p className="text-sm text-foreground/70">{props.message}</p>
      {props.resetHref ? (
        <Link href={props.resetHref} className="inline-block text-sm font-medium text-[#00696E]">
          Clear filters
        </Link>
      ) : null}
    </div>
  );
}
