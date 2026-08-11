'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export interface CartLine {
  productId: string;
  name: string;
  unit: string;
  quantity: number;
}

const STORAGE_KEY = 'request-cart';

interface CartValue {
  lines: CartLine[];
  add: (line: Omit<CartLine, 'quantity'>, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  count: number;
}

const CartContext = createContext<CartValue | null>(null);

/** Request cart, persisted to localStorage so a reload doesn't lose the basket. */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLines(JSON.parse(raw));
    } catch {
      /* corrupt or unavailable storage — start with an empty cart */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* ignore quota/private-mode failures */
    }
  }, [lines]);

  const add = useCallback((line: Omit<CartLine, 'quantity'>, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === line.productId);
      if (existing) {
        return prev.map((l) => (l.productId === line.productId ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { ...line, quantity }];
    });
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.productId !== productId)
        : prev.map((l) => (l.productId === productId ? { ...l, quantity } : l)),
    );
  }, []);

  const remove = useCallback(
    (productId: string) => setLines((prev) => prev.filter((l) => l.productId !== productId)),
    [],
  );

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({ lines, add, setQuantity, remove, clear, count: lines.reduce((n, l) => n + l.quantity, 0) }),
    [lines, add, setQuantity, remove, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
