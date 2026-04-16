import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getTenantStorageNamespace } from '@/lib/tenant';

export type CartSelection = {
  metal: string;
  carat: number;
  diamondType: string;
  size: string;
};

export type CartItem = {
  key: string;
  productId: number;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  selection: CartSelection;
};

type AddToCartPayload = {
  productId: number;
  name: string;
  image: string;
  unitPrice: number;
  quantity?: number;
  selection: CartSelection;
};

type CartContextValue = {
  cartItems: CartItem[];
  totalItems: number;
  subtotal: number;
  addToCart: (payload: AddToCartPayload) => void;
  updateQuantity: (itemKey: string, quantity: number) => void;
  removeFromCart: (itemKey: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = 'aurum-cart-v1';

function getScopedStorageKey() {
  return `${STORAGE_KEY}:${getTenantStorageNamespace()}`;
}

const CartContext = createContext<CartContextValue | null>(null);

const createItemKey = (payload: AddToCartPayload) => {
  const { productId, selection } = payload;
  return [productId, selection.metal, selection.carat, selection.diamondType, selection.size].join('|');
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(getScopedStorageKey());
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as CartItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    window.localStorage.setItem(getScopedStorageKey(), JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (payload: AddToCartPayload) => {
    const nextKey = createItemKey(payload);
    const nextQuantity = payload.quantity ?? 1;

    setCartItems((previous) => {
      const existing = previous.find((item) => item.key === nextKey);
      if (existing) {
        return previous.map((item) =>
          item.key === nextKey ? { ...item, quantity: item.quantity + nextQuantity } : item,
        );
      }

      return [
        ...previous,
        {
          key: nextKey,
          productId: payload.productId,
          name: payload.name,
          image: payload.image,
          unitPrice: payload.unitPrice,
          quantity: nextQuantity,
          selection: payload.selection,
        },
      ];
    });
  };

  const updateQuantity = (itemKey: string, quantity: number) => {
    if (quantity <= 0) {
      setCartItems((previous) => previous.filter((item) => item.key !== itemKey));
      return;
    }

    setCartItems((previous) =>
      previous.map((item) => (item.key === itemKey ? { ...item, quantity } : item)),
    );
  };

  const removeFromCart = (itemKey: string) => {
    setCartItems((previous) => previous.filter((item) => item.key !== itemKey));
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const value = useMemo(() => {
    const totalItems = cartItems.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cartItems.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

    return {
      cartItems,
      totalItems,
      subtotal,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
    };
  }, [cartItems]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }

  return context;
}
