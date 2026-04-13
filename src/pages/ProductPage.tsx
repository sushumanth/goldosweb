import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Heart, Loader2, Share2, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { applyShareMeta } from '@/lib/share-meta';
import { getShopStorageEventName, getWishlistIds, toggleWishlistItem } from '@/lib/shop-storage';
import { fetchProductDetailById, type ShopProductDetail } from '@/lib/shop-api';

function ProductPage() {
  const { productId = '' } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { addToCart, totalItems, cartItems } = useCart();
  const resolvedProductId = Number(productId);

  const [product, setProduct] = useState<ShopProductDetail | null>(null);
  const [loadedProductId, setLoadedProductId] = useState<number | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [wishlisted, setWishlisted] = useState(() => getWishlistIds().includes(resolvedProductId));

  const [selectedMetal, setSelectedMetal] = useState('');
  const [selectedCarat, setSelectedCarat] = useState(0);
  const [selectedDiamondType, setSelectedDiamondType] = useState('');
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const isLoading = loadedProductId !== resolvedProductId;

  useEffect(() => {
    const syncWishlist = () => {
      setWishlisted(getWishlistIds().includes(resolvedProductId));
    };

    syncWishlist();

    const shopStorageEvent = getShopStorageEventName();
    window.addEventListener(shopStorageEvent, syncWishlist);
    window.addEventListener('storage', syncWishlist);

    return () => {
      window.removeEventListener(shopStorageEvent, syncWishlist);
      window.removeEventListener('storage', syncWishlist);
    };
  }, [resolvedProductId]);

  useEffect(() => {
    let isMounted = true;

    const loadProduct = async () => {
      try {
        const nextProduct = await fetchProductDetailById(resolvedProductId);
        if (!isMounted) {
          return;
        }

        setProduct(nextProduct);
        setLoadedProductId(resolvedProductId);

        if (nextProduct) {
          setSelectedMetal(nextProduct.metalOptions[0] ?? '');
          setSelectedCarat(nextProduct.caratOptions[0] ?? 0);
          setSelectedDiamondType(nextProduct.diamondOptions[0] ?? '');
          setActiveImageIndex(0);
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setProduct(null);
        setLoadedProductId(resolvedProductId);
        toast.error('Unable to load product details from Supabase.');
      }
    };

    void loadProduct();

    return () => {
      isMounted = false;
    };
  }, [resolvedProductId]);

  const activeImage = useMemo(() => {
    if (!product) {
      return '';
    }

    return product.gallery[activeImageIndex] ?? product.gallery[0];
  }, [activeImageIndex, product]);

  const productName = product?.name ?? 'Jewelry product';

  const price = product?.price ?? 0;

  const formatPrice = (value: number) => `Rs ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value)}`;

  useEffect(() => {
    if (!product) {
      return;
    }

    const imageUrl = product.image
      ? new URL(product.image, window.location.origin).toString()
      : new URL('/featured-main.jpg', window.location.origin).toString();

    applyShareMeta({
      title: `${product.name} | Aurum & Gems`,
      description: (product.description || `Explore ${product.name} from Aurum and Gems.`).slice(0, 180),
      url: window.location.href,
      image: imageUrl,
    });
  }, [product]);

  const productInfoRows = useMemo(() => {
    if (!product) {
      return [] as Array<{ label: string; value: string }>;
    }

    const rawDescription = (product.longDescription || product.description || '')
      .replace(/\s+/g, ' ')
      .trim();

    const detailMap = new Map<string, string>();
    if (rawDescription) {
      const normalized = rawDescription
        .replace(/\s*\|\s*/g, ' | ')
        .replace(
          /\s+(Category:|Collection:|Base Price:|Original Price:|Making Charge:|Weight:|Purity:|Flags:)/g,
          ' | $1',
        );

      normalized
        .split('|')
        .map((token) => token.trim())
        .filter(Boolean)
        .forEach((line) => {
          const splitIndex = line.indexOf(':');
          if (splitIndex <= 0) {
            return;
          }

          const label = line.slice(0, splitIndex).trim().toLowerCase();
          const value = line.slice(splitIndex + 1).trim();
          if (value) {
            detailMap.set(label, value);
          }
        });
    }

    return [
      { label: 'Category', value: product.category || 'N/A' },
      { label: 'Price', value: formatPrice(price) },
      { label: 'Making Charge', value: detailMap.get('making charge') || 'N/A' },
      { label: 'Metal Type', value: selectedMetal || product.metalOptions[0] || detailMap.get('metal type') || 'N/A' },
      { label: 'Weight', value: detailMap.get('weight') || 'N/A' },
      { label: 'Purity', value: detailMap.get('purity') || 'N/A' },
      {
        label: 'Collection',
        value:
          detailMap.get('collection')
          || (product.collectionSlug ? product.collectionSlug.replace(/-/g, ' ') : 'N/A'),
      },
    ];
  }, [product, price, selectedMetal]);

  const requiresMetal = Boolean(product && product.metalOptions.length > 0);
  const requiresCarat = Boolean(product && product.caratOptions.length > 0);
  const requiresDiamondType = Boolean(product && product.diamondOptions.length > 0);

  const canAddToCart = Boolean(
    product
      && !isAddingToCart
      && (!requiresMetal || selectedMetal)
      && (!requiresCarat || selectedCarat > 0)
      && (!requiresDiamondType || selectedDiamondType),
  );

  const isProductInCart = useMemo(() => {
    if (!product) {
      return false;
    }

    return cartItems.some((item) => item.productId === product.id);
  }, [cartItems, product]);

  const canUsePrimaryCta = isProductInCart || canAddToCart;

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const imageUrl = product?.image ? new URL(product.image, window.location.origin).toString() : '';
    const textWithImage = imageUrl
      ? `Check out this jewelry piece: ${productName}\nImage: ${imageUrl}`
      : `Check out this jewelry piece: ${productName}`;

    const data = {
      title: productName,
      text: textWithImage,
      url: shareUrl,
    };

    const fallbackMessage = [textWithImage, shareUrl]
      .filter(Boolean)
      .join('\n');

    try {
      let productImageBlob: Blob | null = null;
      if (imageUrl) {
        try {
          const response = await fetch(imageUrl);
          if (response.ok) {
            productImageBlob = await response.blob();
          }
        } catch {
          // Continue with non-image fallback when image download fails.
        }
      }

      if (navigator.share) {
        let sharedWithImage = false;

        if (productImageBlob) {
          try {
            const extensionFromType = productImageBlob.type.split('/')[1] || 'jpg';
            const imageFile = new File([productImageBlob], `product-image.${extensionFromType}`, {
              type: productImageBlob.type || 'image/jpeg',
            });

            const shareDataWithFile = { ...data, files: [imageFile] } as ShareData;
            const canShareFile = (navigator as Navigator & { canShare?: (shareData?: ShareData) => boolean }).canShare;

            if (canShareFile?.(shareDataWithFile)) {
              await navigator.share(shareDataWithFile);
              sharedWithImage = true;
            }
          } catch {
            // Fallback to regular text/url share below.
          }
        }

        if (!sharedWithImage) {
          await navigator.share(data);
        }

        toast.success(sharedWithImage ? 'Product image and link shared.' : 'Product link shared.');
        return;
      }

      if (productImageBlob && navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        try {
          const mimeType = productImageBlob.type || 'image/jpeg';
          const clipboardPayload: Record<string, Blob> = {
            [mimeType]: productImageBlob,
            'text/plain': new Blob([fallbackMessage], { type: 'text/plain' }),
          };

          await navigator.clipboard.write([new ClipboardItem(clipboardPayload)]);
          toast.success('Image copied. Paste in chat to send image with link.');
          return;
        } catch {
          // Continue with text-only clipboard fallback.
        }
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(fallbackMessage);
        toast.success(imageUrl ? 'Product link and image URL copied.' : 'Product link copied to clipboard.');
        return;
      }

      const textarea = document.createElement('textarea');
      textarea.value = fallbackMessage;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);

      if (copied) {
        toast.success(imageUrl ? 'Product link and image URL copied.' : 'Product link copied to clipboard.');
      } else {
        toast.error('Unable to share right now.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }

      toast.error('Unable to share right now.');
    }
  };

  const handleAddToCart = async () => {
    if (isProductInCart) {
      navigate('/cart');
      return;
    }

    if (!product || !canAddToCart) {
      toast.error('Please select the available product options before adding to cart.');
      return;
    }

    setIsAddingToCart(true);

    await new Promise((resolve) => window.setTimeout(resolve, 320));

    addToCart({
      productId: product.id,
      name: product.name,
      image: product.image,
      unitPrice: price,
      quantity: 1,
      selection: {
        metal: selectedMetal || 'N/A',
        carat: selectedCarat || 0,
        diamondType: selectedDiamondType || 'N/A',
        size: 'N/A',
      },
    });

    setIsAddingToCart(false);
    toast.success('Added to Cart');
  };

  if (!isLoading && !product) {
    return (
      <main className="min-h-screen bg-charcoal text-white page-fade-in section-padding py-20">
        <div className="max-w-3xl mx-auto border border-white/10 bg-charcoal-light p-10 text-center">
          <h1 className="heading-md mb-3">Product Not Found</h1>
          <p className="text-gray-400 mb-6">We could not locate this product.</p>
          <Link to="/" className="btn-primary-luxury inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-charcoal text-white page-fade-in pb-20 md:pb-8">
      <section className="section-padding pt-10 md:pt-10 pb-2 md:pb-3 border-b border-white/5 bg-charcoal-light/45">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <Link
            to={product ? `/category/${product.categorySlug}` : '/'}
            className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Category
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-gold transition-colors"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
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
      </section>

      <section className="section-padding pt-3 md:pt-4 pb-10">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.3fr_0.9fr] gap-7 lg:gap-10">
          <div>
            {isLoading && (
              <div className="space-y-4">
                <div className="aspect-[4/5] max-h-[74vh] bg-white/5 skeleton-shimmer" />
                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="aspect-square bg-white/5 skeleton-shimmer" />
                  ))}
                </div>
              </div>
            )}

            {!isLoading && product && (
              <>
                {isMobile ? (
                  <div className="space-y-3">
                    <div
                      className="flex overflow-x-auto snap-x snap-mandatory gap-3 scrollbar-hide"
                      onScroll={(event) => {
                        const container = event.currentTarget;
                        const index = Math.round(container.scrollLeft / container.clientWidth);
                        if (index !== activeImageIndex) {
                          setActiveImageIndex(index);
                        }
                      }}
                    >
                      {product.gallery.map((image, index) => (
                        <div key={`${image}-${index}`} className="min-w-full snap-center">
                          <div className="aspect-[4/5] max-h-[62vh] bg-[#111] border border-white/10 overflow-hidden flex items-center justify-center">
                            <img
                              src={image}
                              alt={`${productName} view ${index + 1}`}
                              loading={index === 0 ? 'eager' : 'lazy'}
                              decoding="async"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-center gap-2">
                      {product.gallery.map((_, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={`h-1.5 rounded-full transition-all ${
                            activeImageIndex === index ? 'w-8 bg-gold' : 'w-3 bg-white/25'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="aspect-[4/5] max-h-[76vh] bg-[#111] border border-white/10 overflow-hidden flex items-center justify-center group">
                      <img
                        src={activeImage}
                        alt={productName}
                        loading="eager"
                        decoding="async"
                        className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      {product.gallery.map((image, index) => (
                        <button
                          key={`${image}-${index}`}
                          type="button"
                          onClick={() => setActiveImageIndex(index)}
                          className={`aspect-square bg-[#111] border overflow-hidden flex items-center justify-center transition-colors ${
                            activeImageIndex === index ? 'border-gold' : 'border-white/10 hover:border-gold/60'
                          }`}
                        >
                          <img
                            src={image}
                            alt={`${productName} thumb ${index + 1}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="lg:sticky lg:top-24 h-fit border border-white/10 bg-charcoal-light p-5 md:p-6">
            {isLoading && (
              <div className="space-y-4">
                <div className="h-9 w-4/5 bg-white/5 skeleton-shimmer rounded" />
                <div className="h-5 w-1/3 bg-white/5 skeleton-shimmer rounded" />
                <div className="h-8 w-1/4 bg-white/5 skeleton-shimmer rounded" />
                <div className="h-48 w-full bg-white/5 skeleton-shimmer rounded" />
              </div>
            )}

            {!isLoading && product && (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <h1 className="font-serif text-2xl md:text-3xl leading-tight max-w-[92%]">{product.name}</h1>
                  <button
                    type="button"
                    onClick={() => {
                      const isAdding = !wishlisted;
                      const nextIds = toggleWishlistItem(product.id);
                      setWishlisted(nextIds.includes(product.id));

                      if (isAdding) {
                        toast.success(`${productName} added to wishlist.`);
                      }
                    }}
                    className="text-gray-300 hover:text-gold transition-colors"
                    aria-label="Add to wishlist"
                  >
                    <Heart className={`w-5 h-5 ${wishlisted ? 'fill-gold text-gold' : ''}`} />
                  </button>
                </div>

                <p className="text-3xl md:text-4xl font-semibold text-gold">{formatPrice(price)}</p>

                {productInfoRows.length > 0 && (
                  <div className="space-y-1.5 text-sm text-gray-300">
                    {productInfoRows.map((row) => (
                      <p key={row.label} className="leading-relaxed">
                        <span className="text-gray-200 font-medium">{row.label}:</span>{' '}
                        <span>{row.value}</span>
                      </p>
                    ))}
                  </div>
                )}

                <div className="pt-5 border-t border-white/10 space-y-5">
                  <div>
                    <p className="text-base text-white mb-2">
                      Metal Type: <span className="text-gold font-semibold">{selectedMetal || 'Not specified'}</span>
                    </p>
                    {product.metalOptions.length > 1 ? (
                      <div className="flex flex-wrap gap-2">
                        {product.metalOptions.map((option) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => setSelectedMetal(option)}
                            className={`pdp-option-chip ${selectedMetal === option ? 'active' : ''}`}
                          >
                            {option}
                          </button>
                        ))}
                      </div>
                    ) : product.metalOptions.length === 1 ? (
                      <p className="text-sm text-gray-400">Single metal option available.</p>
                    ) : (
                      <p className="text-sm text-gray-400">No metal variants configured in database.</p>
                    )}
                  </div>

                  <div className="hidden md:grid grid-cols-[1fr_auto] gap-3">
                    <Button
                      onClick={handleAddToCart}
                      disabled={!canUsePrimaryCta}
                      className="h-12 bg-gold text-charcoal font-semibold tracking-wide hover:bg-gold-light disabled:opacity-60"
                    >
                      {isAddingToCart ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      {isProductInCart ? 'View Cart' : 'Add To Cart'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShare}
                      className="h-12 border-white/30 text-white hover:border-gold hover:text-gold"
                    >
                      Share
                    </Button>
                  </div>

                  {product.isNew && <Badge className="bg-gold text-charcoal">New Arrival</Badge>}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {!isLoading && product && (
        <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden border-t border-white/10 bg-charcoal/95 backdrop-blur-md p-3">
          <div className="section-padding !px-0 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 truncate">{product.name}</p>
              <p className="text-gold font-semibold">{formatPrice(price)}</p>
            </div>
            <Button
              onClick={handleAddToCart}
              disabled={!canUsePrimaryCta}
              className="h-11 bg-gold text-charcoal font-semibold hover:bg-gold-light disabled:opacity-60"
            >
              {isAddingToCart ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {isProductInCart ? 'View Cart' : 'Add To Cart'}
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

export default ProductPage;
