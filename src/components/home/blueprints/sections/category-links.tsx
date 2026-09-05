// TRANSPORT: props-only — the categories arrive from `blueprints-page`. This component fetches
// nothing.
//
// THIS FILE WAS DEAD CODE UNTIL THE THREE CATEGORY ROUTES EXISTED. It shipped with the hub and had
// no importer, because there was nowhere for it to point: every category lived on the same page.
// It is wired now rather than rewritten, since the shape it already had — icon, label, href — is
// exactly the shape three segment links need.

import Image from "next/image";
import Link from "next/link";

export interface CategoryLink {
  readonly icon: string;
  readonly label: string;
  readonly href: string;
}

export default function CategoryLinks({ categories }: { categories: readonly CategoryLink[] }) {
  return (
    <nav className="px-4 py-2 lg:px-6" aria-label="Blueprint categories">
      <ul className="flex items-start">
        {categories.map((category) => (
          <li key={category.label} className="flex-1">
            <Link
              href={category.href}
              className="group flex flex-col items-center gap-1 rounded-xl p-1 transition-colors hover:bg-black/5 md:p-2"
            >
              <Image
                src={category.icon}
                width={40}
                height={40}
                alt=""
                className="size-10 transition-transform group-hover:scale-105"
              />
              <span className="text-[11px] leading-4 font-medium tracking-[0.5px] text-foreground">
                {category.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
