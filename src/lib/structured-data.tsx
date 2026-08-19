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

/**
 * A schema.org node. Values are whatever JSON allows, which is why this is not narrower — the
 * vocabulary is open and each builder below is the thing that knows its own shape.
 */
type StructuredDataValue = string | number | boolean | StructuredDataNode | StructuredDataValue[];

type StructuredDataNode = { [key: string]: StructuredDataValue | undefined };

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

/**
 * A product offer.
 *
 * `priceInCents` AND `currency` TRAVEL TOGETHER OR NOT AT ALL. A price without its currency is not a
 * smaller fact, it is a different number, and schema.org's `Offer` requires both — so a product
 * with one and not the other publishes no offer rather than half of one. Availability is likewise
 * absent unless the server said something about stock: "in stock" is the assumption a crawler makes
 * about a missing value anyway, and asserting it is a claim we cannot back.
 */
export function buildProductStructuredData(product: {
  readonly name: string;
  readonly description: string | null;
  readonly canonicalUrl: string;
  readonly imageUrl?: string | null;
  readonly sellerName?: string | null;
  readonly priceInCents?: number | null;
  readonly currency?: string | null;
  /** A schema.org availability URL, or `undefined` when the wire's stock state has no honest one. */
  readonly availability?: string;
}): StructuredDataNode {
  // Read into locals so TypeScript narrows them — the alternative is `as`, which this repo does not
  // use on values that came off the wire.
  const { priceInCents, currency, sellerName } = product;
  const offer =
    typeof priceInCents === "number" && typeof currency === "string" && currency.length > 0
      ? {
          "@type": "Offer",
          url: product.canonicalUrl,
          // schema.org wants a decimal major unit; the wire carries minor units, and dividing is
          // the only arithmetic in this file for exactly that reason.
          price: (priceInCents / 100).toFixed(2),
          priceCurrency: currency,
          availability: product.availability,
          seller: sellerName ? { "@type": "Organization", name: sellerName } : undefined,
        }
      : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    url: product.canonicalUrl,
    image: product.imageUrl ?? undefined,
    brand: sellerName ? { "@type": "Organization", name: sellerName } : undefined,
    offers: offer,
  };
}

/** A blog post or a press item. `datePublished` comes from the CMS or it is omitted. */
export function buildArticleStructuredData(article: {
  readonly headline: string;
  readonly description: string;
  readonly canonicalUrl: string;
  readonly publishedAt?: string | null;
  readonly imageUrl?: string | null;
  readonly authorName?: string | null;
}): StructuredDataNode {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.headline,
    description: article.description,
    url: article.canonicalUrl,
    datePublished: article.publishedAt ?? undefined,
    image: article.imageUrl ?? undefined,
    author: article.authorName
      ? { "@type": "Person", name: article.authorName }
      : { "@type": "Organization", name: "Qatoto" },
  };
}

/** An organization — a seller's storefront, or Qatoto itself on the root layout. */
export function buildOrganizationStructuredData(organization: {
  readonly name: string;
  readonly canonicalUrl: string;
  readonly description?: string | null;
  readonly logoUrl?: string | null;
}): StructuredDataNode {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: organization.name,
    url: organization.canonicalUrl,
    description: organization.description ?? undefined,
    logo: organization.logoUrl ?? undefined,
  };
}
