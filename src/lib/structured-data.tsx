// TRANSPORT: props-only — builds a JSON string from values the caller already has. No network.
//
// THERE WAS NO STRUCTURED DATA ANYWHERE IN THE APP, so a crawler reading a product page learned it
// was a page with a title. schema.org markup is what turns that into "a product, sold by this
// organization, at this price" — the difference between a blue link and a rich result.
//
// THE ONE RULE THAT MATTERS HERE IS THE REPO'S OWN: NEVER RENDER A VALUE THE SERVER DID NOT SEND.
// Structured data is read by machines that cannot tell an authored fallback from a fact, so a
// defaulted `price`, an invented `availability` or a manufactured `datePublished` is not a cosmetic
// blemish — it is a false claim about a commercial offer, made in a format designed to be trusted.
// Every builder below therefore OMITS a field it has no value for, and `omitEmptyValues` enforces
// that after the fact rather than relying on each call site to remember.
//
// SERVER COMPONENTS ONLY. `<script type="application/ld+json">` carries no behaviour and must ship
// in the HTML a crawler receives; putting it behind a client component would mean the one reader it
// exists for never sees it.

import type { ReactElement } from "react";
import type { StructuredDataNode } from "@/lib/structured-data-builders";

export type { StructuredDataNode, StructuredDataValue } from "@/lib/structured-data-builders";

/**
 * Drop every key whose value is `undefined`, recursively.
 *
 * `JSON.stringify` already drops top-level `undefined`, so this is not about serialization — it is
 * about the nested objects a builder assembles conditionally, where an empty `{}` left behind
 * publishes a schema.org node with no content instead of publishing nothing.
 */
function omitEmptyValues(node: StructuredDataNode): StructuredDataNode {
  const cleaned: StructuredDataNode = {};

  for (const [key, value] of Object.entries(node)) {
    if (value === undefined) continue;

    if (Array.isArray(value)) {
      if (value.length > 0) cleaned[key] = value;
      continue;
    }

    if (typeof value === "object") {
      const cleanedChild = omitEmptyValues(value);
      if (Object.keys(cleanedChild).length > 0) cleaned[key] = cleanedChild;
      continue;
    }

    cleaned[key] = value;
  }

  return cleaned;
}

/**
 * The `<script>` tag itself.
 *
 * `</script>` INSIDE A STRING VALUE WOULD CLOSE THIS TAG EARLY, which is an HTML-injection route out
 * of a JSON island and into the document — and every value here comes from the backend, which
 * CLAUDE.md says to treat as untrusted. Escaping `<` is the standard fix and leaves the JSON valid,
 * because `<` is what a JSON parser reads back as `<`.
 */
export function StructuredData({ data }: { data: StructuredDataNode }): ReactElement {
  const serialized = JSON.stringify(omitEmptyValues(data)).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serialized }} />;
}
