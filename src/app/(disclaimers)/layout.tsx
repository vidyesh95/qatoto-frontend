import Link from "next/link";
import React from "react";

// Every page under this group is marketing or policy copy that must never need a request to
// render. This makes `next dev` and `next build` FAIL the moment one stops being fully static —
// a `cookies()` read, an uncached fetch, server `searchParams`, or a "use cache" scope shorter
// than five minutes — instead of the page silently turning dynamic.
export const ensureStatic = "navigation";

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <>
      <nav className="sticky top-0 z-50 bg-background">
        <div className="px-4 py-2.5 md:px-16.5">
          <Link href="/" className="font-serif text-3xl font-medium text-primary-imprint">
            Qatoto
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
};

export default Layout;
