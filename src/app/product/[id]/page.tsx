import { cache } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import TrackEvent from '@/components/TrackEvent';
import type { Metadata } from 'next';
import AddToCartButton from '@/components/AddToCartButton';
import WishlistButton from '@/components/WishlistButton';
import ProductGallery from '@/components/ProductGallery';
import ColorSelector from '@/components/ColorSelector';
import FabricSelector from '@/components/FabricSelector';
import FabricPicker from '@/components/FabricPicker';
import MechanismSelector from '@/components/MechanismSelector';
import CustomizeWizard from '@/components/CustomizeWizard';
import RelatedProducts from '@/components/RelatedProducts';
import SimilarProducts from '@/components/SimilarProducts';
import JsonLd from '@/components/JsonLd';
import { SITE_URL } from '@/lib/site';
import { publicDescription } from '@/lib/publicDescription';
import { productTitle, productMetaDescription } from '@/lib/productTitle';
import { dimensionSchema, availabilityUrl, priceValidUntil, shippingDetailsSchema, merchantReturnPolicySchema } from '@/lib/productSchema';
import { warrantyForBrand, brandSlug } from '@/lib/warranty';
import SeeItInPerson from '@/components/SeeItInPerson';
import TrustBlock from '@/components/TrustBlock';
import FitCheck from '@/components/FitCheck';
import { brandByName } from '@/lib/brands';

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
    const name = productTitle(product);
    const description = productMetaDescription(product, publicDescription(product.description));
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
  // Feeds the <h1>, breadcrumb, gallery alt text, JSON-LD name and the
  // TrackEvent label — see lib/productTitle for why it is no longer
  // `collection — color`.
  const displayName = productTitle(p);
  // Staff use `description` as a scratch field during inventory counts, so it
  // is not safe to render unfiltered — see lib/publicDescription.
  const publicDesc = publicDescription(p.description);
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
  // Brand profile for this vendor, if we have one — links the PDP brand label
  // to the /brands story page.
  const brandProfile = brandByName(p.vendor?.name);

  // Made-to-order summary for fabric frames: colours we stock vs the full
  // orderable fabric library vs the production lead window.
  const inStockColors = p.variants?.filter((v) => v.in_stock).length ?? 0;
  const leadLabel =
    p.lead && (p.lead.min_weeks || p.lead.max_weeks)
      ? p.lead.min_weeks && p.lead.max_weeks && p.lead.min_weeks !== p.lead.max_weeks
        ? `${p.lead.min_weeks}–${p.lead.max_weeks} weeks`
        : `${p.lead.min_weeks || p.lead.max_weeks} weeks`
      : null;

  // The guided CustomizeWizard (Model B) replaces the inline mechanism selector +
  // fabric picker for every Southern Motion + Chairs America fabric frame:
  //   • Southern Motion — carries `mechanisms` (sold by reclining mechanism). The
  //     wizard uses the per-colour swatch grid when the frame has verified
  //     colours, else the fabric-line grid — so it covers ALL SoMo frames.
  //   • Chairs America — no mechanism, but a fabric-graded frame: a grade→price
  //     map (grade_prices) lets the fabric-line step price by grade. This
  //     naturally excludes the 700 sectional (per-piece, no grade map) and any
  //     CA frame not yet in the price sheet — those keep the inline picker.
  // Anything else keeps the inline picker below.
  const hasMech = (p.mechanisms?.length ?? 0) > 0;
  const hasFabrics = (p.fabrics?.length ?? 0) > 0;
  const useWizard = hasFabrics && (hasMech || p.grade_prices != null);

  const productUrl = `${SITE_URL}/product/${p.id}`;
  const galleryImages = p.images ?? [];
  const absImages = galleryImages.map((u) => (u.startsWith('http') ? u : `${SITE_URL}${u}`));

  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    name: displayName,
    ...(p.sku ? { sku: p.sku } : {}),
    // The vendor's own part number ("101-113-14" is Southern Motion's), which is
    // how Google decides our listing and a discounter's listing are the same
    // physical product. Without it we cannot win the shared-SKU comparison at
    // all. A true `gtin` would be better still, but no UPC exists on the record
    // — sourcing those from vendors is the outstanding data task.
    ...(p.sku ? { mpn: p.sku } : {}),
    ...(absImages.length ? { image: absImages } : {}),
    ...(publicDesc ? { description: publicDesc } : {}),
    ...(p.vendor?.name ? { brand: { '@type': 'Brand', name: p.vendor.name } } : {}),
    ...(p.material ? { material: p.material } : {}),
    ...(p.category ? { category: p.category } : {}),
    // Parsed out of the free-text `dimensions` string that 43% of the catalog
    // carries; blank axes are omitted rather than guessed.
    ...dimensionSchema(p.dimensions),
    offers: {
      '@type': 'Offer',
      url: productUrl,
      priceCurrency: 'USD',
      price: Number(p.retail_price).toFixed(2),
      priceValidUntil: priceValidUntil(),
      availability: availabilityUrl(!!inStock),
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE_URL}/#organization` },
      ...(shippingDetailsSchema(!!inStock) ?? {}),
      ...merchantReturnPolicySchema(!!p.clearance),
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
      <JsonLd id="ld-product" data={[productLd, breadcrumbLd]} />
      {/* First-party product view — feeds the Website dashboard's "what are people
          looking at" panel, and the viewed-a-lot / cannot-buy signal. */}
      <TrackEvent type="product_view" productId={p.id} sku={p.sku} name={displayName}
        price={p.retail_price} category={p.category} />
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
              {brandProfile ? (
                <Link href={`/brands/${brandProfile.slug}`} className="hover:text-brand-charcoal transition-colors">
                  {p.vendor.name}
                </Link>
              ) : (
                p.vendor.name
              )}
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
          </div>

          {/* 12-month 0% monthly estimate — the Synchrony everyday program. */}
          <p className="mt-2 text-sm text-brand-charcoal-light">
            or about{" "}
            <span className="font-semibold text-brand-charcoal">${Math.ceil(Number(p.retail_price) / 12)}/mo</span>{" "}
            for 12 months —{" "}
            <Link href="/financing" className="text-brand-yellow-dark hover:underline">0% financing</Link>
          </p>

          {/* Availability.
              "Ask about lead time" was the old out-of-stock line, and it asked
              the customer a question we already know the answer to. Every one of
              the 527 published-but-unstocked products has vendor lead weeks on
              file — checked 2026-08-04, zero missing — and this page already
              computes `leadLabel` from them for the made-to-order colourway
              copy below. So the number was on the page the whole time; the
              availability badge just was not using it.
              Why it matters here specifically: this is the moment someone
              decides. A shopper who reaches checkout and only THEN discovers a
              4-6 week wait goes back to the cart and leaves, which is exactly
              the session that prompted this (Barrett Ottoman, 2026-08-04).
              The vague fallback survives for anything genuinely missing lead
              data — better to ask than to invent a date. */}
          <div className="mt-4">
            {inStock ? (
              <span className="text-sm text-brand-green font-medium">In Stock — Ready for delivery</span>
            ) : leadLabel ? (
              <span className="text-sm text-brand-yellow-dark font-medium">
                Made to Order — ships in {leadLabel}
              </span>
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
              // Same two values the availability badge above renders, carried
              // into the cart line so the wait follows the item instead of
              // being discovered at the delivery step.
              in_stock: inStock,
              lead_label: leadLabel,
            }} />
            <WishlistButton productId={p.id} />
            <Link href="/locations" className="btn-outline text-base px-8 py-3 text-center">
              Visit Showroom
            </Link>
          </div>

          <FitCheck dimensions={p.dimensions} />
          <TrustBlock />

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

      {/* Where can I see this in person? Sits directly under the buy area:
          "I want to try it first" is the biggest objection on a sofa, so the
          answer belongs next to the decision, not buried under the spec table.
          Renders nothing when the piece is on no floor. */}
      <SeeItInPerson onDisplayAt={p.on_display_at} onDisplaySiblings={p.on_display_siblings} />

      {/* Product info — below the fabric picker (Jett): description, details,
          financing, warranty. */}
      <div className="mt-10 max-w-3xl">
        {/* Description */}
        {publicDesc && (
          <div>
            <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider mb-3">Description</h2>
            <p className="text-sm text-brand-charcoal-light leading-relaxed">{publicDesc}</p>
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
