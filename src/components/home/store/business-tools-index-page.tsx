// TRANSPORT: props-only — renders a static manifest, no network.
//
// `/store/business`. The "For your Business" rail's see-all target, which until now pointed at
// `/store/categories` — the PRODUCT category index, a real page but a different one.
//
// NO VIEW-STATE UNION AND NO EXHAUSTIVE SWITCH HERE, and that is not an oversight. Pattern 1 models
// the states a READ can be in; this page performs no read, so there is no error branch, no empty
// branch and nothing to make impossible. Adding a union with one `ready` arm would be ceremony that
// teaches the next reader the wrong lesson about when the pattern applies.
//
// The trailing link to `/store/categories` is deliberate: browsing the catalogue IS a business need,
// and the rail tile that used to be the only way in now points here instead.

import Image from "next/image";
import Link from "next/link";

import SectionHeader from "@/components/home/store/sections/section-header";
import { BUSINESS_TOOLS_EXCLUDING_INDEX, type BusinessTool } from "@/lib/store/business-tools";

export default function BusinessToolsIndexPage() {
  return (
    <div className="pb-8">
      <SectionHeader title="For your Business" href="/store" />

      <p className="px-4 pb-4 text-sm leading-5 text-[#6F7979] lg:px-6">
        Everything a business needs to run on Qatoto — sourcing, moving, checking and staffing what
        you build.
      </p>

      <ul className="grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-6">
        {BUSINESS_TOOLS_EXCLUDING_INDEX.map((businessTool) => (
          <li key={businessTool.id}>
            <BusinessToolCard businessTool={businessTool} />
          </li>
        ))}
      </ul>

      <p className="px-4 pt-6 text-xs leading-4 text-[#6F7979] lg:px-6">
        Looking for products rather than a tool?{" "}
        <Link href="/store/categories" className="text-[#00696E] underline">
          Browse every product category
        </Link>
        .
      </p>
    </div>
  );
}

function BusinessToolCard({ businessTool }: { businessTool: BusinessTool }) {
  return (
    <Link
      href={businessTool.href}
      className="flex h-full items-start gap-3 rounded-xl border border-[#CAC4D0]/60 px-4 py-3 transition-colors hover:border-[#2A76FD]"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100">
        <Image src={businessTool.iconSrc} width={24} height={24} alt="" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm leading-5 font-medium text-[#191C1C]">
          {businessTool.label}
        </span>
        <span className="mt-0.5 block text-xs leading-4 text-[#6F7979]">
          {businessTool.description}
        </span>
      </span>
    </Link>
  );
}
