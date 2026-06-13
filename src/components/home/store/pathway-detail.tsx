import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPathway, getStoreHome } from "@/lib/store";
import PathwayItemCard from "@/components/home/store/pathway-item-card";
import PathwaysRail from "@/components/home/store/pathways-rail";

// Pathway "buy the look" page: a hero of the full set, the individual items the
// person/scene is composed of (each selectable), and a CTA to take the whole
// set to cart. Closes with other pathways for discovery.
export default async function PathwayDetail({ slug }: { slug: string }) {
  const [pathway, home] = await Promise.all([getPathway(slug), getStoreHome()]);
  if (!pathway) notFound();

  const similar = home.pathways.filter((p) => p.slug !== pathway.slug);

  return (
    <div className="space-y-8 pb-8">
      {/* Hero of the complete look */}
      <div className="relative mx-auto aspect-video w-full overflow-hidden bg-gray-100 lg:aspect-auto lg:h-100 lg:w-177.75">
        <Image
          src={pathway.imageSrc}
          fill
          sizes="(min-width: 1024px) 710px, 100vw"
          className="object-cover object-center"
          loading="eager"
          alt={pathway.title}
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute bottom-6 left-4 lg:left-6">
          <h1 className="text-3xl font-semibold text-white">{pathway.title}</h1>
          {pathway.subtitle && <p className="text-sm text-white/85">{pathway.subtitle}</p>}
        </div>
      </div>

      {/* Buy-the-set CTA */}
      <div className="px-4 lg:px-6">
        <Link
          href="/cart"
          className="flex items-center justify-center rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Buy complete set · {pathway.items.length} items
        </Link>
      </div>

      {/* Individual items in the look */}
      <section className="space-y-3 px-4 lg:px-6">
        <h2 className="text-lg font-medium tracking-wide">Items in this pathway</h2>
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {pathway.items.map((item) => (
            <PathwayItemCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {similar.length > 0 && <PathwaysRail pathways={similar} />}
    </div>
  );
}
