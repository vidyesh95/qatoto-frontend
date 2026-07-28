// TRANSPORT: props-only — pure string building, no network.
//
// Filter chips are LINKS that rewrite the query string, and the server component reads
// `searchParams` and passes them to the API as query params. That is what "server-side
// filtering" means here (§13): the backend filters in SQL, and the URL is the state.
//
// This replaces the old pattern of holding the selection in `useState` and running
// `.filter()` over an in-memory array, which breaks two ways against a real feed:
// filtering one fetched page silently short-pages the result, and a filter the URL does
// not carry cannot be shared, bookmarked, or restored on back-navigation.

/** What a route's `searchParams` gives us, before any of it is trusted. */
export type RawSearchParams = Record<string, string | string[] | undefined>;

/**
 * Reads one param as a single string. Returns undefined for an absent value AND for a
 * repeated one — a filter that expects one value has no defensible reading of two, and
 * guessing would send the backend a param its `.strict()` schema may reject.
 */
export function readSingleParam(searchParams: RawSearchParams, key: string): string | undefined {
  const value = searchParams[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Reads a repeatable param as a list. `?skill=a&skill=b` arrives as an array;
 * `?skill=a` as a string. Empty means "no filter", never "match nothing".
 */
export function readMultiParam(searchParams: RawSearchParams, key: string): string[] {
  const value = searchParams[key];
  if (Array.isArray(value)) return value.filter((entry) => entry.length > 0);
  return typeof value === "string" && value.length > 0 ? [value] : [];
}

/**
 * Reads a param and keeps it only if it is one of the allowed values.
 *
 * An unrecognized value is DROPPED rather than forwarded: every backend query schema is
 * `.strict()` with enum-typed values, so passing through `?commitment=banana` turns a
 * hand-edited URL into a 422 error page. The filter is a facet, and an unknown facet
 * value means "no filter".
 */
export function readEnumParam<TValue extends string>(
  searchParams: RawSearchParams,
  key: string,
  allowedValues: readonly TValue[],
): TValue | undefined {
  const value = readSingleParam(searchParams, key);
  return allowedValues.find((allowedValue) => allowedValue === value);
}

/**
 * The current query string with `patch` applied, as an href.
 *
 * A `undefined` value REMOVES its key — that is how a chip clears itself. `page` is
 * dropped on every patch: changing a filter while on page 4 of the old result set lands
 * on a page that may not exist in the new one, which reads as an empty result.
 */
export function buildFilterHref(searchParams: RawSearchParams, patch: RawSearchParams): string {
  const nextParams = new URLSearchParams();

  const mergedKeys = new Set([...Object.keys(searchParams), ...Object.keys(patch)]);

  for (const key of mergedKeys) {
    if (key === "page") continue;

    const value = key in patch ? patch[key] : searchParams[key];
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      for (const entry of value) nextParams.append(key, entry);
      continue;
    }
    if (value.length > 0) nextParams.append(key, value);
  }

  const queryString = nextParams.toString();
  return queryString.length > 0 ? `?${queryString}` : "?";
}

/**
 * `patch` for a multi-select chip: adds the value if absent, removes it if present, and
 * removes the key entirely when the last value goes. Used by the supplier capability
 * chips, which the backend ANDs.
 */
export function toggleMultiParamPatch(
  searchParams: RawSearchParams,
  key: string,
  value: string,
): RawSearchParams {
  const current = readMultiParam(searchParams, key);
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];

  return { [key]: next.length > 0 ? next : undefined };
}
