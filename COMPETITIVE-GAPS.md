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
| **Email/SMS marketing capture** | ❌ none anywhere | All, with incentive | **Now the #1 open item** |
| **PDP trust block** (price-match, returns) | ❌ absent | Standard | Blocked on terms |
| Protection-plan attach | ❌ | Bob's Goof Proof, LS Care Free | Tier 2 |
| Cart cross-sell | ❌ | RTG core | Tier 2 |
| Live chat / SMS concierge | ❌ | LS, Bob's, RTG | Tier 2 |
| Shop by Style | ❌ | LS 12+ styles | Tier 2 |
| `/accessibility` page | ❌ 308s to `/contact` | Standard for retail | Tier 2 |
| 3D room designer / AR | ❌ | LS 3D | Tier 3 |
| Product Q&A | ❌ | Some | Tier 3 |
| Loyalty / rewards | ❌ | Some | Tier 3 |

## To-do list

### Blocked on a decision — these are the bottleneck
1. **PDP trust block** — needs the actual return window + price-match terms. Best value per answer:
   it also unblocks `hasMerchantReturnPolicy` + `shippingDetails` in the Product schema.
2. **Email/SMS capture** — needs a decision on where the list lives (Klaviyo / Mailchimp /
   DeliverDesk). **This is now the highest-value open item**: it is the owned-audience flywheel the
   site exists to build, and with ~$28k/mo of ad spend attributed to `in_store` a UTM-stamped
   capture is also the measurement fix.
3. **Three Meta pixels** fire on every page with no consent banner — confirm which are intentional.
   Duplicates double-count conversions and distort the ROAS work.
4. **`/accessibility`** — needs real policy text, not generated filler.
5. **Cart cross-sell** — needs merchandising calls and whether a protection plan exists.

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

The 2026-07-15 version named four: email/SMS, financing, reviews, delivery-date. **Financing and
delivery-date have shipped, and reviews have been correctly demoted** on the sales-distribution
evidence. What is left:

1. **Email/SMS capture** — the owned audience, and the fix for $28k/mo of blind attribution.
2. **The PDP trust block** — price-match and returns are the exact contrast against the
   discounters' weakness, it is static copy, and it is blocked only on you naming the terms.
3. **Let the SEO work land.** Navigation was completely broken until 2026-08-05, so the site has
   never actually been crawlable. Give it a quarter before judging whether PDP traffic justifies
   the Tier-2 build-out — the traffic baseline you have today was measured against a broken site.
