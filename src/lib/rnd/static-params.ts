// TRANSPORT: props-only — pure list building, no network of its own.
//
// `cacheComponents` REFUSES AN EMPTY `generateStaticParams`. Next.js 16 fails the build
// with `EmptyGenerateStaticParamsError` when one returns `[]`, because it cannot do its
// build-time validation of a route it never rendered once.
//
// That collides with a rule every R&D route already follows: a failed read returns `[]`
// rather than throwing, so an unreachable backend does not fail the build. Both cannot
// hold at the same time — so an empty list yields ONE sentinel param instead, and the
// route renders that param the only honest way it can: as `notFound()`.
//
// A sentinel prerender is safe precisely because every one of these pages already resolves
// its own record and calls `notFound()` on a 404. The sentinel is a slug the backend will
// never mint, so it takes the same path a typo does.

/**
 * A param value no backend row can collide with.
 *
 * Slugs are kebab-case and server-generated; ids are opaque. Neither ever equals this
 * string, and the double underscore makes an accidental match impossible rather than
 * merely unlikely.
 */
const UNRESOLVABLE_PARAM_VALUE = "__none__";

/**
 * The param values to prerender, or one sentinel when there are none.
 *
 * Use it for EVERY dynamic route on this surface. Passing an empty array through would
 * fail `pnpm build` on any machine where the backend is not running — which is most of
 * them, and all of CI.
 *
 * It returns VALUES rather than param objects on purpose: each route names its own
 * segment (`id`, `clusterId`, `supplierSlug`, `handle`), and building the object here
 * would need a cast to say so. The caller maps, and the shape stays inferred.
 */
export function withSentinelValues(values: readonly string[]): string[] {
  return values.length > 0 ? [...values] : [UNRESOLVABLE_PARAM_VALUE];
}
