import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Heart, Share2 } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { getWishlistIds, toggleWishlistItem } from '../lib/shop-storage';
import { useCart } from '../context/CartContext';
import { applyShareMeta } from '@/lib/share-meta';
import {
  fetchCollectionBySlug,
  fetchProductDetailById,
  fetchProductsByCollectionSlug,
  type ShopCollection,
  type ShopCollectionProduct,
  type ShopProductDetail,
} from '@/lib/shop-api';

function formatCurrency(value: number) {
  return `Rs ${new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

function ProductDetailPage() {
  const params = useParams();
  const navigate = useNavigate();
  const slug = params.slug ?? '';
  const productId = Number(params.productId);
  const { addToCart, cartItems } = useCart();

  const [collection, setCollection] = useState<ShopCollection | null>(null);
  const [product, setProduct] = useState<ShopProductDetail | null>(null);
  const [similarProducts, setSimilarProducts] = useState<ShopCollectionProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetal, setSelectedMetal] = useState('');
  const [selectedCaratWeight, setSelectedCaratWeight] = useState('');
  const [selectedDiamondType, setSelectedDiamondType] = useState('');
  const [wishlistIds, setWishlistIds] = useState<number[]>(() => getWishlistIds());
  const [cartMessage, setCartMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setIsLoading(true);

      try {
        const [collectionPayload, productPayload, relatedPayload] = await Promise.all([
          fetchCollectionBySlug(slug),
          fetchProductDetailById(productId),
          fetchProductsByCollectionSlug(slug),
        ]);

        if (!isMounted) {
          return;
        }

        setCollection(collectionPayload);
        setProduct(productPayload);
        setSimilarProducts(relatedPayload.products.filter((item) => item.id !== productId).slice(0, 4));

        if (productPayload) {
          setSelectedMetal(productPayload.metalOptions[0] ?? '');
          setSelectedCaratWeight(String(productPayload.caratOptions[0] ?? ''));
          setSelectedDiamondType(productPayload.diamondOptions[0] ?? '');
        }
      } catch {
        if (!isMounted) {
          return;
        }

        setCollection(null);
        setProduct(null);
        setSimilarProducts([]);
        toast.error('Unable to load product details from Supabase.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [slug, productId]);

  const calculatedPrice = product?.price ?? 0;

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

  const isProductInCart = useMemo(() => {
    if (!product) {
      return false;
    }

    return cartItems.some((item) => item.productId === product.id);
  }, [cartItems, product]);

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
      { label: 'Price', value: formatCurrency(calculatedPrice) },
      { label: 'Making Charge', value: detailMap.get('making charge') || 'N/A' },
      { label: 'Metal Type', value: selectedMetal || product.metalOptions[0] || detailMap.get('metal type') || 'N/A' },
      { label: 'Weight', value: detailMap.get('weight') || 'N/A' },
      { label: 'Purity', value: detailMap.get('purity') || 'N/A' },
      {
        label: 'Collection',
        value: detailMap.get('collection') || collection?.name || (product.collectionSlug ? product.collectionSlug.replace(/-/g, ' ') : 'N/A'),
      },
    ];
  }, [product, calculatedPrice, selectedMetal, collection?.name]);

  const gallery = useMemo(() => {
    if (!product) {
      return [];
    }

    const uniqueProductImages = Array.from(new Set(product.gallery.filter(Boolean)));
    if (uniqueProductImages.length > 0) {
      return uniqueProductImages;
    }

    return [product.image || '/featured-detail.jpg'];
  }, [product]);

  if (!isLoading && (!collection || !product)) {
    return (
      <div className="min-h-screen bg-charcoal text-white section-padding py-20">
        <div className="max-w-3xl mx-auto border border-white/10 bg-charcoal-light p-10 text-center">
          <h1 className="font-serif text-3xl text-white mb-3">Product Not Found</h1>
          <p className="text-gray-300 mb-5">This product is unavailable in Supabase.</p>
          <Link to="/" className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !collection || !product) {
    return (
      <div className="min-h-screen bg-charcoal text-white section-padding py-20">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 gap-6">
          <div className="aspect-square bg-white/5 skeleton-shimmer" />
          <div className="space-y-4">
            <div className="h-8 bg-white/5 rounded skeleton-shimmer" />
            <div className="h-6 w-2/3 bg-white/5 rounded skeleton-shimmer" />
            <div className="h-40 bg-white/5 rounded skeleton-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (isProductInCart) {
      navigate('/cart');
      return;
    }

    addToCart({
      productId: product.id,
      name: product.name,
      image: product.image,
      unitPrice: calculatedPrice,
      quantity: 1,
      selection: {
        metal: selectedMetal,
        size: 'N/A',
        carat: Number(selectedCaratWeight),
        diamondType: selectedDiamondType,
      },
    });

    setCartMessage(`Added to cart: ${selectedMetal || 'N/A'}.`);
    toast.success(`${product.name} added to cart.`);
  };

  const handleToggleWishlist = (itemId: number) => {
    const isAdding = !wishlistIds.includes(itemId);
    const nextIds = toggleWishlistItem(itemId);
    setWishlistIds(nextIds);

    if (isAdding) {
      toast.success(`${product.name} added to wishlist.`);
    }
  };

  const handleShare = async () => {
    const shareUrl = window.location.href;
    const imageUrl = product.image ? new URL(product.image, window.location.origin).toString() : '';
    const textWithImage = imageUrl
      ? `Check out this jewelry piece: ${product.name}\nImage: ${imageUrl}`
      : `Check out this jewelry piece: ${product.name}`;

    const shareData = {
      title: product.name,
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

            const shareDataWithFile = { ...shareData, files: [imageFile] } as ShareData;
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
          await navigator.share(shareData);
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

  return (
    <div className="min-h-screen bg-charcoal text-white">
      <section className="section-padding py-5 border-b border-white/10">
        <div className="flex items-center justify-between text-sm">
          <Link
            to={`/collections/${collection.slug}`}
            className="inline-flex items-center gap-2 text-gold hover:text-gold-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Collection
          </Link>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-2 text-gray-300 hover:text-gold transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share
          </button>
        </div>
      </section>

      <section className="section-padding py-6">
        <div className="grid lg:grid-cols-[1.45fr_1fr] gap-8 items-start">
          <div>
            <div className="grid sm:grid-cols-2 gap-3">
              {gallery.map((photo, index) => (
                <div key={`${photo}-${index}`} className="bg-charcoal-light border border-white/10 overflow-hidden">
                  <img
                    src={photo}
                    alt={`${product.name} preview ${index + 1}`}
                    className="w-full h-full object-cover aspect-square"
                  />
                </div>
              ))}
            </div>

            <div className="mt-4 border border-white/10 bg-charcoal-light">
              <div className="grid grid-cols-2 text-sm">
                <div className="p-3 border-b border-white/10 text-gray-300">Category</div>
                <div className="p-3 border-b border-white/10 text-right text-white">{product.category}</div>
                <div className="p-3 border-b border-white/10 text-gray-300">Collection</div>
                <div className="p-3 border-b border-white/10 text-right text-white">{collection.name}</div>
                <div className="p-3 text-gray-300">Metal Type</div>
                <div className="p-3 text-right text-white">{selectedMetal || product.metalOptions[0] || 'N/A'}</div>
              </div>
            </div>
          </div>

          <div className="bg-charcoal-light border border-white/10 p-5 lg:sticky lg:top-6">
            <div className="flex items-start justify-between gap-3">
              <h1 className="font-serif text-2xl leading-snug text-white max-w-[92%]">{product.name}</h1>
              <button
                type="button"
                onClick={() => handleToggleWishlist(product.id)}
                className="text-gray-300 hover:text-gold transition-colors"
                aria-label="Add to wishlist"
              >
                <Heart className={`w-5 h-5 ${wishlistIds.includes(product.id) ? 'fill-gold text-gold' : ''}`} />
              </button>
            </div>

            <p className="text-4xl font-semibold text-gold mt-6">{formatCurrency(calculatedPrice)}</p>

            {productInfoRows.length > 0 && (
              <div className="mt-6 space-y-1.5 text-sm text-gray-300">
                {productInfoRows.map((row) => (
                  <p key={row.label} className="leading-relaxed">
                    <span className="text-gray-200 font-medium">{row.label}:</span>{' '}
                    <span>{row.value}</span>
                  </p>
                ))}
              </div>
            )}

            <div className="mt-6 pt-5 border-t border-white/10 space-y-4">
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full h-12 bg-gold text-charcoal font-semibold tracking-wide hover:bg-gold-light transition-colors"
              >
                {isProductInCart ? 'VIEW CART' : 'ADD TO CART'}
              </button>

              {cartMessage && (
                <p className="text-xs text-gold">{cartMessage}</p>
              )}
            </div>

          </div>
        </div>
      </section>

      <section className="section-padding pb-12">
        <h2 className="font-serif text-3xl text-white mb-6">Similar Items</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {similarProducts.map((item) => (
            <article
              key={item.id}
              className="group bg-white/[0.04] border border-white/10 rounded-sm overflow-hidden hover:border-gold/50 transition-colors"
            >
              <Link to={`/collections/${collection.slug}/product/${item.id}`} className="block">
                <div className="relative aspect-[4/4.2] bg-black/30 overflow-hidden">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-500 opacity-100 group-hover:opacity-0 group-hover:scale-105"
                  />
                  <img
                    src={item.hoverImage}
                    alt={`${item.name} worn by model`}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-500 opacity-0 group-hover:opacity-100 group-hover:scale-105"
                  />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      handleToggleWishlist(item.id);
                    }}
                    className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-charcoal/80 border border-white/25 text-white flex items-center justify-center"
                    aria-label="Toggle wishlist"
                  >
                    <Heart className={`w-4 h-4 ${wishlistIds.includes(item.id) ? 'fill-gold text-gold' : ''}`} />
                  </button>
                </div>

                <div className="p-3.5">
                  <h3 className="font-serif text-[0.95rem] leading-snug text-white min-h-[2.8rem]">
                    {item.name}
                  </h3>
                  <p className="text-lg text-gold mt-1">{item.price}</p>

                </div>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default ProductDetailPage;
