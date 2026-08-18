// THE FIRST NESTED LAYOUT IN `(home)` — 85 pages had shared one until this route tree existed.
//
// IT IS A COLUMN AND NOTHING ELSE. No heading, deliberately: every panel under this tree still
// draws its own sticky back-header with the arrow, inherited from the account dropdown it was
// written for, and adding an `<h1>` here would stack two headers on nine of the ten routes. The
// heading moves in when Parts 2–3 rewrite the panels for page width and drop that header.
//
// `max-w-3xl` and the `pb-10` are the container copied ten times across this repo (`order-list`,
// `wishlist-page`, `dispute-detail`, …), so this tree reads like the rest of the app rather than
// like a dropdown that got loose.

import React from "react";

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return <div className="mx-auto w-full max-w-3xl pb-10">{children}</div>;
};

export default Layout;
