// TRANSPORT: props-only — pure builders for schema.org structured data payloads.

/**
 * A schema.org node. Values are whatever JSON allows, which is why this is not narrower — the
 * vocabulary is open and each builder below is the thing that knows its own shape.
 */
export type StructuredDataValue =
  | string
  | number
  | boolean
  | StructuredDataNode
  | StructuredDataValue[];

export type StructuredDataNode = { [key: string]: StructuredDataValue | undefined };

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
