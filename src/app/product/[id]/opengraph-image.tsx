import { ImageResponse } from 'next/og';
import { api } from '@/lib/api';
import { BRAND, SITE_NAME } from '@/lib/site';

// Per-product social share card: product name + price + availability on a
// branded frame. We render the catalog facts rather than the remote photo
// — satori's image fetch is the flakiest part of OG generation, and a
// reliable branded card beats an occasionally-broken one.
export const alt = `${SITE_NAME} product`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let name = SITE_NAME;
  let price: string | null = null;
  let inStock = false;
  try {
    const p = await api.getProduct(id);
    name = [p.collection, p.color].filter(Boolean).join(' — ') || p.name;
    price = `$${Number(p.retail_price).toFixed(2)}`;
    inStock = !!p.in_stock;
  } catch {
    // Fall back to a generic branded card.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BRAND.white,
          padding: 80,
        }}
      >
        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 14,
              background: BRAND.yellow,
              color: BRAND.charcoal,
              fontSize: 42,
              fontWeight: 800,
              marginRight: 20,
            }}
          >
            F
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: BRAND.charcoal }}>{SITE_NAME}</div>
        </div>

        {/* Product name */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            maxWidth: 1040,
            fontSize: 66,
            fontWeight: 800,
            color: BRAND.charcoal,
            lineHeight: 1.1,
          }}
        >
          {name}
        </div>

        {/* Price + availability */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {price ? (
            <div style={{ fontSize: 58, fontWeight: 800, color: BRAND.charcoal, marginRight: 28 }}>
              {price}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              fontSize: 30,
              fontWeight: 600,
              padding: '10px 26px',
              borderRadius: 999,
              background: inStock ? BRAND.green : BRAND.yellow,
              color: inStock ? BRAND.white : BRAND.charcoal,
            }}
          >
            {inStock ? 'In Stock' : 'Special Order'}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
