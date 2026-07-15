# Storefront competitive gap analysis + roadmap

Date: 2026-07-15. Comps reviewed: **Rooms To Go** and **Living Spaces** (live homepage
teardown), **Bob's Discount Furniture**, **Ashley**, **Wayfair** (known feature sets).

**Bob's is the strategic north-star comp** — it built a national brand on EDLP /
no-fake-sales / honest everyday pricing, which is exactly the position Flipsies is
taking. It proves the model scales. Don't try to out-feature Wayfair; win on honest
pricing + local, in-stock, take-it-home-today delivery.

## Where Flipsies already MATCHES or BEATS the field (protect these)
- **Real-time local delivery availability + slot pricing** — the Check-Delivery engine
  (ZIP → actual driver-capacity slots + price) is *better* than the national comps, who
  only estimate a window. They ship in weeks; you deliver this week. This is a moat.
- **In-stock-first / take-it-home-today** — most national comps are special-order. Your
  in-stock model is a genuine differentiator. Lean in.
- **EDLP / no-haggle / price-match** — matches Bob's; beats the Hi-Lo players (RTG,
  Ashley) who train customers to wait for the next "sale."
- **Both showrooms, order tracking, sectional builder, in-store pickup (BOPIS)** — present
  and on par with the field.

## Closeout / online-discounter set (1StopBedrooms, AFA Stores, Coleman Furniture, etc.)
These sell the **same manufacturer SKUs you carry**, online-only, at aggressive prices —
your most direct price + SEO competition (a shopper who searches a model number lands on
them). What they teach:

- **Reviews ARE the business.** 1StopBedrooms displays **~50,000 reviews across 8+ platforms**
  front-and-center (Shopper Approved 17,318 · eKomi 15,880 · Trustpilot 16,143). For an
  unknown online furniture brand, third-party review *volume* is *the* thing that makes a
  stranger comfortable spending $2k sight-unseen. **This promotes reviews from "nice-to-have"
  to the #1 online trust must-do for Flipsies.**
- **Financing as a headline.** "0% APR for up to 36 months with Affirm" is a hero message,
  not a footnote — reinforces the financing-surfacing priority.
- **Model-level SEO.** They rank for exact model names ("Rawcliffe 5 Piece Sectional") and
  curate "Top 10" lists. You stock overlapping SKUs — every PDP is a chance to rank for that
  model *in your metro* and win it on price-match + local delivery.

**Where you beat them — put this on every PDP:**
- **Delivery speed & certainty.** Their weakness is exactly your strength: opaque multi-week
  freight, no clear lead times, no white-glove detail. You're in-stock, local, same-week,
  take-it-home-today.
- **No-haggle vs their negotiation.** 1StopBedrooms runs phone-based price haggling and
  Hi-Lo "% off" framing. Your honest fixed price + price-match guarantee neutralizes their
  price edge on shared SKUs *without the games* — don't copy the fake "% off."
- **Real showrooms + a local team.** They have none. Sit-test it, see it today, talk to a person.

## Gap scorecard
| Capability | Flipsies | Field | Priority |
|---|---|---|---|
| Product images / gallery / zoom | Partial — 2,184 SKUs missing | Rich | Tier 0/1 |
| Dimensions & specs on PDP | Partial (content gap) | Standard | Tier 1 |
| Reviews & ratings | ❌ none | RTG/LS/Bob's/Ashley/Wayfair | Tier 1 |
| Email/SMS marketing capture | ❌ (lead widget only) | All, with incentive | Tier 1 |
| Financing surfaced + "from $X/mo" on PDP + prequalify | ❌ thin page | All prominent | Tier 1 |
| PLP filtering & sorting | ❌ / minimal | LS extensive | Tier 1 |
| Delivery-date on PDP ("take it home by…") | ❌ (only at checkout) | Standard | Tier 1 |
| "Complete the room" / attach bundles | ❌ (sectional builder only) | RTG core, LS | Tier 2 |
| Wishlist / favorites | ❌ | All | Tier 2 |
| Protection-plan attach | ❌ | Bob's Goof Proof, LS Care Free | Tier 2 |
| Live chat / SMS concierge | ❌ | LS, Bob's, RTG (text) | Tier 2 |
| Shop by Style | ❌ (category only) | LS 12+ styles | Tier 2 |
| 3D room designer / AR view-in-room | ❌ | LS 3D; many AR | Tier 3 |
| Product Q&A | ❌ | Some | Tier 3 |
| Loyalty / rewards | ❌ | Some | Tier 3 |

## To-do list

### Tier 0 — launch integrity (today)
- [ ] Finish Stripe + env wiring (Vercel/Railway/Stripe dashboards) — the only true blocker.
- [ ] Keep the 2,184 image-less SKUs out of prominent rails (or show a clear "photo coming
      soon" placeholder) until backfilled — decide which.
- [ ] Quick wins: `/accessibility` page + footer social links (FB/IG).

### Tier 1 — fast-follow (first 2–4 weeks; highest ROI)
1. **Email/SMS capture** — footer signup + incentive (every comp does this). This *is* the
   owned-audience flywheel — the whole reason for the owned site. Capture → marketing list,
   UTM-stamp the source so it's measurable against the ad spend.
2. **Financing surfaced** — real providers (Synchrony + Progressive Leasing), an
   Apply/Prequalify link, and a "from $X/mo" estimate on the PDP. Furniture is financed-heavy;
   the current financing page is a thin banner. Top conversion lever.
3. **Reviews & ratings — the #1 online trust must-do.** The discounter teardown makes this
   the single highest-leverage item: unknown online furniture brands live or die on review
   volume (1StopBedrooms ≈ 50k across 8 platforms). Start with Google review stars (you have
   Google Business Profiles) and stand up a collection loop off the **existing post-delivery
   review email in DeliverDesk** — funnel to Google/Trustpilot and display the count on-site.
3b. **Model-level SEO + price-match on shared SKUs** — you stock the same models the
   discounters rank for. Make each PDP rank for its model name and show the price-match +
   "local, in stock, take it home today" contrast right where they're weak.
4. **PLP filters & sort** — price, category, in-stock, color/material. Browse-to-buy conversion.
5. **Delivery-date on PDP** — "In stock — take it home as soon as {date}" using the
   availability engine you already have. Turns your biggest structural advantage into an
   on-page conversion driver the national comps can't match.
6. **Content backfill (images + dims)** — the vendor-portal project already planned. Table
   stakes; gates items 1–5 from looking finished.

### Tier 2 — differentiation & AOV (1–3 months)
7. **"Complete the room" attach** — rug + bedding + accent cross-sell on PDP/cart. Ties
   directly to the floor attach strategy and the sliding-AOV fix.
8. **Wishlist / favorites** — return-visit + owned-audience.
9. **Protection-plan attach** — a Goof-Proof-style plan = margin + trust.
10. **Live chat or SMS concierge** — even a simple "text us" (RTG and LS both lean on SMS).
11. **Shop by Style** landing pages — discovery + SEO.

### Tier 3 — advanced (later)
12. 3D room designer / AR "view in your room."
13. Product Q&A.
14. Loyalty / rewards.

## The four that matter most
Prioritize the Tier-1 items that (a) build the owned audience — **email/SMS**, (b) convert
the financed buyer — **financing + monthly payment**, (c) prove trust — **reviews**, and
(d) weaponize delivery speed — **delivery-date on PDP**. Those four beat any 3D-planner
arms race, and three of them (email capture, reviews via the delivery email, delivery-date)
build directly on infrastructure you already own.
