import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, Heart, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { getWishlistIds, toggleWishlistItem } from '../lib/shop-storage';
import { useCart } from '../context/CartContext';
import { fetchProductsByCollectionSlug, type ShopCollection, type ShopCollectionProduct } from '@/lib/shop-api';

type Audience = 'Women' | 'Men' | 'Unisex';
type FilterKey = 'style' | 'diamondType' | 'metal' | 'priceBand';

const filterConfig: Record<FilterKey, { label: string; options: string[] }> = {
  style: {
    label: 'Style',
    options: ['Ring', 'Necklace', 'Bracelet', 'Bangle', 'Pendant', 'Earrings', 'Studs'],
  },
  diamondType: {
    label: 'Diamond Type',
    options: ['Natural', 'Lab Grown'],
  },
  metal: {
    label: 'Metal',
    options: ['White Gold', 'Yellow Gold', 'Rose Gold', 'Platinum'],
  },
  priceBand: {
    label: 'Price',
    options: ['Under $1,500', '$1,500 - $2,500', '$2,500 - $4,000', 'Above $4,000'],
  },
};

function parsePriceValue(price: string) {
  return Number(price.replace(/[^0-9.]/g, ''));
}

function detectStyle(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('earring')) return 'Earrings';
  if (lower.includes('stud')) return 'Studs';
  if (lower.includes('necklace')) return 'Necklace';
  if (lower.includes('bracelet')) return 'Bracelet';
  if (lower.includes('bangle')) return 'Bangle';
  if (lower.includes('pendant')) return 'Pendant';
  return 'Ring';
}

function detectMetal(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes('platinum')) return 'Platinum';
  if (lower.includes('yellow gold') || lower.includes('22k gold')) return 'Yellow Gold';
  if (lower.includes('rose gold')) return 'Rose Gold';
  return 'White Gold';
}

function detectPriceBand(priceValue: number) {
  if (priceValue < 1500) return 'Under $1,500';
  if (priceValue < 2500) return '$1,500 - $2,500';
  if (priceValue <= 4000) return '$2,500 - $4,000';
  return 'Above $4,000';
}

function inferAudience(id: number): Audience {
  const map: Audience[] = ['Women', 'Men', 'Unisex'];
  return map[id % 3];
}

function CollectionPage() {
  const { slug = '' } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<ShopCollection | null>(null);
  const [collectionProducts, setCollectionProducts] = useState<ShopCollectionProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addToCart, cartItems } = useCart();
  const audienceOptions: Audience[] = ['Women', 'Men', 'Unisex'];
  const [selectedAudience, setSelectedAudience] = useState<Audience | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterKey | null>(null);
  const [selectedFilters, setSelectedFilters] = useState<Record<FilterKey, string[]>>({
    style: [],
    diamondType: [],
    metal: [],
    priceBand: [],
  });
  const [toggleState, setToggleState] = useState({
    plainMetal: false,
    onSale: false,
    engravable: false,
  });
  const [wishlistIds, setWishlistIds] = useState<number[]>(() => getWishlistIds());
  const [cartMessage, setCartMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadCollection = async () => {
      setIsLoading(true);

      try {
        const payload = await fetchProductsByCollectionSlug(slug);
        if (!isMounted) {
          return;
        }

        setCollection(payload.collection);
        setCollectionProducts(payload.products);
      } catch {
        if (!isMounted) {
          return;
        }

        setCollection(null);
        setCollectionProducts([]);
        toast.error('Unable to load collection products from Supabase.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCollection();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const products = useMemo(() => {
    return collectionProducts.map((product) => {
      const priceValue = product.priceValue || parsePriceValue(product.price);
      const style = detectStyle(product.name);
      const metal = detectMetal(product.name);
      const diamondType = product.badges.includes('Lab Grown') ? 'Lab Grown' : 'Natural';
      return {
        ...product,
        style,
        metal,
        diamondType,
        priceBand: detectPriceBand(priceValue),
        audience: inferAudience(product.id),
        plainMetal: !product.name.toLowerCase().includes('diamond'),
        onSale: product.badges.includes('On Sale') || product.id % 5 === 0,
        engravable: style === 'Ring' || style === 'Pendant',
        score: product.rating * 100 + product.reviews,
      };
    });
  }, [collectionProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      if (selectedAudience && product.audience !== selectedAudience) return false;

      const filterKeys = Object.keys(selectedFilters) as FilterKey[];
      for (const key of filterKeys) {
        const values = selectedFilters[key];
        if (values.length > 0 && !values.includes(product[key])) {
          return false;
        }
      }

      if (toggleState.plainMetal && !product.plainMetal) return false;
      if (toggleState.onSale && !product.onSale) return false;
      if (toggleState.engravable && !product.engravable) return false;

      return true;
    });
  }, [products, selectedAudience, selectedFilters, toggleState]);

  const hasActiveFilters =
    selectedAudience !== null ||
    toggleState.plainMetal ||
    toggleState.onSale ||
    toggleState.engravable ||
    (Object.keys(selectedFilters) as FilterKey[]).some((key) => selectedFilters[key].length > 0);

  const cartProductIds = useMemo(() => {
    return new Set(cartItems.map((item) => item.productId));
  }, [cartItems]);

  if (!isLoading && !collection) {
    return (
      <div className="min-h-screen bg-charcoal text-white section-padding py-20">
        <div className="max-w-3xl mx-auto border border-white/10 bg-charcoal-light p-10 text-center">
          <h1 className="font-serif text-3xl text-white mb-3">Collection Not Found</h1>
          <p className="text-gray-300 mb-5">This collection is unavailable or missing in Supabase.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const toggleFilterValue = (key: FilterKey, value: string) => {
    setSelectedFilters((prev) => {
      const exists = prev[key].includes(value);
      return {
        ...prev,
        [key]: exists ? prev[key].filter((item) => item !== value) : [...prev[key], value],
      };
    });
  };

  const clearAllFilters = () => {
    setSelectedAudience(null);
    setToggleState({ plainMetal: false, onSale: false, engravable: false });
    setSelectedFilters({ style: [], diamondType: [], metal: [], priceBand: [] });
    setActiveFilter(null);
  };

  const toggleProductWishlist = (productId: number) => {
    const isAdding = !wishlistIds.includes(productId);
    const nextIds = toggleWishlistItem(productId);
    setWishlistIds(nextIds);

    if (isAdding) {
      const productName = products.find((item) => item.id === productId)?.name ?? 'Product';
      toast.success(`${productName} added to wishlist.`);
    }
  };

  const addCollectionProductToCart = (product: {
    id: number;
    name: string;
    price: string;
    image: string;
    badges: string[];
  }) => {
    const numericPrice = Number(product.price.replace(/[^0-9.]/g, ''));
    addToCart({
      productId: product.id,
      name: product.name,
      image: product.image,
      unitPrice: Number.isFinite(numericPrice) ? numericPrice : 0,
      quantity: 1,
      selection: {
        metal: detectMetal(product.name),
        carat: 3,
        diamondType: product.badges.includes('Lab Grown') ? 'Lab Grown' : 'Natural',
        size: 'N/A',
      },
    });
    toast.success(`${product.name} added to cart.`);
    setCartMessage(`${product.name} added to cart.`);
    window.setTimeout(() => setCartMessage(''), 2000);
  };

  return (
    <div className="min-h-screen bg-charcoal text-white">
      <div className="section-padding py-5 border-b border-white/10 bg-charcoal">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <section className="section-padding py-7">
        <div className="max-w-5xl">
          <p className="text-[11px] tracking-[0.2em] uppercase text-gold/80 mb-2">{collection?.subtitle}</p>
          <h1 className="font-serif text-2xl md:text-3xl text-white mb-3">{collection?.name}</h1>
          <p className="text-sm text-gray-300 max-w-4xl leading-relaxed">
            {collection?.description}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {audienceOptions.map((target) => (
              <button
                key={target}
                type="button"
                onClick={() => setSelectedAudience((current) => (current === target ? null : target))}
                className={`rounded-full border px-5 py-2 text-sm transition-colors ${
                  selectedAudience === target
                    ? 'bg-gold/20 border-gold text-gold'
                    : 'bg-charcoal-light border-white/15 text-white hover:border-gold/70 hover:text-gold'
                }`}
              >
                {target}
              </button>
            ))}
            {selectedAudience && (
              <button
                type="button"
                onClick={() => setSelectedAudience(null)}
                className="text-xs text-gray-300 hover:text-gold transition-colors"
              >
                Reset audience
              </button>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {(Object.keys(filterConfig) as FilterKey[]).map((key) => {
              const selectedCount = selectedFilters[key].length;
              return (
                <div key={key} className="relative">
                  <button
                    type="button"
                    onClick={() => setActiveFilter((current) => (current === key ? null : key))}
                    className={`rounded-full border px-4 py-2 text-sm inline-flex items-center gap-1.5 transition-colors ${
                      activeFilter === key || selectedCount > 0
                        ? 'bg-gold/20 border-gold text-gold'
                        : 'bg-charcoal-light border-white/20 text-white hover:border-gold/70 hover:text-gold'
                    }`}
                  >
                    {filterConfig[key].label}
                    {selectedCount > 0 ? ` (${selectedCount})` : ''}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>

                  {activeFilter === key && (
                    <div className="absolute z-20 mt-2 min-w-[220px] rounded-md border border-white/15 bg-charcoal-light p-3 shadow-xl">
                      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
                        Select {filterConfig[key].label}
                      </p>
                      <div className="space-y-2">
                        {filterConfig[key].options.map((option) => {
                          const checked = selectedFilters[key].includes(option);
                          return (
                            <label
                              key={option}
                              className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFilterValue(key, option)}
                                className="h-4 w-4 accent-[#C5A059]"
                              />
                              {option}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {[
              { key: 'plainMetal', label: 'Plain Metal' },
              { key: 'onSale', label: 'On Sale' },
              { key: 'engravable', label: 'Engravable' },
            ].map((toggle) => (
              <button
                key={toggle.key}
                type="button"
                onClick={() =>
                  setToggleState((prev) => ({
                    ...prev,
                    [toggle.key]: !prev[toggle.key as keyof typeof prev],
                  }))
                }
                className={`rounded-full border px-4 py-2 text-sm inline-flex items-center gap-2 transition-colors ${
                  toggleState[toggle.key as keyof typeof toggleState]
                    ? 'bg-gold/20 border-gold text-gold'
                    : 'bg-charcoal-light border-white/20 text-white hover:border-gold/70 hover:text-gold'
                }`}
              >
                <span
                  className={`w-4 h-4 border inline-block ${
                    toggleState[toggle.key as keyof typeof toggleState]
                      ? 'border-gold bg-gold/30'
                      : 'border-white/60'
                  }`}
                />
                {toggle.label}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 text-sm text-gray-300 hover:text-gold transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Clear all
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 border-t border-white/10 pt-4">
          <p className="text-base text-gray-400">{isLoading ? 'Loading...' : `${filteredProducts.length.toLocaleString()} Results`}</p>
        </div>

        {isLoading && (
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="bg-white/[0.04] border border-white/10 rounded-sm overflow-hidden">
                <div className="aspect-[4/4.2] bg-white/5 skeleton-shimmer" />
                <div className="p-3.5 space-y-3">
                  <div className="h-4 bg-white/5 rounded skeleton-shimmer" />
                  <div className="h-4 w-2/3 bg-white/5 rounded skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {filteredProducts.map((product) => {
            const isInCart = cartProductIds.has(product.id);

            return (
            <article
              key={product.id}
              className="group bg-white/[0.04] border border-white/10 rounded-sm overflow-hidden hover:border-gold/50 transition-colors"
            >
              <Link to={`/collections/${slug}/product/${product.id}`} className="block">
                <div className="relative aspect-[4/4.2] bg-black/30 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-500 opacity-100 group-hover:opacity-0 group-hover:scale-105"
                  />
                  <img
                    src={product.hoverImage}
                    alt={`${product.name} worn by model`}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-500 opacity-0 group-hover:opacity-100 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toggleProductWishlist(product.id);
                    }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-charcoal/80 border border-white/25 text-white flex items-center justify-center"
                    aria-label="Toggle wishlist"
                  >
                    <Heart className={`w-4 h-4 ${wishlistIds.includes(product.id) ? 'fill-gold text-gold' : ''}`} />
                  </button>
                </div>

                <div className="p-3.5">
                  <h3 className="font-serif text-[0.95rem] leading-snug text-white min-h-[2.8rem]">
                    {product.name}
                  </h3>
                  <p className="text-lg text-gold mt-1">{product.price}</p>

                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {product.badges.map((badge) => (
                      <span
                        key={`${product.id}-${badge}`}
                        className="text-[11px] px-2 py-0.5 border border-white/20 bg-charcoal-light text-gray-200"
                      >
                        + {badge}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (isInCart) {
                        navigate('/cart');
                        return;
                      }
                      addCollectionProductToCart(product);
                    }}
                    className={`mt-3 w-full h-9 border border-gold transition-colors text-sm ${
                      isInCart
                        ? 'bg-gold text-charcoal hover:bg-gold-light'
                        : 'text-gold hover:bg-gold hover:text-charcoal'
                    }`}
                  >
                    {isInCart ? 'View Cart' : 'Add to Cart'}
                  </button>
                </div>
              </Link>
            </article>
            );
          })}
        </div>
        )}

        {cartMessage && (
          <p className="mt-3 text-sm text-gold">{cartMessage}</p>
        )}

        {filteredProducts.length === 0 && (
          <div className="mt-8 border border-white/10 bg-charcoal-light p-6 text-center rounded-sm">
            <p className="text-base text-gray-200">No products match these filters.</p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-3 text-sm text-gold hover:text-gold-light transition-colors"
            >
              Reset filters
            </button>
          </div>
        )}

        <div className="mt-8">
          <a href="/" className="inline-flex items-center gap-2 text-sm border-b border-gold pb-1 text-gold hover:text-gold-light transition-colors">
            Continue Browsing
          </a>
        </div>
      </section>
    </div>
  );
}

export default CollectionPage;
