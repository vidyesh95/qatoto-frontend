// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Image from "next/image";
import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  href?: string;
};

// Left-aligned section title with an optional trailing "see all" chevron, used
// above every R&D rail (Featured projects, Open roles, Market insights, …).
// Sections without a deeper destination pass no href and render title-only.
// ⚠️ SANS, AND IDENTICAL TO ITS TWIN. This was `font-serif text-xl xl:text-2xl`, justified as
// matching "the landing hero's opening voice" — an argument that died with the serif, since
// `docs/Design.md` §3 is unambiguous: "A serif heading inside `(home)` is a bug."
// It now carries the exact recipe of `store/sections/section-header.tsx`, which is the same
// component doing the same job for the store's rails. Two files with one docblock and two
// different type scales was the real defect; changing one without the other reinstates it.
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
