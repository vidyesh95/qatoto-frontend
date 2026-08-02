import type { Metadata } from "next";

import SupplierDetailPage from "@/components/home/research-and-development/supplier-detail-page";
import { withSentinelValues } from "@/lib/static-params";
import { getSupplier, listSuppliers } from "@/lib/rnd/suppliers.api";

const PRERENDERED_SUPPLIER_LIMIT = 50;

/**
 * Prerender the first page of the directory — a dynamic route needs this under
 * `cacheComponents`.
 *
 * There is no `GET /supplier-slugs`, so the params come off the directory read itself.
 * Anything past the bound renders on demand. A FAILED OR EMPTY READ YIELDS THE SENTINEL
 * PARAM rather than an empty list: `cacheComponents` fails the build on an empty one, and
 * an unreachable backend must not fail the build (`@/lib/static-params`).
 */
export async function generateStaticParams() {
  const suppliersResult = await listSuppliers({ limit: PRERENDERED_SUPPLIER_LIMIT });
  const supplierSlugs = suppliersResult.success
    ? suppliersResult.data.rows.map((supplier) => supplier.slug)
    : [];
  return withSentinelValues(supplierSlugs).map((supplierSlug) => ({ supplierSlug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ supplierSlug: string }>;
}): Promise<Metadata> {
  const { supplierSlug } = await params;
  const supplierResult = await getSupplier(supplierSlug);
  if (!supplierResult.success) return { title: "Partner · R&D" };
  return {
    title: `${supplierResult.data.name} · Manufacturing partners`,
    description: supplierResult.data.summary ?? undefined,
  };
}

export default async function Page({ params }: { params: Promise<{ supplierSlug: string }> }) {
  const { supplierSlug } = await params;
  return <SupplierDetailPage supplierSlug={supplierSlug} />;
}
