import Link from 'next/link';
import { api, type Product } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { pageMetadata } from '@/lib/site';

export const metadata = pageMetadata({
  title: 'Deals & Clearance',
  description:
    'Clearance on discontinued-but-in-stock pieces plus the lowest-priced item in every room at Flipsies Furniture.',
  path: '/deals',
});

// Deals is two genuine value plays — NOT a Hi-Lo "% off" sale (EDLP intact):
//   1. Clearance: vendor-exited lines we still hold stock of. Final units,
//      not reorderable — the storefront `clearance` flag surfaces them here.
//   2. Lowest price in each room: the entry-price piece per room, so a shopper
//      scanning for the best value has one place to look.
// Both are server-fetched (revalidate 60 in api.ts) and fail soft to an empty
// section rather than crashing the page.

// Rooms we lead with, in merchandised order. Any other room the catalog
// returns is appended after these (Accessories always last — it's decor, not
// a furniture entry-price signal shoppers come to Deals for).
const ROOM_ORDER = ['Living Room', 'Bedroom', 'Dining Room', 'Mattresses', 'Office'];

function orderRooms(rooms: string[]): string[] {
  const known = ROOM_ORDER.filter(r => rooms.includes(r));
  const rest = rooms
    .filter(r => !ROOM_ORDER.includes(r) && r !== 'Accessories')
    .sort();
  const accessories = rooms.includes('Accessories') ? ['Accessories'] : [];
  return [...known, ...rest, ...accessories];
}

async function fetchClearance(): Promise<Product[]> {
  try {
    const res = await api.getProducts({
      clearance: 'true',
      availability: 'in_stock',
      sort: 'price_asc',
      // Lone sectional pieces (LSF/RSF/Corner) don't stand alone as Deals tiles —
      // they're still flagged clearance + buyable via the builder, just not shown
      // here. Whole pieces (sofas/chairs/ottomans) still surface.
      exclude_sectionals: 'true',
      limit: 48,
    });
    // Keep blank-image items off the marquee (Jett's rule: no dark tiles). They
    // stay flagged clearance + in /shop; they graduate onto the rail once imaged.
    return res.data.filter(p => !!p.image_url);
  } catch {
    return [];
  }
}

async function fetchLowestByRoom(): Promise<{ room: string; items: Product[] }[]> {
  let rooms: string[] = [];
  try {
    rooms = (await api.getCategories()).rooms || [];
  } catch {
    return [];
  }
  const ordered = orderRooms(rooms);
  const rails = await Promise.all(
    ordered.map(async room => {
      try {
        const res = await api.getProducts({
          room,
          availability: 'in_stock',
          sort: 'price_asc',
          exclude_sectionals: 'true',
          // Floor out $0 / unpriced component rows (foundations, package parts)
          // that price_asc would otherwise surface as bogus "lowest price" tiles.
          price_min: 1,
          limit: 4,
        });
        return { room, items: res.data };
      } catch {
        return { room, items: [] as Product[] };
      }
    }),
  );
  // Drop rooms that returned nothing so we never render an empty rail.
  return rails.filter(r => r.items.length > 0);
}

export default async function DealsPage() {
  const [clearance, lowestByRoom] = await Promise.all([
    fetchClearance(),
    fetchLowestByRoom(),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-brand-charcoal">Deals &amp; Clearance</h1>
        <p className="text-brand-charcoal-light mt-3 max-w-xl mx-auto">
          Clearance on discontinued pieces we still have in stock — final units,
          while they last — plus the lowest-priced piece in every room.
        </p>
      </header>

      {/* ── Clearance — the reorient centerpiece ─────────────────────── */}
      {clearance.length > 0 && (
        <section className="mb-14">
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <div>
              <h2 className="text-2xl font-bold text-brand-charcoal">Clearance — Final Units</h2>
              <p className="text-sm text-brand-charcoal-light mt-1">
                Discontinued lines we still hold stock of. Once they&apos;re gone,
                they&apos;re gone — these can&apos;t be reordered.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {clearance.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── Lowest price in each room ─────────────────────────────────── */}
      {lowestByRoom.map(({ room, items }) => (
        <section key={room} className="mb-12">
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <h2 className="text-xl font-bold text-brand-charcoal">
              Lowest Prices in {room}
            </h2>
            <Link
              href={`/shop?room=${encodeURIComponent(room)}&sort=price_asc`}
              className="text-sm font-semibold text-brand-yellow-dark hover:underline whitespace-nowrap"
            >
              Shop all →
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {items.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ))}

      {/* ── Empty state — only when BOTH sections are empty ───────────── */}
      {clearance.length === 0 && lowestByRoom.length === 0 && (
        <div className="text-center bg-brand-warm-gray rounded-2xl p-10 max-w-2xl mx-auto">
          <div className="text-4xl mb-4">🏷️</div>
          <h2 className="text-xl font-semibold text-brand-charcoal mb-2">
            No active deals at the moment
          </h2>
          <p className="text-sm text-brand-charcoal-light mb-6">
            Our clearance picks rotate as we sell through discontinued stock.
            Check back soon, or browse the full catalog.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/shop" className="btn-brand text-sm">Browse the Catalog</Link>
            <Link href="/locations" className="btn-outline text-sm">Visit a Showroom</Link>
          </div>
        </div>
      )}
    </div>
  );
}
