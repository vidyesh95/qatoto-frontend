// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Link from "next/link";

// Stage 06 hero for /research-and-development/go-to-market — the last stage and
// the bridge out of R&D into commerce. Its whole job is to end on
// /studio/products, where a founder actually creates the listing; /store is the
// buyer's browse view and sending a founder there is what this page fixes.
export default function GoToMarketHero() {
  return (
    <section className="mx-4 rounded-2xl bg-linear-to-r from-[#0B1F21] via-[#00393C] to-[#00696E] p-6 text-white md:p-10 lg:mx-6">
      <p className="text-xs tracking-widest text-white/80">STAGE 06 · GO-TO-MARKET</p>
      <h1 className="mt-2 font-serif text-3xl md:text-5xl">
        From verified build to a live listing.
      </h1>
      <p className="mt-4 max-w-2xl text-sm text-white/85 md:text-base">
        The prototype works, the cap table is settled, and the product needs to exist at scale. Find
        a manufacturing or ODM partner, run the batch, move it, and put it on the storefront — the
        last stretch of the pipeline, and the one that ends in a sale.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Link
          href="/studio/products"
          className="cursor-pointer rounded-full bg-white px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          Create your store listing
        </Link>
        <Link
          href="#supplier-directory"
          className="cursor-pointer rounded-full border border-white/70 px-4 py-2 text-sm font-medium text-white"
        >
          Find a supplier
        </Link>
      </div>
    </section>
  );
}
