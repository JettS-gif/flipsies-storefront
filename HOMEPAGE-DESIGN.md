# Flipsies Storefront — Homepage & Website Design Direction

Derived from the 2026-07 strategy session. This steers the relaunch of the owned
Next.js storefront that replaces the outsourced www.flipsiesfurniture.com.

## North star
Flipsies is the **honest, no-haggle, everyday-low, in-stock-now** furniture store.
The site's #1 job is to **lead with what's in stock ("take it home today")** and
carry the pricing/position that differentiates us in a market full of sale games.
Every design choice serves that.

## What the old site got wrong (do the opposite)
- Says "In-Stock Now!" but shows **one undifferentiated catalog** with no
  availability indicator → drives leads to non-stocked special-order items that
  rarely convert. **Fix: in-stock is the default; availability is on every card.**
- **No prices shown.** EDLP only works if the low, honest price is visible. **Show prices.**
- **Only the Irondale address.** **Feature both showrooms** (Hoover is the top producer).
- **No no-haggle / price-match / everyday-low messaging.** **Lead with the position.**

## Homepage, top to bottom
1. **Hero** — headline on the position + in-stock: e.g. *"Honest everyday prices.
   No haggling. In stock — take it home today."* Primary CTA **Shop In-Stock Now**;
   secondary **Visit a Showroom**. Show a real in-stock hero product with its price.
2. **Trust strip** (immediately under hero) — three icons/claims: **No-Haggle Pricing ·
   Price-Match Guarantee · In Stock, Delivered Fast**. This is the differentiator; put it high.
3. **Shop by category** — Living Room, Recliners/Motion, Sectionals, Bedroom, Dining,
   Mattress, Home Decor. Category tiles link to **in-stock-filtered** listings by default.
4. **In-Stock spotlight** — a rail of actual available products (hero brands: Catnapper,
   Southern Motion, Fusion recliners; the sectionals that turn), each with price +
   "In Stock — Hoover/Irondale" badge + "Take it home today."
5. **Both showrooms** — Hoover + Irondale cards with address, hours, map, phone, photo.
6. **Why Flipsies / the position** — short: everyday low + no games + real brands + in stock.
   Social proof: Google reviews pulled in.
7. **Financing + Delivery** — quick reassurance links (pages already exist).
8. **Footer** — locations, contact, policies, email/SMS signup (feeds the owned-audience flywheel).

## Sitewide product rules
- **Availability badge on EVERY product card and PDP**: `In Stock — {showroom}` (green)
  vs `Special Order — ~{N} weeks` (neutral). Never let special-order masquerade as available.
- **In-stock is the default browse/filter.** Special-order items are published for
  breadth/SEO but clearly labeled and filterable OUT — a distinct experience, not mixed in.
- **Prices always visible** (the EDLP proof). Show the everyday price; no fake strikethroughs.
- **Clearance/closeout section** — the dead/closeout tail (e.g. Bella Donna cherry) lives
  here, priced to clear. Framed as "when it's gone it's gone" — reinforces in-stock urgency,
  never a timed "sale" (that would retrain wait-for-sale behavior).
- **Phase-2: color/finish variants on one listing** — e.g. stocked "Rustic Shores" cabinet
  shows all catalog finishes as swatches; stocked finish = In Stock, others = Special Order.

## Voice & copy
- Lead on **consistency + honesty**: *"Same honest price every day. No haggling.
  No waiting for a sale."* — unassailable. Use "lowest / we'll match anyone" only where
  we genuinely win exact SKUs (branded goods), backed by the price-match guarantee.
- Urgency comes from **availability/newness** ("in stock, take it home today," "just
  arrived"), NEVER from a discount deadline. No "sale ends Monday."
- Sell the **product and the experience**, not manufacturer names (buyers recognize
  stores, not Catnapper/SoMo).

## Launch checklist (cutover from outsourced site)
- [ ] Content: fill images + dimensions (dealer-portal feeds; office-staff worklist CSV)
- [ ] Homepage + info pages (financing, delivery, locations, contact) with real copy
- [ ] Availability badges + in-stock-default browse wired
- [ ] Prices visible; clearance section
- [ ] Deploy to staging, QA (checkout, availability check, mobile)
- [ ] 301-redirect old URLs → new (preserve SEO); update Google Business Profile (both stores)
- [ ] GA4 + UTM attribution live; "how did you hear about us" on lead/checkout
- [ ] Cut DNS (Jett controls it)

## Measurement note
The site is where the ~$28k/mo ad spend finally becomes measurable — UTM every ad,
attribute every lead/checkout, so channel ROAS can be judged against the ~$361k/mo
break-even target. See memory: flipsies-marketing, flipsies-strategy-edlp.
