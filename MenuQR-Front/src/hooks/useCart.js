import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'customerCart';

function readCart() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Error parsing cart from localStorage:', e);
    return [];
  }
}

/**
 * Customer cart persisted in localStorage (same key and item shape as before:
 * the dish object plus `quantity`).
 */
export default function useCart() {
  const [cart, setCart] = useState(readCart);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* storage full or unavailable — cart still works for this visit */
    }
  }, [cart]);

  const addToCart = useCallback((dish) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === dish.id);
      if (existing) {
        const currentQuantity = parseInt(existing.quantity) || 0;
        return prev.map((item) => (item.id === dish.id ? { ...item, quantity: currentQuantity + 1 } : item));
      }
      return [...prev, { ...dish, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((dishId) => {
    setCart((prev) => prev.filter((item) => item.id !== dishId));
  }, []);

  const updateQuantity = useCallback(
    (dishId, newQuantity) => {
      const quantity = parseInt(newQuantity);
      if (isNaN(quantity) || quantity <= 0) {
        removeFromCart(dishId);
      } else {
        setCart((prev) => prev.map((item) => (item.id === dishId ? { ...item, quantity } : item)));
      }
    },
    [removeFromCart]
  );

  const clearCart = useCallback(() => {
    setCart([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0), [cart]);
  const count = useMemo(() => cart.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0), [cart]);
  const quantities = useMemo(() => Object.fromEntries(cart.map((item) => [item.id, item.quantity])), [cart]);

  return { cart, addToCart, removeFromCart, updateQuantity, clearCart, total, count, quantities };
}
