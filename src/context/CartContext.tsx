'use client';

import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';

// ── Types ────────────────────────────────────────────────────────

export interface CartItem {
  product_id: string;
  sku: string;
  name: string;
  price: number;
  qty: number;
  image_url: string | null;
  category: string | null;
  /** Serialized sectional config JSON, if applicable */
  sectional_config?: string;
}

interface CartState {
  items: CartItem[];
  hydrated: boolean;
}

type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'REMOVE_ITEM'; product_id: string }
  | { type: 'UPDATE_QTY'; product_id: string; qty: number }
  | { type: 'CLEAR' }
  | { type: 'HYDRATE'; items: CartItem[] };

interface CartContextValue extends CartState {
  addItem: (item: Omit<CartItem, 'qty'> & { qty?: number }) => void;
  removeItem: (product_id: string) => void;
  updateQty: (product_id: string, qty: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

// ── Reducer ──────────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find(i => i.product_id === action.item.product_id);
      if (existing) {
        return {
          ...state,
          items: state.items.map(i =>
            i.product_id === action.item.product_id
              ? { ...i, qty: i.qty + action.item.qty }
              : i
          ),
        };
      }
      return { ...state, items: [...state.items, action.item] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.product_id !== action.product_id) };
    case 'UPDATE_QTY':
      if (action.qty <= 0) {
        return { ...state, items: state.items.filter(i => i.product_id !== action.product_id) };
      }
      return {
        ...state,
        items: state.items.map(i =>
          i.product_id === action.product_id ? { ...i, qty: action.qty } : i
        ),
      };
    case 'CLEAR':
      return { ...state, items: [] };
    case 'HYDRATE':
      return { ...state, items: action.items, hydrated: true };
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

  // Hydrate from localStorage on mount
  useEffect(() => {
    dispatch({ type: 'HYDRATE', items: loadCart() });
  }, []);

  // Persist on every change after hydration
  useEffect(() => {
    if (state.hydrated) saveCart(state.items);
  }, [state.items, state.hydrated]);

  const addItem = useCallback((item: Omit<CartItem, 'qty'> & { qty?: number }) => {
    dispatch({ type: 'ADD_ITEM', item: { ...item, qty: item.qty ?? 1 } as CartItem });
  }, []);

  const removeItem = useCallback((product_id: string) => {
    dispatch({ type: 'REMOVE_ITEM', product_id });
  }, []);

  const updateQty = useCallback((product_id: string, qty: number) => {
    dispatch({ type: 'UPDATE_QTY', product_id, qty });
  }, []);

  const clearCart = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const itemCount = state.items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = state.items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ ...state, addItem, removeItem, updateQty, clearCart, itemCount, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
