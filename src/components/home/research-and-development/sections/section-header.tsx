import Image from "next/image";
import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  href?: string;
};

// Left-aligned section title with an optional trailing "see all" chevron, used
// above every R&D rail (Featured projects, Open roles, Market insights, …).
// Sections without a deeper destination pass no href and render title-only.
export default function SectionHeader({ title, href }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 lg:px-6">
      <h2 className="text-sm font-medium tracking-wide xl:text-lg">{title}</h2>
      {href && (
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
      )}
    </div>
  );
}
