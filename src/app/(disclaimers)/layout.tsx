import Link from "next/link";
import React from "react";

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return (
    <>
      <nav className="sticky top-0 z-50 bg-background">
        <div className="px-4 md:px-20 py-2.5">
          <Link href="/" className="text-3xl font-serif font-medium text-[#00696E]">
            Qatoto
          </Link>
        </div>
      </nav>
      {children}
    </>
  );
};

export default Layout;
