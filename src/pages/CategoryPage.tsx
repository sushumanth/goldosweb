import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, ShoppingBag, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import {
  fetchAllCategories,
  fetchProductsByCategorySlug,
  type ShopCategory,
  type ShopProductCard,
} from '@/lib/shop-api';

type SortOption = 'best-sellers' | 'price-low-high' | 'price-high-low' | 'new-arrivals';

function ProductSkeletonCard() {
  return (
    <div className="card-luxury overflow-hidden">
      <div className="aspect-square bg-white/5 skeleton-shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-3 w-20 bg-white/5 rounded skeleton-shimmer" />
        <div className="h-6 w-3/4 bg-white/5 rounded skeleton-shimmer" />
        <div className="h-5 w-1/3 bg-white/5 rounded skeleton-shimmer" />
      </div>
    </div>
  );
}

function CategoryPage() {
  const { categoryName = '' } = useParams();
  const normalizedCategorySlug = decodeURIComponent(categoryName).trim().toLowerCase();
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [activeCategory, setActiveCategory] = useState<ShopCategory | null>(null);
  const [allCategories, setAllCategories] = useState<ShopCategory[]>([]);
  const [products, setProducts] = useState<ShopProductCard[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [engravableOnly, setEngravableOnly] = useState(false);
  const [selectedMetals, setSelectedMetals] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('best-sellers');
  const [maxPriceFilter, setMaxPriceFilter] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadCategoryData = async () => {
      setIsLoading(true);
      setActiveCategory(null);
      setProducts([]);

      try {
        const [categoryPayload, categoriesPayload] = await Promise.all([
          fetchProductsByCategorySlug(normalizedCategorySlug),
          fetchAllCategories(),
        ]);

        if (!isMounted) {
          return;
        }

        setActiveCategory(categoryPayload.category);
        setProducts(categoryPayload.products);
        setAllCategories(categoriesPayload);

        const maxPrice =
          categoryPayload.products.length > 0
            ? Math.max(...categoryPayload.products.map((product) => product.price))
            : 0;
        setMaxPriceFilter(maxPrice);
        setSelectedMetals([]);
        setEngravableOnly(false);
      } catch {
        if (!isMounted) {
          return;
        }

        setActiveCategory(null);
        setProducts([]);
        setAllCategories([]);
        setMaxPriceFilter(0);
        toast.error('Unable to load category data from Supabase.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCategoryData();

    return () => {
      isMounted = false;
    };
  }, [normalizedCategorySlug]);

  const metalTypes = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.metal)));
  }, [products]);

  const filteredProducts = useMemo(() => {
    let nextProducts = products.filter((product) => product.price <= maxPriceFilter);

    if (engravableOnly) {
      nextProducts = nextProducts.filter((product) => product.engravable);
    }

    if (selectedMetals.length > 0) {
      nextProducts = nextProducts.filter((product) => selectedMetals.includes(product.metal));
    }

    switch (sortOption) {
      case 'price-low-high':
        nextProducts.sort((a, b) => a.price - b.price);
        break;
      case 'price-high-low':
        nextProducts.sort((a, b) => b.price - a.price);
        break;
      case 'new-arrivals':
        nextProducts.sort((a, b) => Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)));
        break;
      case 'best-sellers':
      default:
        nextProducts.sort((a, b) => Number(b.isBestSeller) - Number(a.isBestSeller) || b.rating - a.rating);
        break;
    }

    return nextProducts;
  }, [products, maxPriceFilter, engravableOnly, selectedMetals, sortOption]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const toggleWishlist = (id: number) => {
    setWishlist((previous) => {
      const isAdding = !previous.includes(id);
      if (isAdding) {
        const productName = products.find((item) => item.id === id)?.name ?? 'Product';
        toast.success(`${productName} added to wishlist.`);
      }

      return previous.includes(id)
        ? previous.filter((wishlistId) => wishlistId !== id)
        : [...previous, id];
    });
  };

  const toggleMetal = (metal: string) => {
    setSelectedMetals((previous) =>
      previous.includes(metal) ? previous.filter((currentMetal) => currentMetal !== metal) : [...previous, metal],
    );
  };

  const maxCategoryPrice = products.length > 0 ? Math.max(...products.map((product) => product.price)) : 0;

  if (isLoading && !activeCategory) {
    return (
      <main className="min-h-screen bg-charcoal text-white page-fade-in">
        <section className="section-padding pt-5 md:pt-6 pb-1 md:pb-1 border-b border-white/5 bg-charcoal-light/50">
          <div className="max-w-7xl mx-auto">
            <div className="mt-1.5 md:mt-2">
              <p className="text-gold uppercase tracking-[0.22em] text-[10px] md:text-xs">Curated Category</p>
              <div className="h-10 w-52 mt-2 bg-white/5 rounded skeleton-shimmer" />
            </div>
          </div>
        </section>

        <section className="section-padding pt-3 md:pt-4 pb-10 md:pb-12">
          <div className="max-w-7xl mx-auto grid grid-cols-2 xl:grid-cols-4 md:grid-cols-3 gap-6">
            {Array.from({ length: 8 }).map((_, index) => (
              <ProductSkeletonCard key={index} />
            ))}
          </div>
        </section>
      </main>
    );
  }

  if (!activeCategory) {
    return (
      <main className="min-h-screen bg-charcoal text-white page-fade-in section-padding py-24">
        <div className="max-w-3xl mx-auto text-center border border-white/10 bg-charcoal-light p-10">
          <h1 className="heading-md text-white mb-4">Category Not Found</h1>
          <p className="text-gray-400 mb-6">We could not find the category you are looking for.</p>
          <Link to="/" className="btn-primary-luxury inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-charcoal text-white page-fade-in">
      <section className="section-padding pt-5 md:pt-6 pb-1 md:pb-1 border-b border-white/5 bg-charcoal-light/50">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="inline-flex items-center gap-2 text-xs md:text-sm text-gold hover:text-gold-light transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <div className="mt-1.5 md:mt-2 flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-2">
            <div>
              <p className="text-gold uppercase tracking-[0.22em] text-[10px] md:text-xs">Curated Category</p>
              <h1 className="font-serif text-[1.7rem] md:text-[1.95rem] leading-tight text-white mt-1">{activeCategory.name}</h1>
            </div>
            <div className="flex items-center gap-4 md:pb-0.5">
                <div className="text-xs md:text-sm text-gray-400">{isLoading ? 0 : filteredProducts.length} Products Available</div>
              <Link to="/cart" className="relative p-2 text-gray-300 hover:text-gold transition-colors" aria-label="Open cart">
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-gold text-charcoal text-[10px] rounded-full flex items-center justify-center font-semibold">
                    {totalItems}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding pt-3 md:pt-4 pb-10 md:pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5 md:gap-6 lg:gap-7">
          <aside className="order-2 lg:order-1 card-luxury p-6 h-fit lg:sticky lg:top-24">
            <div className="flex items-center gap-2 mb-6">
              <SlidersHorizontal className="w-5 h-5 text-gold" />
              <h2 className="font-serif text-2xl">Filters</h2>
            </div>

            <div className="space-y-7">
              <div>
                <h3 className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Engravable</h3>
                <label className="flex items-center gap-3 text-sm text-gray-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={engravableOnly}
                    onChange={(event) => setEngravableOnly(event.target.checked)}
                    className="w-4 h-4 accent-[hsl(var(--gold))]"
                  />
                  Show engravable only
                </label>
              </div>

              <div>
                <h3 className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Price Range</h3>
                <input
                  type="range"
                  min={0}
                  max={maxCategoryPrice || 1}
                  step={1000}
                  value={maxPriceFilter}
                  onChange={(event) => setMaxPriceFilter(Number(event.target.value))}
                  className="w-full accent-[hsl(var(--gold))]"
                />
                <p className="text-sm text-gray-300 mt-2">Up to {formatPrice(maxPriceFilter || 0)}</p>
              </div>

              <div>
                <h3 className="text-sm uppercase tracking-[0.2em] text-gray-400 mb-3">Metal Type</h3>
                <div className="space-y-2">
                  {metalTypes.map((metal) => (
                    <label key={metal} className="flex items-center gap-3 text-sm text-gray-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMetals.includes(metal)}
                        onChange={() => toggleMetal(metal)}
                        className="w-4 h-4 accent-[hsl(var(--gold))]"
                      />
                      {metal}
                    </label>
                  ))}
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  setEngravableOnly(false);
                  setSelectedMetals([]);
                  setSortOption('best-sellers');
                  setMaxPriceFilter(maxCategoryPrice);
                }}
                className="w-full border-gold text-gold hover:bg-gold hover:text-charcoal"
              >
                Reset Filters
              </Button>
            </div>
          </aside>

          <div className="order-1 lg:order-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 md:mb-5">
              <h2 className="font-serif text-xl md:text-2xl text-white">Products</h2>
              <label className="text-sm text-gray-300 flex items-center gap-3">
                Sort by
                <select
                  value={sortOption}
                  onChange={(event) => setSortOption(event.target.value as SortOption)}
                  className="bg-charcoal-light border border-white/15 px-3 py-2 text-white focus:border-gold focus:outline-none min-w-[165px]"
                >
                  <option value="best-sellers">Best Sellers</option>
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                  <option value="new-arrivals">New Arrivals</option>
                </select>
              </label>
            </div>

            {isLoading && (
              <div className="grid grid-cols-2 xl:grid-cols-4 md:grid-cols-3 gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <ProductSkeletonCard key={index} />
                ))}
              </div>
            )}

            {!isLoading && filteredProducts.length === 0 && (
              <div className="card-luxury p-10 text-center">
                <p className="text-gray-300">No products match your selected filters.</p>
              </div>
            )}

            {!isLoading && filteredProducts.length > 0 && (
              <div className="grid grid-cols-2 xl:grid-cols-4 md:grid-cols-3 gap-6">
                {filteredProducts.map((product) => (
                  <article
                    key={product.id}
                    className="card-luxury group overflow-hidden product-card-premium cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
                    tabIndex={0}
                    role="button"
                    onClick={() => navigate(`/product/${product.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        navigate(`/product/${product.id}`);
                      }
                    }}
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:opacity-0"
                      />
                      <img
                        src={product.hoverImage}
                        alt={`${product.name} alternate view`}
                        loading="lazy"
                        decoding="async"
                        className="absolute inset-0 w-full h-full object-cover opacity-0 transition-all duration-700 group-hover:opacity-100 group-hover:scale-105"
                      />
                      <button
                        aria-label={`Add ${product.name} to wishlist`}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleWishlist(product.id);
                        }}
                        className="absolute top-3 right-3 p-2 rounded-full bg-charcoal/80 text-white hover:text-gold transition-colors"
                      >
                        <Heart
                          className={`w-4 h-4 ${wishlist.includes(product.id) ? 'fill-gold text-gold' : ''}`}
                        />
                      </button>
                      {product.isNew && (
                        <Badge className="absolute top-3 left-3 bg-gold text-charcoal">New</Badge>
                      )}
                    </div>
                    <div className="p-5">
                      <p className="text-gray-400 text-xs uppercase tracking-[0.2em]">{product.category}</p>
                      <h3 className="font-serif text-lg text-white mt-2 leading-tight">{product.name}</h3>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-gold font-medium">{formatPrice(product.price)}</p>
                        <span className="text-xs text-gray-400">{product.metal}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="mt-12 border-t border-white/10 pt-8">
              <p className="text-sm text-gray-400 mb-4">Browse Other Categories</p>
              <div className="flex flex-wrap gap-3">
                {allCategories.map((category) => (
                  <Link
                    key={category.id}
                    to={`/category/${category.slug}`}
                    className="px-4 py-2 border border-white/15 hover:border-gold text-sm transition-colors"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default CategoryPage;
