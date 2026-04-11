export type CartItem = {
  id: number;
  name: string;
  price: number;
  image: string;
  slug?: string;
  quantity: number;
  options?: {
    metal?: string;
    ringSize?: string;
    caratWeight?: string;
    diamondType?: string;
  };
};

const WISHLIST_KEY = 'ag_wishlist';
const CART_KEY = 'ag_cart';
const SHOP_STORAGE_EVENT = 'ag-shop-storage-updated';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function emitUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SHOP_STORAGE_EVENT));
  }
}

function readJSON<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    emitUpdate();
  } catch {
    // Ignore quota/storage errors so UI keeps working.
  }
}

export function getWishlistIds() {
  return readJSON<number[]>(WISHLIST_KEY, []);
}

export function isInWishlist(id: number) {
  return getWishlistIds().includes(id);
}

export function toggleWishlistItem(id: number) {
  const wishlist = getWishlistIds();
  const updated = wishlist.includes(id)
    ? wishlist.filter((itemId) => itemId !== id)
    : [...wishlist, id];

  writeJSON(WISHLIST_KEY, updated);
  return updated;
}

export function removeWishlistItem(id: number) {
  const wishlist = getWishlistIds();
  const updated = wishlist.filter((itemId) => itemId !== id);
  writeJSON(WISHLIST_KEY, updated);
  return updated;
}

export function clearWishlist() {
  writeJSON(WISHLIST_KEY, []);
  return [] as number[];
}

export function getCartItems() {
  return readJSON<CartItem[]>(CART_KEY, []);
}

export function getCartCount() {
  return getCartItems().reduce((total, item) => total + item.quantity, 0);
}

function cartItemKey(item: Pick<CartItem, 'id' | 'slug' | 'options'>) {
  const options = item.options ?? {};
  return `${item.slug ?? ''}-${item.id}-${options.metal ?? ''}-${options.ringSize ?? ''}-${options.caratWeight ?? ''}-${options.diamondType ?? ''}`;
}

export function addToCart(item: Omit<CartItem, 'quantity'> & { quantity?: number }) {
  const cart = getCartItems();
  const nextQuantity = Math.max(1, item.quantity ?? 1);
  const newItem: CartItem = { ...item, quantity: nextQuantity };
  const key = cartItemKey(newItem);

  const existingIndex = cart.findIndex((cartItem) => cartItemKey(cartItem) === key);
  if (existingIndex >= 0) {
    const updated = [...cart];
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: updated[existingIndex].quantity + nextQuantity,
    };
    writeJSON(CART_KEY, updated);
    return updated;
  }

  const updated = [...cart, newItem];
  writeJSON(CART_KEY, updated);
  return updated;
}

export function removeCartItemByIndex(index: number) {
  const cart = getCartItems();
  if (index < 0 || index >= cart.length) {
    return cart;
  }

  const updated = cart.filter((_, itemIndex) => itemIndex !== index);
  writeJSON(CART_KEY, updated);
  return updated;
}

export function setCartItemQuantityByIndex(index: number, quantity: number) {
  const cart = getCartItems();
  if (index < 0 || index >= cart.length) {
    return cart;
  }

  const nextQuantity = Math.max(1, Math.floor(quantity));
  const updated = [...cart];
  updated[index] = {
    ...updated[index],
    quantity: nextQuantity,
  };

  writeJSON(CART_KEY, updated);
  return updated;
}

export function clearCart() {
  writeJSON(CART_KEY, []);
  return [] as CartItem[];
}

export function getShopStorageEventName() {
  return SHOP_STORAGE_EVENT;
}
