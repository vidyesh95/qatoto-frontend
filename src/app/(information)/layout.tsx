import Link from "next/link";
import React from "react";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <>
      <nav className="sticky top-0 z-50 bg-background">
        <div className="px-4 py-2.5 md:px-16.5">
          <Link href="/" className="font-serif text-3xl font-medium text-[#00696E]">
            Qatoto
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
};

export default Layout;
