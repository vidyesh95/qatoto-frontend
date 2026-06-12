import Image from "next/image";
import Link from "next/link";
import type { StoreProduct } from "@/lib/store";

// Product tile used in the horizontal feed rails. Name + subtitle + price sit
// below the image. Fixed width so rows scroll horizontally.
export default function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link href={product.href} className="group flex w-40 shrink-0 flex-col sm:w-48">
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-xl">
        <Image
          src={product.imageSrc}
          fill
          alt={product.name}
          className="object-cover transition duration-300 group-hover:scale-105"
        />
      </div>
      <div className="mt-1.5 px-0.5">
        <p className="truncate text-sm font-semibold">{product.name}</p>
        {product.subtitle && (
          <p className="truncate text-xs text-foreground/60">{product.subtitle}</p>
        )}
        <p className="mt-0.5 text-sm font-medium">{product.price}</p>
      </div>
    </Link>
  );
}
