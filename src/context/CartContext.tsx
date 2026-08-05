'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { isSignedIn, portalGetCart, portalPutCart } from '@/lib/customerSession';
import { addedToCart } from '@/lib/events';

// ── Types ────────────────────────────────────────────────────────

export interface CartItem {
  /** Present on ordinary product lines. Absent on a package line. */
  product_id?: string;
  /**
   * Present on a package (bundle) line. The cart holds the package as ONE
   * line — the backend expands it into component invoice_items at checkout
   * (POST /store/order), because a public endpoint can't trust a client-built
   * component list or bundle price.
   */
  package_id?: string;
  sku: string;
  name: string;
  price: number;
  qty: number;
  image_url: string | null;
  category: string | null;
  /** Serialized sectional config JSON, if applicable */
  sectional_config?: string;
  /**
   * Made-to-order fabric selection (Chairs America). The frame has no per-fabric
   * product row; checkout mints the child SKU from (product_id, fabric_id). Two
   * fabrics on the same frame are DISTINCT cart lines, so fabric_id joins the key.
   */
  fabric_id?: string;
  /**
   * The COLOURWAY (`vendor_fabric_colors.id`) inside that fabric line. Sent
   * alongside fabric_id, never instead of it — checkout resolves fabric_id
   * against vendor_fabrics and swapping the two is what 422'd live on
   * 2026-07-31. The backend validates this id belongs to the named fabric and
   * derives the label from the catalog, so the colourway reaches the invoice
   * and the minted child's `color` field instead of dying as a client string.
   */
  fabric_color_id?: string;
  fabric_name?: string | null;
  /**
   * Stock posture AT THE MOMENT IT WAS ADDED, so the cart can say "in stock"
   * or "ships in 4-6 weeks" per line without refetching the catalog.
   *
   * DELIBERATELY A SNAPSHOT, and it is allowed to go stale. The cart persists
   * to localStorage and syncs to the customer portal, so a line can sit for
   * days while the last one sells. That is fine because this drives COPY, not
   * a promise: the authoritative check is the `item_oversold` 409 from
   * /store/order, which still refuses to sell what we do not have. A stale
   * badge shows the wrong wait; it cannot oversell.
   *
   * Undefined on lines added before this shipped — every consumer must treat
   * `undefined` as "unknown", not as "out of stock", or an old cart suddenly
   * sprouts made-to-order warnings on items sitting in the warehouse.
   */
  in_stock?: boolean;
  /** Pre-rendered vendor lead window ("4–6 weeks"). Null when we have none. */
  lead_label?: string | null;
}

/**
 * Identity of a cart line. A package line has no product_id, so every
 * add/remove/update keys off this rather than product_id directly. A
 * fabric-selected frame keys off (product_id, fabric_id) so the same frame in
 * two fabrics stays two lines.
 */
export function cartKey(
  i: Pick<CartItem, 'product_id' | 'package_id' | 'fabric_id' | 'fabric_color_id'>,
): string {
  if (i.package_id) return i.package_id;
  if (!i.product_id) return '';
  if (!i.fabric_id) return i.product_id;
  // The COLOURWAY joins the key too. Keyed on fabric_id alone, the same frame
  // in two colourways of one fabric line (366 Speedway Blue Mountain and 366
  // Speedway Fawn) collapsed into a single line at qty 2 — one of the two
  // colours silently vanished from the order.
  return i.fabric_color_id
    ? `${i.product_id}::${i.fabric_id}::${i.fabric_color_id}`
    : `${i.product_id}::${i.fabric_id}`;
}

interface CartState {
  items: CartItem[];
  hydrated: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; key: string }
  | { type: 'UPDATE_QTY'; key: string; qty: number }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; items: CartItem[] }
  | { type: 'SET_ITEMS'; items: CartItem[] };

interface CartContextValue extends CartState {
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  /** Takes a cartKey() — a product_id for product lines, package_id for bundles. */
  removeItem: (key: string) => void;
  updateQty: (key: string, qty: number) => void;
  clearCart: () => void;
  /** Merge the signed-in customer's saved cart with this device's cart (union,
   *  summing qty by cartKey) and start syncing changes back. Called by the
   *  login page right after a session is established. */
  syncCartFromAccount: () => Promise<void>;
  itemCount: number;
  subtotal: number;
}

/** Union two carts by cartKey, summing quantities. Invalid lines (no key) are
 *  dropped. Non-key fields from `a` win on collision (qty is summed). */
function mergeCarts(a: CartItem[], b: CartItem[]): CartItem[] {
  const byKey = new Map<string, CartItem>();
  for (const it of a) { const k = cartKey(it); if (k) byKey.set(k, { ...it }); }
  for (const it of b) {
    const k = cartKey(it);
    if (!k) continue;
    const existing = byKey.get(k);
    if (existing) existing.qty += Number(it.qty) || 0;
    else byKey.set(k, { ...it });
  }
  return [...byKey.values()];
}

// ── Reducer ──────────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const key = cartKey(action.item);
      const existing = state.items.find(i => cartKey(i) === key);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            cartKey(i) === key
              ? { ...i, qty: i.qty + action.item.qty }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.item] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => cartKey(i) !== action.key) };
    case 'UPDATE_QTY':
      if (action.qty <= 0) {
        return { ...state, items: state.items.filter(i => cartKey(i) !== action.key) };
      }
      return {
        ...state,
        items: state.items.map(i =>
          cartKey(i) === action.key ? { ...i, qty: action.qty } : i
        ),
      };
    case 'CLEAR':
      return { ...state, items: [] };
    case 'HYDRATE':
      return { ...state, items: action.items, hydrated: true };
    case 'SET_ITEMS':
      return { ...state, items: action.items };
    default:
      return state;
  }
}

// ── Storage helpers ──────────────────────────────────────────────

const STORAGE_KEY = 'flipsies_cart';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch { /* quota exceeded — ignore */ }
}

// ── Context ──────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [], hydrated: false });

  // Latest items for async closures (avoids stale reads in the sync callbacks).
  const itemsRef = useRef<CartItem[]>([]);
  itemsRef.current = state.items;
  // Gates account write-back: stays false until the initial account merge has
  // completed, so a signed-in page load can't PUT this device's cart over the
  // saved one before they've been unioned.
  const syncedRef = useRef(false);
  const writeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    dispatch({ type: 'HYDRATE', items: loadCart() });
  }, []);

  // Persist on every change after hydration (localStorage — the device copy)
  useEffect(() => {
    if (state.hydrated) saveCart(state.items);
  }, [state.items, state.hydrated]);

  // Pull the signed-in customer's saved cart, union it with this device's cart,
  // set the merged result, and push it back. Idempotent; safe to call on load
  // and again right after login.
  const syncCartFromAccount = useCallback(async () => {
    if (!isSignedIn()) return;
    const r = await portalGetCart();
    if (r.unauthorized) return;
    const serverItems = (r.cart as CartItem[]).filter(i => cartKey(i));
    const merged = mergeCarts(itemsRef.current, serverItems);
    dispatch({ type: 'SET_ITEMS', items: merged });
    syncedRef.current = true;
    await portalPutCart(merged);
  }, []);

  // Returning signed-in visitor: merge saved cart once local hydration is done.
  useEffect(() => {
    if (state.hydrated && isSignedIn()) void syncCartFromAccount();
  }, [state.hydrated, syncCartFromAccount]);

  // Debounced write-back of cart changes to the account, but ONLY after the
  // initial merge (syncedRef) so we never clobber the saved cart prematurely.
  // After logout the token is gone → portalPutCart is a no-op.
  useEffect(() => {
    if (!state.hydrated || !syncedRef.current || !isSignedIn()) return;
    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);
    writeTimerRef.current = setTimeout(() => { void portalPutCart(itemsRef.current); }, 800);
    return () => { if (writeTimerRef.current) clearTimeout(writeTimerRef.current); };
  }, [state.items, state.hydrated]);

  const addItem = useCallback((item: Omit<CartItem, 'qty'> & { qty?: number }) => {
    const qty = item.qty ?? 1;
    dispatch({ type: 'ADD_ITEM', item: { ...item, qty } as CartItem });

    // The ONE place a shopper adds to cart, so the one place this belongs.
    // Deliberately NOT in the reducer: HYDRATE and SET_ITEMS also produce cart
    // items (restoring a saved cart, syncing from an account) and firing on
    // those would report a purchase intent that never happened.
    //
    // This is the mid-funnel signal Meta optimises on. analytics.ts has mapped
    // add_to_cart → Meta AddToCart since it was written, but nothing ever
    // called it, so the mapping was dead and Meta only ever saw Purchase and
    // InitiateCheckout — too sparse on furniture volume to optimise against.
    addedToCart({
      product_id: item.product_id ?? null,
      sku:        item.sku,
      name:       item.name,
      price:      item.price,
      qty,
      category:   item.category,
    });
  }, []);

  const removeItem = useCallback((key: string) => {
    dispatch({ type: 'REMOVE_ITEM', key });
  }, []);

  const updateQty = useCallback((key: string, qty: number) => {
    dispatch({ type: 'UPDATE_QTY', key, qty });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const itemCount = state.items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ ...state, addItem, removeItem, updateQty, clearCart, syncCartFromAccount, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
