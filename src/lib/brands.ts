// Brand registry — the single source of truth for the /brands index and each
// /brands/<slug> profile page. Companion to warranty.ts (which the profile
// page reuses for the warranty section via warrantyForBrand()).
//
// EVERY factual field here is VERIFIED against the manufacturer's own site or a
// reputable source (research pass 2026-07-18). Care instructions and warranty
// terms are quasi-legal promises — leave a field null rather than guessing.
// `sources` records the URLs a fact was verified against so a future editor can
// re-check. Nothing here is fabricated; unverified facts are omitted, not
// invented.
//
// `name` MUST match the vendor name exactly as it appears on products
// (p.vendor.name / the /shop `brand` facet value) so the "Shop {brand}" CTA
// deep-links to /shop?brand=<name> and warrantyForBrand() resolves.

import { brandSlug } from '@/lib/warranty';

/** A verified care/cleaning instruction for one surface/material of a brand. */
export interface BrandCare {
  /** e.g. "Upholstery", "Leather", "Wood", "Power motion", "Mattress", "Candle". */
  surface: string;
  instructions: string;
}

export type BrandCategory =
  | 'Upholstery'
  | 'Leather'
  | 'Casegoods'
  | 'Dining'
  | 'Mattresses'
  | 'Home Accents';

export interface Brand {
  /** URL segment for /brands/<slug>. Generated from name via brandSlug(). */
  slug: string;
  /** EXACT vendor name — drives /shop?brand=<name> and warrantyForBrand(). */
  name: string;
  /** Short line under the H1. */
  tagline: string;
  /** Primary catalog category, for the index grid grouping + badge. */
  category: BrandCategory;
  founded?: string | null;
  headquarters?: string | null;
  /** Official manufacturer site (rendered as an external, nofollow link). */
  website?: string | null;
  /** Path to the brand logo under /public (e.g. /images/brands/<slug>.png). Null = show wordmark text. */
  logo?: string | null;
  /** 1–2 verified paragraphs: heritage + positioning. */
  story: string[];
  /** What they make — product categories / signature features. */
  specialties: string[];
  /** Fabrics / leather / wood / construction, verified. Null if unverified. */
  materials?: string | null;
  /** Verified care/cleaning guidance, by surface. */
  care: BrandCare[];
  /** URL the care guidance was verified against (shown as "official care guide"). */
  careSourceUrl?: string | null;
  /** Verification citations (not rendered; for a future editor to re-check). */
  sources?: string[];
}

// Curated furniture-maker set (Jett, 2026-07-18) — the real manufacturers we
// carry, plus Swan Creek as the featured home-accent brand. Ordered by how
// prominently we want to feature them. Internal buckets (Flipsies, Local,
// Overstock, Closeouts) and thin decor vendors are intentionally excluded.
export const BRANDS: Brand[] = [
  {
    slug: brandSlug('Southern Motion'),
    name: 'Southern Motion',
    tagline: 'American-made reclining furniture, built to do one thing better than anyone.',
    category: 'Upholstery',
    founded: '1996',
    headquarters: 'Pontotoc, Mississippi',
    website: 'https://www.southernmotion.com/',
    logo: '/images/brands/southern-motion.svg',
    story: [
      'Southern Motion was founded in 1996 in Pontotoc, Mississippi with a single, focused mission the company describes as "to manufacture only reclining furniture and make it better than anyone ever had." The name came from a painting the founders discovered while shopping — it inspired both the company\'s name and a philosophy built around relaxation and comfort.',
      'The brand specializes exclusively in American-made motion upholstery and calls itself "The World\'s Best Reclining Furniture." Its pieces integrate modern amenities like power headrests, power recline with USB ports, wireless-charging consoles, lay-flat mechanisms, and the SoCozi massage-and-heat system.',
    ],
    specialties: [
      'Reclining sofas and loveseats',
      'Reclining sectionals',
      'Recliners and motion accent chairs',
      'Power recline with power headrests and USB ports',
      'SoCozi massage and heat modules',
      'Wireless-charging consoles and lay-flat mechanisms',
    ],
    materials:
      'Southern Motion builds its motion upholstery on wooden frames with spring systems and cushioned seating, covered in a range of fabrics and leathers. The reclining action uses patented black-metal mechanism parts, and many models add power motors, heaters, and massage units. Natural leather markings — scars, grain variation, wrinkles — are considered normal characteristics, not defects.',
    care: [
      {
        surface: 'Fabric & leather',
        instructions:
          'Ask us to identify the correct cleaning method for your specific cover before treating it — the wrong solvent or an applied chemical can void the fabric or leather warranty. Blot spills promptly and avoid over-wetting.',
      },
      {
        surface: 'Leather characteristics',
        instructions:
          'On genuine leather, natural scars, brands, grain variations and wrinkles are normal and are not defects. Keep leather out of direct sunlight and away from heat sources.',
      },
    ],
    // No standalone care page — SoMo's care guidance lives on its warranty page,
    // which the Warranty section already links. Null to avoid a mislabeled dup.
    careSourceUrl: null,
    sources: [
      'https://www.southernmotion.com/about-us/',
      'https://www.southernmotion.com/warranty-info/',
    ],
  },
  {
    slug: brandSlug('Jackson Catnapper'),
    name: 'Jackson Catnapper',
    tagline: 'Comfort for the home from one of America\'s oldest family-owned furniture makers.',
    category: 'Upholstery',
    founded: '1933',
    headquarters: 'Cleveland, Tennessee',
    website: 'https://www.catnapper.com/',
    logo: '/images/brands/jackson-catnapper.svg',
    story: [
      'Jackson Furniture was founded in 1933 during the Great Depression by W. Ray Jackson, who started the business in Cleveland, Tennessee with $30 after learning the upholstery craft. Drawing on his experience in automobile assembly, he pioneered assembly-line production of platform glider recliners. The company remains family-held and is still headquartered in Cleveland, Tennessee.',
      'The parent company sells under two labels: Catnapper — its reclining and motion upholstery brand, long marketed as "America\'s Most Comfortable Chair" — and Jackson Furniture, its stationary sofas, sectionals, and traditional upholstery. The company manufactures primarily in the U.S. across factories in Tennessee, Mississippi, Texas, and Florida.',
    ],
    specialties: [
      'Reclining chairs and motion upholstery (Catnapper)',
      'Power reclining sofas, loveseats and recliners',
      'Stationary sofas, sectionals and loveseats (Jackson Furniture)',
      'Sleeper sofas',
      'Comfort Coil seat cushions',
    ],
    materials:
      'Catnapper and Jackson pieces are upholstered over hardwood-based frames with steel spring units and reclining/motion mechanisms, offered in fabric, vinyl, and leather covers. Certain seating uses their branded Comfort Coil seat cushions, and power-motion pieces use electric motors.',
    care: [
      {
        surface: 'Fabric (by cleaning code)',
        instructions:
          'Follow the code on your piece: "W" — clean only with a water-based foam upholstery cleaner, do not over-wet; "S" — clean only with a dry-cleaning solvent, no water; "SW"/"WS" — spot clean with upholstery shampoo, mild detergent foam, or mild solvent; "X" — vacuum or lightly brush only, no water or solvent.',
      },
      {
        surface: 'Leather',
        instructions:
          'Keep leather away from heat and direct sunlight (especially aniline leathers) and dust weekly with a soft, damp cloth. Apply a leather protection cream to high-use areas periodically and deep-clean about every six months with a dedicated leather cleaner. Never use harsh chemicals.',
      },
    ],
    careSourceUrl: 'https://www.catnapper.com/Cleaning',
    sources: ['https://www.catnapper.com/About', 'https://www.catnapper.com/Cleaning'],
  },
  {
    slug: brandSlug('Fusion'),
    name: 'Fusion',
    tagline: 'Where style meets value — fashionable stationary upholstery, assembled in Mississippi.',
    category: 'Upholstery',
    founded: '2009',
    headquarters: 'Ecru, Mississippi',
    website: 'https://www.fusionfurnitureinc.com/',
    logo: '/images/brands/fusion.png',
    story: [
      'Fusion Furniture was founded in 2009 in Ecru, Mississippi by Bo and Alison Robbins, who had worked in the furniture industry since 1994. Their goal was to develop and distribute their own quality home furnishings — producing more fashionable stationary (non-motion) upholstery at a value price. The name reflects a mission of "fusing together" the elements of a successful maker: style, value, and service.',
      'Fusion assembles its upholstery in the USA and has grown to serve hundreds of retailers nationwide. Its collections are organized into lines such as Casual Comforts, Fusion Essentials, Grab a Seat, Luxe Living, and Slipcovers.',
    ],
    specialties: [
      'Stationary upholstered sofas and loveseats',
      'Sectionals',
      'Accent chairs and ottomans',
      'Slipcovered upholstery',
      'American-assembled value upholstery',
    ],
    materials:
      'Fusion makes stationary upholstered pieces built on wood frames with foam seat-cushion cores, covered in a wide selection of fabrics including slipcover options. Fabric sewing, cushion stuffing, and assembly are done in Mississippi.',
    care: [
      {
        surface: 'Fabric upholstery',
        instructions:
          'Sponge up spills immediately to prevent stains. Rotate cushions for even wear and maximum longevity. Never expose upholstery fabric to sunlight for any length of time. If needed, consult us or a professional cleaning service to determine the proper cleaning method — improper cleaning voids the fabric coverage.',
      },
    ],
    careSourceUrl: 'https://www.fusionfurnitureinc.com/product-care-and-cleaning/',
    sources: [
      'https://www.fusionfurnitureinc.com/about-us/',
      'https://www.fusionfurnitureinc.com/product-care-and-cleaning/',
    ],
  },
  {
    slug: brandSlug('Hooker Furniture'),
    name: 'Hooker Furniture',
    tagline: 'Rooted in craft since 1924 — one of the rare makers still guided by its founding family.',
    category: 'Casegoods',
    founded: '1924',
    headquarters: 'Martinsville, Virginia',
    website: 'https://hookerfurnishings.com/',
    logo: '/images/brands/hooker-furniture.svg',
    story: [
      'Hooker Furniture was founded in 1924 in Martinsville, Virginia by J. Clyde Hooker, Sr. The community raised roughly $28,000 in startup capital and a local publisher contributed land; the firm began by specializing in bedroom suites and added dining furniture in 1928. It remains headquartered in Martinsville — one of the rare furniture brands still guided by its founding family.',
      'Now operating as Hooker Furnishings, the company is one of America\'s premier makers and importers of fine home furnishings, spanning upholstery, leather, casegoods, and outdoor furniture. Its stated mission is to offer innovative, on-trend, high-quality products of exceptional value, supported by unparalleled service.',
    ],
    specialties: [
      'Bedroom, dining, and home-office casegoods',
      'Upholstery and top-grain leather seating',
      'Home entertainment and occasional pieces',
      'Custom upholstery (Hooker Custom Upholstery)',
      'Outdoor living (via Sunset West)',
      'Multi-coat lacquer wood finishes',
    ],
    materials:
      'Hooker produces both wood casegoods and upholstered/leather seating. Wood pieces are finished with two to three coats of lacquer for depth and durability across a range of finishes, and the line spans solid wood and veneers, fabric upholstery, and top-grain leather.',
    care: [
      {
        surface: 'Wood',
        instructions:
          'Dust frequently with a clean, soft, lint-free cloth, rubbing with the grain. Polish about every six months with a polish containing detergents, emulsifiers, and mineral oil — avoid silicone cleaners and waxes, which build up and prevent refinishing. Blot spills immediately (standing water causes white spots), use protective pads under lamps and dishes, and keep pieces out of direct sunlight and away from heat and AC vents.',
      },
      {
        surface: 'Leather',
        instructions:
          'Wipe spills immediately with a clean cloth or sponge. For spots and daily cleaning use a mild, non-detergent soap, rinse well, wipe gently, and air dry. Do not use saddle soap, solvents, furniture polish, oils, varnish, abrasive cleaners, or ammonia.',
      },
      {
        surface: 'Upholstery',
        instructions:
          'Seat and back cushions need periodic "fluffing up," as with any upholstered furniture, to keep their shape with regular use.',
      },
    ],
    careSourceUrl: 'https://www.hookerfurniture.com/productcarecleaning.inc',
    sources: [
      'https://hookerfurnishings.com/about-us',
      'https://www.hookerfurniture.com/productcarecleaning.inc',
    ],
  },
  {
    slug: brandSlug('Luke Leather'),
    name: 'Luke Leather',
    tagline: 'Family-owned maker of genuine Italian-leather seating, built in High Point, North Carolina.',
    category: 'Leather',
    founded: '2003',
    headquarters: 'High Point, North Carolina',
    website: 'https://lukeleather.com/',
    story: [
      'Luke Leather is a family-owned manufacturer based in High Point, North Carolina, named for the founders\' son Luke. The owner has worked in the leather furniture business since 1992.',
      'The company makes genuine Italian-leather upholstery alongside a North Carolina-made fabric upholstery line in its own factory, selling through independent furniture dealers across the U.S. and Canada. Its positioning emphasizes excellent product at a fair price with quick four-to-six-week delivery.',
    ],
    specialties: [
      'Genuine Italian-leather sofas, loveseats and chairs',
      'North Carolina-made fabric upholstery',
      'Family-owned domestic manufacturing',
      'Fast four-to-six-week delivery',
    ],
    materials:
      'Luke uses genuine Italian leather on its leather collection and fabrics on its NC-made upholstery. The company emphasizes authentic, natural leathers and notes that variation in texture, wrinkles, healed scars, veins, color, and pull-up effect are inherent to genuine leather and not defects — while a perfectly uniform surface indicates heavily corrected or synthetic material.',
    care: [
      {
        surface: 'Leather',
        instructions:
          'Wipe the furniture down with a damp cloth about once a month. Rotate seating positions regularly and keep pieces at least two feet from air ducts and out of direct sunlight; avoid sitting on leather in wet clothing. Use only mild soap and water — harsh abrasives or unapproved cleaners are not covered. Softening over time under normal use is a natural characteristic of genuine leather.',
      },
    ],
    careSourceUrl: 'https://lukeleather.com/leather-facts/',
    sources: ['https://lukeleather.com/', 'https://lukeleather.com/leather-facts/', 'https://lukeleather.com/warranty/'],
  },
  {
    slug: brandSlug('Leather Italia'),
    name: 'Leather Italia',
    tagline: 'Leather specialists built on deep tannery-market expertise, since 1997.',
    category: 'Leather',
    founded: '1997',
    headquarters: 'Leland, North Carolina',
    website: 'https://www.leatheritaliausa.com/',
    logo: '/images/brands/leather-italia.png',
    story: [
      'Leather Italia USA was founded in 1997 by Michael E. Campbell, built on his extensive background in the raw-material supply and tannery markets. The company positions itself on offering strong value and quality in the leather furniture market, with "leather knowledge second to none."',
      'Now a globally recognized brand supplying premium retailers, Leather Italia emphasizes in-house design and operates from national distribution centers in California and North Carolina. Its range spans stationary, power-motion, sectional, and accent leather furniture.',
    ],
    specialties: [
      'Stationary leather sofas, loveseats and chairs',
      'Power-motion furniture with power headrests and recline',
      'Leather sectionals',
      'Accent swivel and office chairs',
    ],
    materials:
      'Leather Italia works in genuine leather across grades and finishes — full aniline (color from dye only), semi-aniline (aniline color plus a light protective finish), and pigmented/corrected top grain (embossed and pigmented to even out the surface). It draws on prior tannery-market expertise to source its hides.',
    care: [
      {
        surface: 'Leather (general)',
        instructions:
          'Clean spills right away — blot excess liquid immediately with a clean cloth or sponge, then clean with mild soap and water. Protect leather from perspiration, hair grease, and hair gel. If a stain is difficult, consult a leather specialist before trying anything more abrasive. Unprotected pure aniline and nubuck stain easily; on semi-aniline and corrected grain, use a soft cleaner to wash out a dried stain.',
      },
    ],
    careSourceUrl: 'https://www.leatheritaliausa.com/cleaning-instructions',
    sources: [
      'https://www.leatheritaliausa.com/about-us',
      'https://www.leatheritaliausa.com/cleaning-instructions',
    ],
  },
  {
    slug: brandSlug('Steve Silver'),
    name: 'Steve Silver',
    tagline: 'Great looks at value prices — a Texas dining and occasional specialist since 1983.',
    category: 'Dining',
    founded: '1983',
    headquarters: 'Forney, Texas',
    website: 'https://stevesilver.com/',
    logo: '/images/brands/steve-silver.jpg',
    story: [
      'Steve Silver Company was started by Stephen C. Silver in 1983, selling imported goods before focusing on dining and occasional furniture for the retail furniture industry. Headquartered in Forney, Texas just outside Dallas, it became an employee-owned (ESOP) company in 2011.',
      'The company positions itself as a value leader in casual dining and occasional furniture, running a large distribution operation with overseas sourcing and quality-control staff. Its philosophy: great looks at value prices with great service.',
    ],
    specialties: [
      'Casual and formal dining sets (tables, chairs, benches, counter/bar height)',
      'Occasional tables (cocktail, end, sofa tables)',
      'Casegoods and bedroom furniture',
      'Home office and accent pieces',
      'Upholstery and seating',
    ],
    materials:
      'Steve Silver produces wood casegoods — dining and occasional pieces in solid woods and veneers — plus upholstered furniture in fabric and leather. Exact species and construction vary by collection and are specified on each product\'s page.',
    care: [
      {
        surface: 'Wood',
        instructions:
          'Always dust, wipe, and clean with the grain of the wood using a soft cloth. Soap and water are not advisable on wood surfaces — water can penetrate the finish and raise the grain.',
      },
      {
        surface: 'Upholstery',
        instructions:
          'Vacuum upholstery often; embedded dust and dirt make fabrics wear faster. On frames with removable cushions, reverse the cushions regularly to reduce wrinkles and keep the filling evenly distributed.',
      },
      {
        surface: 'Leather',
        instructions:
          'Do not use furniture polish, saddle soap, oils, varnishes, ammonia water, soaps, or dusting agents on leather.',
      },
    ],
    careSourceUrl: 'https://stevesilver.com/furniture-care-3/',
    sources: ['https://stevesilver.com/about-us/', 'https://stevesilver.com/furniture-care-3/'],
  },
  {
    slug: brandSlug('Jofran'),
    name: 'Jofran',
    tagline: 'On-trend style for less — a Massachusetts furniture house since 1975.',
    category: 'Dining',
    founded: '1975',
    headquarters: 'Norton, Massachusetts',
    website: 'https://jofran.com/',
    logo: '/images/brands/jofran.webp',
    story: [
      'Jofran, Inc. was founded in 1975, a Massachusetts-based furniture importer and distributor supplying dining, occasional, living room, bedroom, and home-office furniture to retailers.',
      'The brand positions itself around affordable, on-trend style — "high-fashion looks for less with quality you can trust" — drawing design inspiration from global trends across a large range of named collections such as Nature\'s Edge, Madison County, Global Archive, and Urban Icon.',
    ],
    specialties: [
      'Dining (tables, chairs, benches, counter stools, servers)',
      'Occasional and living-room tables',
      'Accent seating and accent furniture',
      'Bedroom furniture',
      'Media units and storage/display',
      'Home office',
    ],
    materials:
      'Most Jofran dining and occasional groups are built from a combination of veneers and solid Asian hardwoods with durable finishes; specific species and construction are given on each product page.',
    care: [
      {
        surface: 'Dining tables',
        instructions:
          'Wipe clean with a soft cloth dampened in a solution of mild detergent and warm water, dry immediately, and do not saturate. Don\'t leave water or fluids on the surface for extended periods.',
      },
      {
        surface: 'Upholstered chairs',
        instructions:
          'Vacuum regularly, then spot-clean with a damp cloth using a mix of mild detergent and warm water.',
      },
      {
        surface: 'Occasional tables & media units',
        instructions: 'Dust frequently with a clean, dry cloth and avoid wax-based cleaners.',
      },
    ],
    careSourceUrl: 'https://jofran.com/faq',
    sources: ['https://jofran.com/about', 'https://jofran.com/faq'],
  },
  {
    slug: brandSlug('Elements International'),
    name: 'Elements International',
    tagline: 'High-end looks without the price tag — a Texas whole-home furniture house.',
    category: 'Casegoods',
    headquarters: 'Mesquite, Texas',
    website: 'https://www.elementsgrp.com/',
    story: [
      'Elements International is a Mesquite, Texas-based whole-home furniture importer that describes itself as a team of leaders in design, operations, logistics, customer service, and marketing, bringing retailers value and experience for over 20 years.',
      'The company positions itself around delivering premium-looking, well-crafted furniture at accessible price points, backed by flexible shipping — a large Vietnam quick-ship program, a Texas warehouse with no order minimums, and turn-key direct-container freight management.',
    ],
    specialties: [
      'Bedroom furniture',
      'Casual and formal dining',
      'Living room and upholstery',
      'Entertainment and home theater',
      'Home office',
      'Mattresses and sleep',
    ],
    materials:
      'Elements is an importer offering both casegoods and upholstery. Its lines include natural-wood and distressed-finish pieces — where variations in wood grain, texture, color, and pattern are inherent to the natural materials — alongside upholstered pieces. Specific species and fabric grades are given per collection.',
    // Elements references "care guidelines" in its warranty but publishes no consumer care page — omitted.
    care: [],
    sources: ['https://www.elementsgrp.com/about-us.inc', 'https://www.elementsgrp.com/warranty.inc'],
  },
  {
    slug: brandSlug('Emerald Home'),
    name: 'Emerald Home',
    tagline: 'A whole-home furniture supplier with Pacific Northwest roots dating to 1962.',
    category: 'Casegoods',
    founded: '1962',
    headquarters: 'Tacoma, Washington',
    website: 'https://www.emeraldhome.com/',
    logo: '/images/brands/emerald-home.png',
    story: [
      'Emerald Home Furnishings traces its roots to 1962, when the business began distributing bed frames and unfinished furniture in the Pacific Northwest. The import division known as Emerald Home Furnishings launched in 1993, and the company has grown into a whole-home furniture supplier selling through authorized retailers worldwide.',
      'Emerald operates a 200,000-square-foot Tacoma, Washington headquarters with offices, showroom, and distribution, plus an East Coast warehouse in Mocksville, North Carolina and market showrooms in Las Vegas and High Point. The company emphasizes a family ethos and regular community giving.',
    ],
    specialties: [
      'Fabric upholstery and motion furniture',
      'Casual and formal dining',
      'Bedroom suites',
      'Sleep systems and gel mattresses',
      'Occasional tables and accent chairs',
      'Youth furniture',
    ],
    materials:
      'Emerald\'s lineup spans wood casegoods, upholstery in both man-made fabrics (microfiber, nylon, polyester, olefin) and organic fabrics (cotton, chenille, linen, wool), genuine leather, steel-frame and resin-wicker seating, and mattresses in gel/foam and pocketed-coil constructions. Upholstered products meet industry flammability regulations.',
    care: [
      {
        surface: 'Wood',
        instructions:
          'Protect from heat and moisture, wipe up spills immediately, and use protective mats or felt backing under items set directly on wood. Dust weekly with a soft, lint-free cloth in the direction of the grain. If you polish, apply it to the cloth — not directly onto the wood.',
      },
      {
        surface: 'Upholstery (man-made fabric)',
        instructions:
          'For man-made fabrics like microfiber, nylon, polyester, and olefin, spot clean with a foam, water-based cleaning agent (mild soap or upholstery cleaner). Check the Law label, and always test a hidden spot first.',
      },
      {
        surface: 'Upholstery (organic fabric)',
        instructions:
          'For organic materials like cotton, chenille, linen, and wool, spot clean with a mild, water-free solvent or dry-cleaning product. Always test a hidden area first.',
      },
      {
        surface: 'Leather',
        instructions:
          'Dust periodically with a clean, dry, soft cloth. For liquid stains, blot the excess, then gently rub from the outside inward with a cloth dampened in a mild solution of water and neutral soap; don\'t soak the leather, and dry immediately. Keep away from heat sources and direct sunlight, and use only water and mild soap.',
      },
    ],
    careSourceUrl: 'https://emeraldhome.zendesk.com/hc/en-us/articles/360037248352-Caring-for-Your-Furniture',
    sources: [
      'https://www.emeraldhome.com/about-us',
      'https://emeraldhome.zendesk.com/hc/en-us/articles/360037248352-Caring-for-Your-Furniture',
    ],
  },
  {
    slug: brandSlug('Crown Mark'),
    name: 'Crown Mark',
    tagline: 'Contemporary and classic furniture at everyday value, from a Houston importer since 1983.',
    category: 'Casegoods',
    founded: '1983',
    headquarters: 'Houston, Texas',
    website: 'https://crownmark.com/',
    logo: '/images/brands/crown-mark.png',
    story: [
      'Crown Mark, Inc. was established in 1983 and is headquartered in Houston, Texas, where it runs a roughly 400,000-square-foot warehouse, with additional distribution centers in California and North Carolina. It is a privately held furniture importer and distributor that sells through retailers.',
      'The company positions itself around four pillars it names on its own site: quality control, contemporary and classic styling, competitive pricing through direct manufacturing relationships, and fast warehouse-based fulfillment.',
    ],
    specialties: [
      'Bedroom sets (beds, dressers, nightstands)',
      'Dining and dinette groups',
      'Living-room upholstery (sofas, sectionals, loveseats)',
      'Occasional and accent furniture',
      'Youth and value-priced whole-room packages',
    ],
    // Crown Mark publishes no consumer materials/construction spec — omitted rather than invented.
    materials: null,
    care: [],
    sources: ['https://crownmark.com/about/company.htm', 'https://www.crownmark.com/about/policies.htm'],
  },
  {
    slug: brandSlug('Riverside'),
    name: 'Riverside',
    tagline: 'Fashion-forward, well-priced home furnishings from Fort Smith, Arkansas since 1946.',
    category: 'Casegoods',
    founded: '1946',
    headquarters: 'Fort Smith, Arkansas',
    website: 'https://www.riversidefurniture.com/',
    logo: '/images/brands/riverside.png',
    story: [
      'Riverside Furniture traces its roots to 1946, when Herman Udouj started it in Fort Smith, Arkansas after his Marine Corps service in World War II. The company began in a roughly 5,000-square-foot building making baby beds and grew steadily into new product lines.',
      'Today Riverside is a broad-line home furnishings manufacturer whose customers include a majority of the top 100 American furniture retailers. It positions itself as "the most fashion-forward, well-priced furniture line in America," with thousands of items across many lifestyle-themed collections.',
    ],
    specialties: [
      'Bedroom furniture',
      'Dining room furniture',
      'Home office furniture',
      'Occasional and accent tables',
      'Home theater and entertainment furniture',
    ],
    materials:
      'Riverside makes both wood and upholstered home furnishings across bedroom, dining, home office, occasional, and home-theater categories. All Riverside finishes go through a multi-step finishing process; specific species and construction are given per collection.',
    care: [
      {
        surface: 'Wood & general',
        instructions:
          'Clean any surface with a damp, clean dust cloth, using a mild detergent only where a cloth alone won\'t do it. Avoid oil-based and direct-spray polishes, which cause waxy build-up. Use coasters — hot items can soften the finish, and spills can make it bubble or discolor. Place protective pads beneath lamps, accessories, and on writing surfaces, and don\'t set rubber or vinyl directly on the surface.',
      },
      {
        surface: 'Environment',
        instructions:
          'Keep humidity moderate — sustained humidity above 60% swells wood and distorts components, while below 20% causes warping and splitting. Fluctuating humidity can damage finishes.',
      },
      {
        surface: 'Moving',
        instructions:
          'Empty contents before moving. Lift from the strongest support points rather than by tabletops or legs, wrap in soft padding, and never slide furniture across floors — it can break joints and damage legs.',
      },
    ],
    careSourceUrl: 'https://www.riversidefurniture.com/care',
    sources: ['https://www.riversidefurniture.com/about', 'https://www.riversidefurniture.com/care'],
  },
  // Corinthian intentionally NOT profiled — we are exiting the line (2026-07-18).
  {
    slug: brandSlug('Chairs America'),
    name: 'Chairs America',
    tagline: 'One of America\'s largest dedicated makers of occasional chairs, gliders, and swivels.',
    category: 'Upholstery',
    headquarters: 'Hickory Flat, Mississippi',
    website: 'https://www.chairs-america.com/',
    logo: '/images/brands/chairs-america.jpg',
    story: [
      'Chairs America describes itself as one of America\'s largest exclusive manufacturers of occasional chairs, gliders, and swivels, with products on the floors of many well-known U.S. furniture retailers. The company was founded to make high-quality, comfortable chairs, gliders, and swivels with a strong value equation.',
      'Its positioning is affordable comfort — pieces "made with the same top quality materials found in high end and designer furniture" at a fraction of the price, backed by an extensive special-order program with over 1,200 fabric and frame combinations. Its creed: "We design them right; we make them comfortable; we build them to last."',
    ],
    specialties: [
      'Occasional and accent chairs',
      'Swivel chairs and swivel gliders',
      'Gliders',
      'Settees, and some sofas, sectionals, and ottomans',
      'Special-order program with 1,200+ fabric and frame combinations',
    ],
    // Company publishes no verified materials/construction spec — omitted rather than invented.
    materials: null,
    care: [],
    sources: ['https://www.chairs-america.com/', 'https://www.linkedin.com/company/chairs-america'],
  },
  {
    slug: brandSlug('MLily'),
    name: 'MLily',
    tagline: 'Sleep perfected by science — recovery-focused memory foam and hybrid mattresses.',
    category: 'Mattresses',
    founded: '2008',
    headquarters: 'Knoxville, Tennessee (U.S. operations)',
    website: 'https://mlilyusa.com/',
    logo: '/images/brands/mlily.png',
    story: [
      'MLILY is the sleep-products brand of a vertically integrated manufacturer that began by building foam-cutting machinery and grew to control every production stage in-house — from proprietary foam development through pouring, cutting, sewing, and durability testing. MLILY USA operates U.S. factories in Winnsboro, South Carolina and Goodyear, Arizona, producing memory foam and hybrid mattresses, pillows, adjustable bases, and bedding.',
      'The brand pairs "zero-pressure" cooling and pressure-relieving foam with high-profile athletic partnerships — it is the global mattress and sleep partner of Manchester United — positioning its recovery-focused sleep technology around elite-athlete rest. Its foams are CertiPUR-US certified.',
    ],
    specialties: [
      'Memory foam mattresses',
      'Hybrid (foam + coil) mattresses',
      'Adjustable bed bases',
      'Memory foam and adjustable pillows',
      'Bedding and mattress protectors',
      'MLILY Kids collection',
    ],
    materials:
      'MLILY manufactures its own proprietary foams on company-designed machinery at U.S. facilities. Its foams are CertiPUR-US certified — made without ozone depleters and formulated without harmful chemicals — and engineered to balance support with pressure relief and cooling. The brand also cites OEKO-TEX Standard 100 certification for its textiles.',
    care: [
      {
        surface: 'Mattress',
        instructions:
          'Use a mattress protector fitted correctly to the mattress — warranty is voided if the mattress is used without one. Keep the law tags attached and retain proof of purchase. For product-specific cleaning and rotation guidance, check the tag on your model or ask us.',
      },
    ],
    // MLILY publishes no standalone consumer care page; guidance above is drawn from warranty terms.
    careSourceUrl: null,
    sources: ['https://mlilyusa.com/pages/about-us', 'https://mlilyusa.com/pages/warranty-information'],
  },
  {
    slug: brandSlug('Swan Creek Candle Company'),
    name: 'Swan Creek Candle Company',
    tagline: 'American-made, intensely fragrant soybean-wax candles from Swanton, Ohio.',
    category: 'Home Accents',
    founded: '1978',
    headquarters: 'Swanton, Ohio',
    website: 'https://www.swancreekcandle.com/',
    logo: '/images/brands/swan-creek-candle-company.png',
    story: [
      'Swan Creek Candle Company is a family-owned business and a division of Ambrosia, Inc., an Ohio corporation that has sold wholesale to the gift industry since 1978. It is owned and operated by the founding family and makes its candles domestically at a 30,000-square-foot factory in Swanton, in Northwest Ohio.',
      'The brand is known for American-made, intensely fragrant soybean-wax candles. All candles and wax products are made in-house from American-grown soybean wax and independently tested in the company\'s own lab. Products are marketed as clean-burning and lead-free.',
    ],
    specialties: [
      'Soy-blend jar and pottery candles',
      'Wax melts and electric wax melters',
      'Pantry Jar candles and wax refill kits',
      'Home-fragrance accessories',
      'Signature fragrance collections',
    ],
    materials:
      'Candles are made with American soybean wax and produced in Swanton, Ohio. The brand describes its wax as environmentally friendly, sustainable, clean-burning, and lead-free. Its high-tab safety-base wicks are engineered to self-extinguish when roughly a half-inch of wax remains.',
    care: [
      {
        surface: 'Wick',
        instructions: 'Keep the wick trimmed to 1/4 inch at all times. Never extinguish the wick with your hands.',
      },
      {
        surface: 'Burn time',
        instructions:
          'Burn for 3–4 hours at a time — not for extended periods, and not for less than the recommended time. Don\'t burn the candle to the bottom of the container; the safety-base wick is designed to self-extinguish when about a half-inch of wax remains.',
      },
      {
        surface: 'Safety',
        instructions:
          'Always burn within sight and never leave a burning candle unattended. Keep away from anything that can catch fire, and away from children and pets. Always burn on a temperature-safe surface.',
      },
    ],
    careSourceUrl: 'https://www.swancreekcandle.com/candlesafety.html',
    sources: ['https://www.swancreekcandle.com/info.html', 'https://www.swancreekcandle.com/candlesafety.html'],
  },
];

const BY_SLUG = new Map(BRANDS.map((b) => [b.slug, b]));
const BY_NAME = new Map(BRANDS.map((b) => [b.name.toLowerCase(), b]));

/** Look up a brand profile by its URL slug. */
export function brandBySlug(slug: string): Brand | null {
  return BY_SLUG.get(slug) ?? null;
}

/** Look up a brand profile by vendor name (case-insensitive) — for the PDP link. */
export function brandByName(name: string | null | undefined): Brand | null {
  if (!name) return null;
  return BY_NAME.get(name.toLowerCase()) ?? null;
}

/** Category display order for the index grid. */
export const CATEGORY_ORDER: BrandCategory[] = [
  'Upholstery',
  'Leather',
  'Casegoods',
  'Dining',
  'Mattresses',
  'Home Accents',
];
