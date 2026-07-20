import Image from "next/image";
import Link from "next/link";

type Category = { icon: string; label: string; href: string };

export default function CategoryLinks({ categories }: { categories: Category[] }) {
  return (
    <nav className="px-4 py-2 lg:px-6">
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
