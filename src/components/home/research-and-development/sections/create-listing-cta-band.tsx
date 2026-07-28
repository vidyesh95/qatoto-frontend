// TRANSPORT: props-only — presentational server component. Fetches nothing; data
// arrives as props. Safe on either side of the boundary.
import Link from "next/link";

// The end of the pipeline: a founder with a launch-ready project creates the
// listing in the studio, where pricing, inventory and fulfilment already live.
// /store is the secondary link because it is the buyer's browse view — sending
// a founder ready to sell into a shopping surface is the wrong destination, and
// this band is where that gets fixed.
export default function CreateListingCtaBand() {
  return (
    <section className="mx-4 space-y-4 rounded-2xl bg-[#00696E]/5 p-6 text-center md:p-8 lg:mx-6">
      <h2 className="text-xl font-semibold md:text-2xl">Ready to sell what you built?</h2>
      <p className="text-sm text-muted-foreground">
        Listings are created and managed in the studio. R&amp;D hands over the project — it does not
        run a second product surface of its own.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/studio/products"
          className="cursor-pointer rounded-full bg-[#00696E] px-4 py-2 text-sm font-medium text-white"
        >
          Create your store listing
        </Link>
        <Link
          href="/store"
          className="cursor-pointer rounded-full border border-[#00696E]/40 px-4 py-2 text-sm font-medium text-[#00696E]"
        >
          See the storefront
        </Link>
      </div>
    </section>
  );
}
