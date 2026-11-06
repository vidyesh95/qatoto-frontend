"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { buildAuthHref } from "@/lib/auth-return-path";

/** A link to sign-in that brings the visitor back to the page they are on. */
export default function SignInReturnLink({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: ReactNode;
}) {
  const currentPathname = usePathname();

  return (
    <Link href={buildAuthHref("/sign-in", currentPathname)} className={className}>
      {children}
    </Link>
  );
}
