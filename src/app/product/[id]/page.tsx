import { cache } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import AddToCartButton from '@/components/AddToCartButton';
import ProductGallery from '@/components/ProductGallery';
import ColorSelector from '@/components/ColorSelector';
import FabricSelector from '@/components/FabricSelector';
import FabricPicker from '@/components/FabricPicker';
import MechanismSelector from '@/components/MechanismSelector';
import CustomizeWizard from '@/components/CustomizeWizard';
import RelatedProducts from '@/components/RelatedProducts';
import SimilarProducts from '@/components/SimilarProducts';
import JsonLd from '@/components/JsonLd';
import { SITE_URL, SITE_NAME } from '@/lib/site';
import { warrantyForBrand, brandSlug } from '@/lib/warranty';

// Collections that get the guided CustomizeWizard (A/B) instead of the inline
// mechanism selector + fabric picker.
const WIZARD_TRIAL_COLLECTIONS = new Set(['1157 BANK SHOT']);

interface Props {
  params: Promise<{ id: string }>;
}

// Memoize so generateMetadata and the page component share one fetch per
// request instead of hitting the backend twice.
const getProduct = cache((id: string) => api.getProduct(id));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await getProduct(id);
    const name = [product.collection, product.color].filter(Boolean).join(' — ') || product.name;
    const description =
      `${name} — $${Number(product.retail_price).toFixed(2)} at ${SITE_NAME}. ${product.description || ''}`.trim();
    const path = `/product/${id}`;
    return {
      title: name,
      description,
      alternates: { canonical: path },
      openGraph: { type: 'website', url: path, title: name, description },
      twitter: { title: name, description },
    };
  } catch {
    return { title: 'Product Not Found', robots: { index: false, follow: false } };
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;

  let product;
  try {
    product = await getProduct(id);
  } catch {
    notFound();
  }

  const p = product;
  const displayName = [p.collection, p.color].filter(Boolean).join(' — ') || p.name;
  const hasDiscount = p.compare_at_price && p.compare_at_price > p.retail_price;
  const inStock = p.in_stock;

  const details = [
    p.type && { label: 'Type', value: p.type },
    p.category && { label: 'Category', value: p.category },
    p.room && { label: 'Room', value: p.room },
    p.material && { label: 'Material', value: p.material },
    p.material_class && { label: 'Material Class', value: p.material_class },
    p.dimensions && { label: 'Dimensions', value: p.dimensions },
    p.vendor?.name && { label: 'Brand', value: p.vendor.name },
    p.sku && { label: 'SKU', value: p.sku },
  ].filter(Boolean) as { label: string; value: string }[];

  // Warranty for this product's brand — the PDP links STRAIGHT to the
  // manufacturer's warranty (page or hosted PDF) when we have it; only brands
  // with no direct doc fall back to their section on /warranty.
  const warranty = warrantyForBrand(p.vendor?.name);

  // Made-to-order summary for fabric frames: colours we stock vs the full
  // orderable fabric library vs the production lead window.
  const inStockColors = p.variants?.filter((v) => v.in_stock).length ?? 0;
  const leadLabel =
    p.lead && (p.lead.min_weeks || p.lead.max_weeks)
      ? p.lead.min_weeks && p.lead.max_weeks && p.lead.min_weeks !== p.lead.max_weeks
        ? `${p.lead.min_weeks}–${p.lead.max_weeks} weeks`
        : `${p.lead.min_weeks || p.lead.max_weeks} weeks`
      : null;

  // Bank Shot A/B: the guided customize wizard (prompt → mechanism → fabric →
  // cart) stands in for the inline mechanism selector + fabric picker on this
  // one collection, to experience-test the flow. No renderer — the wizard shows
  // the stock chair photo only.
  const useWizard = !!p.collection
    && WIZARD_TRIAL_COLLECTIONS.has(p.collection)
    && (p.mechanisms?.length ?? 0) > 0
    && (p.fabrics?.length ?? 0) > 0;

  const productUrl = `${SITE_URL}/product/${p.id}`;
  const galleryImages = p.images ?? [];
  const absImages = galleryImages.map((u) => (u.startsWith('http') ? u : `${SITE_URL}${u}`));

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: displayName,
    ...(p.sku ? { sku: p.sku } : {}),
    ...(absImages.length ? { image: absImages } : {}),
    ...(p.description ? { description: p.description } : {}),
    ...(p.vendor?.name ? { brand: { '@type': 'Brand', name: p.vendor.name } } : {}),
    ...(p.material ? { material: p.material } : {}),
    ...(p.category ? { category: p.category } : {}),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'USD',
      price: Number(p.retail_price).toFixed(2),
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/PreOrder',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE_URL}/#organization` },
    },
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Shop', item: `${SITE_URL}/shop` },
      ...(p.category
        ? [{ '@type': 'ListItem', position: 2, name: p.category, item: `${SITE_URL}/shop/${encodeURIComponent(p.category)}` }]
        : []),
      { '@type': 'ListItem', position: p.category ? 3 : 2, name: displayName, item: productUrl },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <JsonLd data={[productLd, breadcrumbLd]} />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-brand-charcoal-light mb-8">
        <Link href="/shop" className="hover:text-brand-charcoal transition-colors">Shop</Link>
        {p.category && (
          <>
            <span>/</span>
            <Link href={`/shop/${encodeURIComponent(p.category)}`} className="hover:text-brand-charcoal transition-colors">
              {p.category}
            </Link>
          </>
        )}
        <span>/</span>
        <span className="text-brand-charcoal font-medium truncate max-w-[200px]">{displayName}</span>
      </nav>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
        {/* Full image gallery — main + thumbnails from product.images[]. */}
        <ProductGallery images={galleryImages} alt={displayName} />

        {/* Product info */}
        <div>
          {p.vendor?.name && (
            <div className="text-xs font-mono text-brand-charcoal-light uppercase tracking-widest mb-2">
              {p.vendor.name}
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-bold text-brand-charcoal leading-tight">
            {displayName}
          </h1>

          {p.sectional_piece_type && (
            <span className="inline-block mt-2 text-xs bg-brand-green-light text-brand-green px-3 py-1 rounded-full font-medium">
              Sectional — {p.sectional_piece_type}
            </span>
          )}

          {/* "Build your own sectional" CTA — only shown on sectional
              pieces. Deep-links to the /sectionals wizard with the
              family (and color, if the product has one) pre-seeded so
              the shopper doesn't have to re-pick. Phase 3.A.1. */}
          {p.sectional_piece_type && p.sectional_family && (
            <Link
              href={`/sectionals?family=${encodeURIComponent(p.sectional_family)}${p.color ? `&color=${encodeURIComponent(p.color)}` : ''}`}
              className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-yellow-dark hover:text-brand-charcoal transition-colors"
            >
              <span className="text-base">🛋</span>
              Build a complete {p.sectional_family} sectional
              <span aria-hidden>→</span>
            </Link>
          )}

          {/* Price */}
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-brand-charcoal">
              ${Number(p.retail_price).toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-brand-charcoal-light">
                Compare at{" "}
                <span className="line-through">${Number(p.compare_at_price).toFixed(2)}</span>
              </span>
            )}
          </div>

          {/* 12-month 0% monthly estimate — the Synchrony everyday program. */}
          <p className="mt-2 text-sm text-brand-charcoal-light">
            or about{" "}
            <span className="font-semibold text-brand-charcoal">${Math.ceil(Number(p.retail_price) / 12)}/mo</span>{" "}
            for 12 months —{" "}
            <Link href="/financing" className="text-brand-yellow-dark hover:underline">0% financing</Link>
          </p>

          {/* Availability */}
          <div className="mt-4">
            {inStock ? (
              <span className="text-sm text-brand-green font-medium">In Stock — Ready for delivery</span>
            ) : (
              <span className="text-sm text-brand-yellow-dark font-medium">Special Order — Ask about lead time</span>
            )}
          </div>

          {/* Bank Shot A/B: guided wizard replaces the inline mechanism selector +
              fabric picker (both skipped below when useWizard). Everywhere else:
              inline mechanism choice above colour/fabric, in-stock mechanisms link
              to their live PDP, made-to-order show priced-from; fabric is the
              faceted per-colour FabricPicker below. */}
          {useWizard ? (
            <CustomizeWizard product={p} />
          ) : p.mechanisms && p.mechanisms.length > 1 ? (
            <MechanismSelector mechanisms={p.mechanisms} currentId={p.id} />
          ) : null}

          {/* Variant siblings — colorways (Jofran/Fusion) or mattress sizes
              (MLily). Same component, axis from the backend's variant_axis. */}
          {p.variants && p.variants.length > 1 && (
            <ColorSelector variants={p.variants} currentId={p.id} axis={p.variant_axis} />
          )}

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <AddToCartButton product={{
              id: p.id,
              sku: p.sku,
              name: p.name,
              collection: p.collection,
              color: p.color,
              retail_price: p.retail_price,
              image_url: p.image_url,
              category: p.category,
            }} />
            <Link href="/locations" className="btn-outline text-base px-8 py-3 text-center">
              Visit Showroom
            </Link>
          </div>

        </div>
      </div>

      {/* Full made-to-order fabric library (Chairs America) — full-width below the
          gallery: a floated zoom window on the left with swatches flowing around
          it, so the shopper doesn't scroll and the void beside/under the window
          is filled. Priced per grade off the frame's map, SKU minted at checkout. */}
      {!useWizard && p.fabrics && p.fabrics.length > 0 && (
        <div className="mt-10 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-charcoal-light">
          {inStockColors > 0 && (
            <span>
              <span className="font-semibold text-brand-charcoal">{inStockColors}</span>{' '}
              {inStockColors === 1 ? 'colour' : 'colours'} in stock
            </span>
          )}
          {inStockColors > 0 && <span className="text-brand-border">·</span>}
          <span>
            orderable in <span className="font-semibold text-brand-charcoal">{p.fabrics.length} fabrics</span>
          </span>
          {leadLabel && (
            <>
              <span className="text-brand-border">·</span>
              <span>made to order in <span className="font-semibold text-brand-charcoal">{leadLabel}</span></span>
            </>
          )}
        </div>
      )}
      {!useWizard && p.fabrics && p.fabrics.length > 0 && (() => {
        const frame = { id: p.id, sku: p.sku, name: p.name, collection: p.collection, category: p.category, image_url: p.image_url };
        // Per-colour faceted picker once any line has verified swatches; else the
        // line-composite selector (falls back cleanly as verification progresses).
        return p.fabrics.some((f) => (f.colors?.length ?? 0) > 0)
          ? <FabricPicker frame={frame} fabrics={p.fabrics} fromPrice={Number(p.retail_price)} />
          : <FabricSelector frame={frame} fabrics={p.fabrics} fromPrice={Number(p.retail_price)} />;
      })()}

      {/* Product info — below the fabric picker (Jett): description, details,
          financing, warranty. */}
      <div className="mt-10 max-w-3xl">
        {/* Description */}
        {p.description && (
          <div>
            <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider mb-3">Description</h2>
            <p className="text-sm text-brand-charcoal-light leading-relaxed">{p.description}</p>
          </div>
        )}

        {/* Details table */}
        {details.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider mb-3">Details</h2>
            <div className="border border-brand-border rounded-lg overflow-hidden">
              {details.map((d, i) => (
                <div key={d.label} className={`flex text-sm ${i > 0 ? 'border-t border-brand-border' : ''}`}>
                  <span className="w-32 sm:w-40 shrink-0 px-4 py-3 bg-brand-warm-gray text-brand-charcoal-light font-medium">
                    {d.label}
                  </span>
                  <span className="px-4 py-3 text-brand-charcoal">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Financing note */}
        <div className="mt-8 bg-brand-warm-gray rounded-lg p-4">
          <p className="text-sm text-brand-charcoal-light">
            <span className="font-semibold text-brand-charcoal">Financing available</span> — Synchrony, Progressive Leasing, and 1st Franklin options.
            <Link href="/financing" className="text-brand-yellow-dark hover:underline ml-1">Learn more</Link>
          </p>
        </div>

        {/* Warranty note — links straight to the manufacturer's warranty (page
            or hosted PDF) when we have the doc; brands without one fall back to
            their section on /warranty. */}
        {p.vendor?.name && (
          <div className="mt-3 bg-brand-warm-gray rounded-lg p-4">
            <p className="text-sm text-brand-charcoal-light">
              <span className="font-semibold text-brand-charcoal">Warranty</span> — covered by the {p.vendor.name}{' '}manufacturer&apos;s warranty.
              {warranty?.url ? (
                <a
                  href={warranty.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-yellow-dark hover:underline ml-1"
                >
                  View {p.vendor.name} warranty
                </a>
              ) : (
                <Link
                  href={warranty ? `/warranty#${brandSlug(p.vendor.name)}` : '/warranty'}
                  className="text-brand-yellow-dark hover:underline ml-1"
                >
                  View coverage
                </Link>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Coordinate rail: the rest of this suite in the fabric you're viewing. */}
      <RelatedProducts collection={p.collection} color={p.color} excludeId={p.id} />
      {/* Comparison rail: top sellers of this category, then closest on price. */}
      <SimilarProducts
        category={p.category}
        price={Number(p.retail_price)}
        excludeCollection={p.collection}
        excludeId={p.id}
      />
    </div>
  );
}
