import type { NextConfig } from "next";

// 301 (308 permanent) redirects from the old outsourced flipsiesfurniture.com
// URL scheme to the new routes, so inbound links + already-indexed pages keep
// their equity after the DNS cutover instead of 404ing.
//
// Old product URLs were /{room}/{room}-furniture/{type}/{brand}/{model}. The
// trailing model id doesn't 1:1-map to new product ids without a per-SKU
// table, so every path under a room folds to that room's category page —
// preserves search intent with no dead ends. Old departments with no new
// equivalent land on the full catalog. Info/brand paths map 1:1.
//
// `permanent: true` emits 308 (Google treats it as 301 for ranking).
const nextConfig: NextConfig = {
  async redirects() {
    // Each old room root AND everything nested under it → the new category.
    const room = (oldRoot: string, dest: string) => [
      { source: oldRoot, destination: dest, permanent: true },
      { source: `${oldRoot}/:path*`, destination: dest, permanent: true },
    ];
    return [
      ...room("/living-room", "/shop/living-room"),
      ...room("/bedroom", "/shop/bedroom"),
      ...room("/dining-room", "/shop/dining-room"),
      ...room("/mattress", "/shop/mattresses"),
      ...room("/home-office", "/shop/home-office"),
      // No 1:1 new department — send to the full catalog.
      ...room("/home-entertainment", "/shop"),
      ...room("/home-accents", "/shop"),
      ...room("/home-decor", "/shop"),
      ...room("/outdoor-furniture", "/shop"),
      ...room("/home-appliances", "/shop"),
      ...room("/miscellaneous", "/shop"),
      ...room("/miscellaneous-furniture", "/shop"),
      // Info / brand paths.
      { source: "/locations/flipsies-furniture", destination: "/locations", permanent: true },
      { source: "/shop-brands", destination: "/shop", permanent: true },
      { source: "/brands", destination: "/shop", permanent: true },
      // Old site had a standalone accessibility page; fold to /contact until a
      // dedicated page ships, so the indexed legal URL doesn't 404.
      { source: "/accessibility", destination: "/contact", permanent: true },
    ];
  },
};

export default nextConfig;
