import { defineConfig } from 'vitest/config';
import path from 'node:path';

// import.meta.dirname rather than __dirname: this config is ESM (.mts), and the
// native config loader Vite is moving to as the default doesn't provide the CJS
// globals. Using it now means no warning today and no break at that upgrade.
const here = import.meta.dirname;

// Test config for the storefront.
//
// SCOPE, deliberately: `src/lib/**` only — the pure TypeScript that carries
// business rules (money math, image URLs, filter/slot logic). React components
// are NOT covered here and that is on purpose: they'd need jsdom + Testing
// Library, and the failure modes worth catching in this repo are in the logic
// the components call, not in their markup. Widening this glob without adding
// that setup will just fail on the first .tsx import.
//
// No `environment: 'jsdom'` for the same reason. Two lib modules do touch
// localStorage (deliverySlot, customerSession); their tests stub it explicitly
// rather than the whole suite paying for a DOM.
export default defineConfig({
  resolve: {
    // Mirrors the `@/*` -> `src/*` alias in tsconfig.json so tests import the
    // same way the app does.
    alias: { '@': path.resolve(here, 'src') },
  },
  test: {
    include: ['src/lib/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts'],
    },
  },
});
