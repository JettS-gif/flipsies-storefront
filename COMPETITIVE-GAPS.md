# Storefront competitive gap analysis + roadmap

Original teardown: 2026-07-15. **Refreshed 2026-08-05** after the adversarial audit
(`docs/projects/storefront-adversarial-review-2026-08-05.md`) and the eight fixes that shipped
against it. Comps reviewed: **Rooms To Go** and **Living Spaces** (live homepage teardown),
**Bob's Discount Furniture**, **Ashley**, **Wayfair** (known feature sets).

> **Why this doc was refreshed.** Between 2026-07-15 and 2026-08-05 the roadmap moved much further
> than this file reflected — financing, lead-time availability, wishlist, brand pages, warranty deep
> links, package cards, the CustomizeWizard, the sectional builder and PLP filters had all shipped
> while this doc still listed them as ❌. It was actively misdirecting effort. Every row below was
> re-verified against the source on 2026-08-05; the counts are measured, not estimated.

**Bob's is still the strategic north-star comp** — it built a national brand on EDLP /
no-fake-sales / honest everyday pricing, which is exactly the position Flipsies is taking. It
proves the model scales. Don't try to out-feature Wayfair; win on honest pricing + local, in-stock,
take-it-home-today delivery.

## Where Flipsies already MATCHES or BEATS the field (protect these)
- **Real-time local delivery availability + slot pricing** — the Check-Delivery engine
  (ZIP → actual driver-capacity slots + price) is *better* than the national comps, who only
  estimate a window. They ship in weeks; you deliver this week. This is the moat.
- **In-stock-first / take-it-home-today** — most national comps are special-order.
- **EDLP / no-haggle / price-match** — matches Bob's; beats the Hi-Lo players (RTG, Ashley) who
  train customers to wait for the next "sale." As of 2026-08-05 the storefront no longer shows a
  struck-through compare-at price on products, so the position is now consistent end-to-end.
  (Printed floor tags still carry it — deliberate, and a different codebase.)
- **Both showrooms, order tracking, sectional builder, in-store pickup (BOPIS).**
- **Search quality** — "couch", "kitchen table", "sofa bed", "bunk bed" all resolve through the
  synonym map. Verified clean across 12 customer-language probes.

## Closeout / online-discounter set (1StopBedrooms, AFA Stores, Coleman Furniture, etc.)
These sell the **same manufacturer SKUs you carry**, online-only, at aggressive prices — your most
direct price + SEO competition. What they teach:

- **Reviews are their trust engine.** 1StopBedrooms displays ~50,000 reviews across 8+ platforms.
  **See the correction below — this is no longer Flipsies' #1 item, and the 2026-07-15 plan for
  getting there was wrong.**
- **Financing as a headline.** ✅ Shipped — Synchrony + Progressive with a "from $X/mo" estimate on
  the PDP.
- **Model-level SEO.** They rank for exact model names. ✅ The two things that gated this shipped
  2026-08-05: PDP titles now carry brand + collection + colour + category noun, and `mpn` is in the
  Product JSON-LD, which is how Google matches your listing to the same model they sell.

**Where you beat them — now on every PDP except the trust block:**
- **Delivery speed & certainty.** Their weakness is your strength: opaque multi-week freight.
- **No-haggle vs their negotiation**, without copying the fake "% off."
- **Real showrooms + a local team.** They have none.

## ⚠️ Correction to the 2026-07-15 reviews plan

The old version of this doc said to "stand up a collection loop off the **existing post-delivery
review email in DeliverDesk**." **That produces nothing usable.** That loop
(`utils/reviewEmail.js`, `utils/reviewRequestSms.js`) sends customers to `g.page/r/...` — Google
**business** reviews. Flipsies never receives the content; the code says so outright. It cannot
feed `Product.aggregateRating`, and putting a business rating on a Product is a structured-data
violation that risks a manual action.

**Product reviews are deferred on the measured sales distribution** (2026-08-05): of 2,309
published products, **810 have ever sold** and **508 of those sold exactly once**; only **5 have
sold 10+ times**. At ~175 deliveries/month × 2.2 products, most PDPs would show "5.0 (1)", which
reads thinner than no stars at all.

**If revisited, aggregate at COLLECTION level** — 424 collections have sold, 69 with 5+ sales, 30
with 10+, top collection 61. Roughly 30 collections could reach a credible count within a year.

**Meanwhile the Google loop is the better investment** and it now actually works: `delivered_at`
was only being stamped by one of two write paths, so two-thirds of completed deliveries were never
eligible for the ask. Fixed 2026-08-05 with a DB trigger. The channel performs well — **20 link
clicks on 62 texts, ~32%.**

## Gap scorecard (re-verified 2026-08-05)

| Capability | Flipsies | Field | Status |
|---|---|---|---|
| Category / room navigation | ✅ **fixed 2026-08-05** — was 100% broken | Standard | Was the single most damaging defect on the site |
| Product images / gallery / zoom | ✅ gallery; **236** SKUs imageless (was mis-stated as 2,184) | Rich | Content backfill |
| Image weight / page speed | ✅ **fixed 2026-08-05** — PDP 20.6MB → 0.43MB first paint | — | — |
| PDP titles / model-level SEO | ✅ **fixed 2026-08-05** — duplicate titles 936 → 233 | — | — |
| Structured data (`mpn`, dims, ItemList) | ✅ shipped 2026-08-05 | — | `gtin` blocked: no UPCs in catalog |
| Pagination | ✅ **fixed 2026-08-05** — 640 products were unreachable | Standard | — |
| Dimensions & specs on PDP | Partial — **57%** have no dimensions | Standard | Content backfill |
| PLP filtering & sorting | ✅ shipped (facets, price buckets, sorts) | LS extensive | — |
| Financing + "from $X/mo" on PDP | ✅ shipped (Synchrony + Progressive) | All prominent | — |
| Delivery-date / lead time on PDP | ✅ shipped | Standard | — |
| Wishlist / favorites | ✅ shipped | All | — |
| Brand pages + warranty deep links | ✅ shipped | Some | — |
| Package / "complete the room" cards | ✅ on browse | RTG core | Cart cross-sell still open |
| Footer social links | ✅ shipped | All | — |
| **Reviews & ratings** | ❌ none | All comps | **Deferred — see correction above** |
| Email/SMS marketing capture | ✅ shipped 2026-08-05 | All, with incentive | List + unsubscribe live; **no SENDER yet** |
| PDP trust block (price-match, returns) | ✅ shipped 2026-08-05 | Standard | + `/returns` policy page |
| Abandoned-checkout capture | ✅ shipped 2026-08-05 | Standard | Was losing every checkout visitor |
| `/accessibility` page | ✅ shipped 2026-08-05 | Standard for retail | No conformance claim — no audit done |
| Protection-plan attach | ❌ | Bob's Goof Proof, LS Care Free | Tier 2 |
| Cart cross-sell | ❌ | RTG core | **Dropped — no cart traffic** |
| Live chat / SMS concierge | ❌ | LS, Bob's, RTG | Tier 2 |
| Shop by Style | ❌ | LS 12+ styles | Tier 2 |
| **Brand / vendor search** | ❌ **structurally dead** | Standard | `jofran` → 0 against 266 published |
| 3D room designer / AR | ❌ | LS 3D | Tier 3 |
| Product Q&A | ❌ | Some | Tier 3 |
| Loyalty / rewards | ❌ | Some | Tier 3 |

## To-do list

### Shipped 2026-08-05 (was the top of this list)
The trust block, `/returns`, the full returns policy, `hasMerchantReturnPolicy` + `shippingDetails`,
compare-at removal, the email/SMS capture with a compliant unsubscribe, abandoned-checkout capture,
and `/accessibility` all landed. See `docs/inbox/2026-08-05-*` for the detail.

### Blocked on a decision — these are the bottleneck now
1. **How marketing email SENDS.** The list and unsubscribe exist; nothing sends to them. Outlook/
   Graph works and already polls the inbox (so NDR handling has a precedent), but Exchange Online
   caps at 30 msg/min and 10k recipients/day, and — the deciding risk — sending marketing from the
   same mailbox as transactional mail couples their sender reputation. Recommendation: own the list,
   rent the sending, and send from a **subdomain** so reputation is isolated.
2. **The 4,054 existing customers.** 1,785 have an email but there is no consent record anywhere.
   Email needs only an unsubscribe (CAN-SPAM); marketing SMS needs express written consent (TCPA) and
   must not be sent. A re-permission email would convert maybe 10–30% into a list we can legally use.
   **Blocked on #1** — you need a sender before you can ask.
3. **Three Meta pixels** fire on every page with no consent banner — confirm which are intentional.
   Duplicates double-count conversions and distort the ROAS work. Check Events Manager → Data
   Sources for events received in the last 30 days, and check Audiences BEFORE deleting anything.
4. **Cart cross-sell** — dropped rather than parked. There is no cart traffic to optimise; one
   completed web order exists and it was a $4.37 test.

### The gap that outranks most of Tier 2
**Brand/vendor search returns nothing.** `jofran` finds 0 against 266 published Jofran products,
because public search covers name/sku/collection/color/category and never joins `vendors`. No brand
name is searchable at all — on a site whose whole SEO play is model-level and brand-led. Found
2026-08-05; see `docs/inbox/2026-08-05-unmet-demand-recheck-and-jasmine-reprice.md`.

### Content backfill — the office lane, ranked by leverage
6. **`type` is blank on 63%** of the catalog and feeds every product title. Highest-return field.
7. **Rewrite the 20 package descriptions** — 13 were publishing wholesale cost and vendor price
   breaks. A code guard hides them today; the data is still there.
8. **Null the 177 product descriptions** carrying inventory-count notes.
9. **Give staff a field that is not `description`** for count notes — this is the root cause. Skip
   it and the same 177 rows need cleaning after the next count.
10. **91 duplicate titles** remain; they are genuine data twins with nothing to tell them apart.
    Populating `color` or `type` separates them automatically.
11. **236 imageless products** — suppressed from the sitemap already, so this is now a conversion
    task rather than an SEO one.
12. Merge the three `Dresser & Mirror` spellings; clear `- DISCONTINUED` off 8 collection names;
    decide whether to populate or retire the `Storage + Display` room (0 products); the `Rug` room
    has 1 product against 66 in the `Rug` category.

### Still unverified — needs a real browser
13. **Rendered Core Web Vitals.** First-paint image bytes fell ~98% on PDPs and ~99.9% on room
    pages on 2026-08-05; none of that is confirmed against real LCP/CLS/INP.
14. **Mobile layout** across the PDP, the restructured room pages, and checkout.
15. **A full checkout completion** against live Stripe.

### Tier 2 — differentiation & AOV
16. Protection-plan attach. 17. Live chat or SMS concierge. 18. Shop-by-Style landing pages.

### Tier 3 — later
19. 3D room designer / AR. 20. Product Q&A. 21. Loyalty / rewards.

## The three that matter most now

The 2026-07-15 version named four: email/SMS, financing, reviews, delivery-date. All four are
resolved — financing and delivery-date shipped, email/SMS capture shipped 2026-08-05, and reviews
were correctly demoted on the sales-distribution evidence. What is left is different and more basic:

1. **Find out whether anyone CAN buy.** Three web orders exist in the site's history; the only
   completed one is a $4.37 internal test. Two real customers — $82.50 and $2,000.83 — generated
   invoices and both auto-voided unpaid. That is not proof checkout is broken, but it is the largest
   unknown on the site and it outranks every feature below it.
2. **Fix brand search.** 266 published products are unreachable by their own brand name, on a site
   whose SEO strategy is brand- and model-led.
3. **Let the SEO work land.** Navigation was completely broken until 2026-08-05, so the site has
   never actually been crawlable. Give it a quarter before judging whether PDP traffic justifies the
   Tier-2 build-out — every traffic number you have was measured against a site Google could not
   properly crawl.
