// TRANSPORT: props-only

import Image from "next/image";
import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  /**
   * Omit when the destination page does not exist yet. Several `/store/*` read routes are
   * shipped backend-side with no frontend page (STORE_STRUCTURE §3.1), and a "see all"
   * chevron that 404s is worse than no chevron.
   */
  href?: string;
};

// Left-aligned section title with a trailing "see all" chevron, used above every
// store rail (Categories, Pathways for you, provider shortcuts, curated rails, …).
export default function SectionHeader({ title, href }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-6">
      <h2 className="text-sm font-medium tracking-wide xl:text-lg">{title}</h2>
      {href ? (
        <Link
          href={href}
          aria-label={`See all ${title}`}
          className="grid size-8 place-items-center rounded-full transition hover:bg-black/5"
        >
          <Image
            src="/icons/arrow_forward_ios_24dp_000000_FILL0_wght400_GRAD0_opsz24.svg"
            width={20}
            height={20}
            alt=""
          />
        </Link>
      ) : null}
    </div>
  );
}
