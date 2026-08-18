// One of the two first nested layouts in `(home)` — see `your-account/layout.tsx`, its twin.
//
// IT IS A COLUMN AND NOTHING ELSE. No heading, deliberately: every preference panel under this
// tree still draws its own sticky back-header with the arrow, inherited from the account dropdown
// it was written for, and adding an `<h1>` here would stack two headers on six of the seven
// routes. The heading moves in when Parts 2–3 rewrite the panels for page width.

import React from "react";

interface Props {
  children: React.ReactNode;
}

const Layout = ({ children }: Props) => {
  return <div className="mx-auto w-full max-w-3xl pb-10">{children}</div>;
};

export default Layout;
