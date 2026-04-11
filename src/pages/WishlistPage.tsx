import { useEffect, useState } from 'react';
import { ArrowLeft, Heart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { clearWishlist, getShopStorageEventName, getWishlistIds, removeWishlistItem } from '../lib/shop-storage';
import { products as localProducts, toCategorySlug } from '@/data/catalog';
import { fetchProductsByIds, type ShopProductCard } from '@/lib/shop-api';

type WishlistProduct = ShopProductCard & { href: string };

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function WishlistPage() {
  const [wishlistIds, setWishlistIds] = useState<number[]>(() => getWishlistIds());
  const [wishlistProducts, setWishlistProducts] = useState<WishlistProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const syncWishlist = () => setWishlistIds(getWishlistIds());
    const shopStorageEvent = getShopStorageEventName();

    window.addEventListener(shopStorageEvent, syncWishlist);
    window.addEventListener('storage', syncWishlist);

    return () => {
      window.removeEventListener(shopStorageEvent, syncWishlist);
      window.removeEventListener('storage', syncWishlist);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadWishlistProducts = async () => {
      if (wishlistIds.length === 0) {
        setWishlistProducts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const payload = await fetchProductsByIds(wishlistIds);
        if (!isMounted) {
          return;
        }

        const supabaseById = new Map(payload.map((item) => [item.id, item]));
        const localById = new Map(localProducts.map((item) => [item.id, item]));

        const resolved = wishlistIds
          .map((id) => {
            const supabaseProduct = supabaseById.get(id);
            if (supabaseProduct) {
              return {
                ...supabaseProduct,
                href: `/product/${supabaseProduct.id}`,
              };
            }

            const localProduct = localById.get(id);
            if (!localProduct) {
              return null;
            }

            return {
              id: localProduct.id,
              slug: String(localProduct.id),
              name: localProduct.name,
              category: localProduct.category,
              categorySlug: toCategorySlug(localProduct.category),
              collectionSlug: null,
              price: localProduct.price,
              image: localProduct.image,
              hoverImage: localProduct.hoverImage,
              rating: Math.max(1, Math.min(5, Math.round(localProduct.rating))),
              isNew: localProduct.isNew,
              isBestSeller: localProduct.isBestSeller,
              engravable: localProduct.engravable,
              metal: localProduct.metal,
              createdAt: localProduct.createdAt,
              reviewsCount: 0,
              href: `/category/${toCategorySlug(localProduct.category)}`,
            } satisfies WishlistProduct;
          })
          .filter((item): item is WishlistProduct => Boolean(item));

        setWishlistProducts(resolved);
      } catch {
        if (!isMounted) {
          return;
        }

        setWishlistProducts([]);
        toast.error('Unable to load wishlist items from Supabase.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadWishlistProducts();

    return () => {
      isMounted = false;
    };
  }, [wishlistIds]);

  const removeItem = (id: number) => {
    setWishlistIds(removeWishlistItem(id));
  };

  const clearAll = () => {
    setWishlistIds(clearWishlist());
  };

  return (
    <main className="min-h-screen bg-charcoal text-white page-fade-in pb-16">
      <section className="section-padding py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
          <p className="text-sm text-gray-300">{isLoading ? 'Loading...' : `${wishlistProducts.length} items`}</p>
        </div>
      </section>

      <section className="section-padding py-7">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <h1 className="font-serif text-3xl md:text-4xl text-white">Your Wishlist</h1>
          <p className="text-sm text-gray-300">Saved for later</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="border border-white/10 bg-charcoal-light p-3.5 rounded-2xl">
                <div className="grid grid-cols-[84px_1fr] gap-3 items-start">
                  <div className="w-[84px] h-[84px] bg-white/5 rounded-xl skeleton-shimmer" />
                  <div className="space-y-3">
                    <div className="h-6 w-3/4 bg-white/5 rounded skeleton-shimmer" />
                    <div className="h-5 w-1/3 bg-white/5 rounded skeleton-shimmer" />
                    <div className="h-9 w-24 bg-white/5 rounded skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : wishlistProducts.length === 0 ? (
          <div className="border border-white/10 bg-charcoal-light p-6 rounded-2xl">
            <p className="text-gray-300 mb-4">Your wishlist is empty.</p>
            <Link to="/" className="text-gold hover:text-gold-light transition-colors">
              Explore products
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {wishlistProducts.map((product) => (
                <article
                  key={product.id}
                  className="border border-white/15 bg-charcoal-light p-3.5 rounded-2xl hover:border-gold/40 transition-colors"
                >
                  <div className="grid grid-cols-[84px_1fr_auto] gap-3 items-start">
                    <Link to={product.href} className="block group">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-[84px] h-[84px] object-cover border border-white/10 rounded-xl transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </Link>

                    <div>
                      <Link
                        to={product.href}
                        className="font-serif text-xl text-white mb-1 leading-tight line-clamp-2 hover:text-gold transition-colors inline-block"
                      >
                        {product.name}
                      </Link>
                      <p className="text-xl text-gold mb-3">{formatPrice(product.price)}</p>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={product.href}
                          className="h-9 px-3 border border-gold text-gold text-sm inline-flex items-center justify-center rounded-lg hover:bg-gold hover:text-charcoal transition-colors"
                        >
                          View Product
                        </Link>
                        <button
                          type="button"
                          onClick={() => removeItem(product.id)}
                          className="h-9 px-3 border border-white/20 inline-flex items-center gap-2 text-sm rounded-lg hover:border-gold hover:text-gold transition-colors"
                          aria-label="Remove from wishlist"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>

                    <span className="h-9 w-9 border border-white/25 inline-flex items-center justify-center text-gold rounded-lg mt-0.5">
                      <Heart className="w-4 h-4 fill-gold" />
                    </span>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={clearAll}
                className="h-10 px-4 text-sm border border-white/25 rounded-lg hover:border-gold hover:text-gold transition-colors"
              >
                Clear Wishlist
              </button>
              <div className="text-right bg-charcoal-light border border-white/10 rounded-xl px-4 py-2">
                <p className="text-gray-400 text-sm">Saved Items</p>
                <p className="text-2xl text-gold font-semibold">{wishlistProducts.length}</p>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default WishlistPage;

