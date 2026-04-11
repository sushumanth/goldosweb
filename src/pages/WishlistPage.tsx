import { useMemo, useState } from 'react';
import { ArrowLeft, Heart, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { collections } from '../data/collections';
import { clearWishlist, getWishlistIds, removeWishlistItem } from '../lib/shop-storage';

type WishlistProduct = {
  id: number;
  name: string;
  price: number;
  image: string;
  href: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function WishlistPage() {
  const [wishlistIds, setWishlistIds] = useState<number[]>(() => getWishlistIds());

  const wishlistProducts = useMemo(() => {
    const productMap = new Map<number, WishlistProduct>();
    for (const collection of collections) {
      for (const product of collection.products) {
        productMap.set(product.id, {
          id: product.id,
          name: product.name,
          price: Number(product.price.replace(/[^0-9.]/g, '')),
          image: product.image,
          href: `/collections/${collection.slug}/product/${product.id}`,
        });
      }
    }

    return wishlistIds
      .map((id) => productMap.get(id))
      .filter((item): item is WishlistProduct => Boolean(item));
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
          <p className="text-sm text-gray-300">{wishlistProducts.length} items</p>
        </div>
      </section>

      <section className="section-padding py-7">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <h1 className="font-serif text-3xl md:text-4xl text-white">Your Wishlist</h1>
          <p className="text-sm text-gray-300">Saved for later</p>
        </div>

        {wishlistProducts.length === 0 ? (
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

