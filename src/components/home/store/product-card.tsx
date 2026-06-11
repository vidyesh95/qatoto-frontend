import Image from "next/image";
import Link from "next/link";
import type { StoreProduct } from "@/lib/store";

// Product tile used in the horizontal feed rails. Name + subtitle overlay the
// image bottom; price sits beneath. Fixed width so rows scroll horizontally.
export default function ProductCard({ product }: { product: StoreProduct }) {
  return (
    <Link href={product.href} className="group flex w-40 shrink-0 flex-col sm:w-48">
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
        <Image
          src={product.imageSrc}
          fill
          alt={product.name}
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-3">
          <p className="text-sm font-semibold text-white">{product.name}</p>
          {product.subtitle && (
            <p className="line-clamp-1 text-xs text-white/80">{product.subtitle}</p>
          )}
        </div>
      </div>
      <p className="mt-1.5 px-0.5 text-sm font-medium">{product.price}</p>
    </Link>
  );
}
