import Link from "next/link";

// Scoped not-found for the store route tree. Catches notFound() calls from
// the category and pathway detail pages (unknown slug/id).
export default function StoreNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-24 text-center">
      <h1 className="text-lg font-medium tracking-tight text-foreground">We couldn't find that</h1>
      <p className="text-sm text-[#6F7979]">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <Link
        href="/store"
        className="mt-2 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to Store
      </Link>
    </div>
  );
}
