import type { Metadata } from "next";

import CofounderProfileComposer from "@/components/home/store/composers/cofounder-profile-composer";

// Permanently dynamic: session-scoped, and the profile is about whoever is signed in.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "List yourself as a cofounder",
  description: "Create your cofounder profile on Qatoto",
};

/**
 * NO `generateStaticParams` — this route has no dynamic segment.
 *
 * It sits beside `[profileSlug]`, and routing precedence within a directory puts static above
 * `[param]`, so `new` reaches this file and is never captured as a profile slug.
 */
export default function NewCofounderProfileRoute() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-10 lg:px-6">
      <CofounderProfileComposer />
    </div>
  );
}
