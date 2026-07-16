import Link from 'next/link';
import type { Facets, ShopSearchParams } from '@/lib/shopFilters';
import { PRICE_BUCKETS, buildHref, activeFilterCount } from '@/lib/shopFilters';

// Left-rail retail filters for /shop. Server component by design: every option
// is a plain <Link> that patches the URL, so filtered views are shareable,
// crawlable and work with the back button — no client state, no hydration.
//
// Facet counts come from the cached /storefront/facets. Options with a zero
// count never render (the endpoint only emits what exists), so the panel can't
// offer a dead end.
//
// Not built: material. It's populated on 23 of 2752 published rows (0.8%), so a
// material filter would render an empty list — revisit if it ever gets
// backfilled. Color is grouped into families rather than exposing the raw
// `color` values: there are 445 of them and most are vendor fabric names
// ("Grande Mist") nobody shops by. See DeliverDeskBackEnd/utils/colorFamily.js.

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-brand-border pt-4 mt-4 first:border-0 first:pt-0 first:mt-0">
      <h3 className="text-xs font-semibold text-brand-charcoal uppercase tracking-wider mb-2">{title}</h3>
      {children}
    </div>
  );
}

function Option({
  href, active, label, count,
}: { href: string; active: boolean; label: string; count?: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
        active
          ? 'bg-brand-warm-gray text-brand-charcoal font-semibold'
          : 'text-brand-charcoal-light hover:text-brand-charcoal hover:bg-brand-warm-gray'
      }`}
    >
      <span className="flex items-center gap-1.5 min-w-0">
        {/* A tick, not a checkbox input — these are links, and a real checkbox
            would imply form semantics that don't exist here. */}
        <span aria-hidden className={`text-[10px] ${active ? 'opacity-100' : 'opacity-0'}`}>✓</span>
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined && (
        <span className="text-[11px] text-brand-charcoal-light/70 tabular-nums shrink-0">{count}</span>
      )}
    </Link>
  );
}

export default function ShopFilters({
  facets,
  sp,
}: {
  facets: Facets;
  sp: ShopSearchParams;
}) {
  const nActive = activeFilterCount(sp);

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-sm font-semibold text-brand-charcoal uppercase tracking-wider">Filter</h2>
        {nActive > 0 && (
          <Link
            href={buildHref({ search: sp.search }, {})}
            className="text-xs text-brand-yellow-dark hover:underline"
          >
            Clear all ({nActive})
          </Link>
        )}
      </div>

      <Section title="Availability">
        {facets.availability
          .filter(o => o.count > 0)
          .map(o => {
            const active = sp.availability === o.value;
            return (
              <Option
                key={o.value}
                href={buildHref(sp, { availability: active ? null : o.value })}
                active={active}
                label={o.label ?? o.value}
                count={o.count}
              />
            );
          })}
      </Section>

      <Section title="Price">
        {PRICE_BUCKETS.map(b => {
          const active = sp.price_min === (b.min ?? undefined) && sp.price_max === (b.max ?? undefined);
          return (
            <Option
              key={b.label}
              href={buildHref(sp, {
                price_min: active ? null : (b.min ?? null),
                price_max: active ? null : (b.max ?? null),
              })}
              active={active}
              label={b.label}
            />
          );
        })}
      </Section>

      {facets.rooms.length > 0 && (
        <Section title="Room">
          {facets.rooms.map(o => {
            const active = sp.room === o.value;
            return (
              <Option
                key={o.value}
                href={buildHref(sp, { room: active ? null : o.value })}
                active={active}
                label={o.value}
                count={o.count}
              />
            );
          })}
        </Section>
      )}

      {facets.colorFamilies.length > 0 && (
        <Section title="Color">
          {facets.colorFamilies.map(o => {
            const active = sp.color_family === o.value;
            return (
              <Option
                key={o.value}
                href={buildHref(sp, { color_family: active ? null : o.value })}
                active={active}
                label={o.value}
                count={o.count}
              />
            );
          })}
        </Section>
      )}

      {facets.brands.length > 0 && (
        <Section title="Brand">
          {/* 55 brands is a scroll, not a list — the long tail is single-product
              vendors nobody filters by. Cap the rail and let it scroll. */}
          <div className="max-h-64 overflow-y-auto pr-1 -mr-1">
            {facets.brands.map(o => {
              const active = sp.brand === o.value;
              return (
                <Option
                  key={o.value}
                  href={buildHref(sp, { brand: active ? null : o.value })}
                  active={active}
                  label={o.value}
                  count={o.count}
                />
              );
            })}
          </div>
        </Section>
      )}
    </div>
  );
}
