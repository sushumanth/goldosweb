import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { toast } from 'sonner';
import { 
  Menu, Phone, Mail, MapPin,
  Heart, Search, Award, Shield, Gem, ShoppingBag,
  ArrowRight, Calendar
} from 'lucide-react';

// Custom WhatsApp Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCart } from '@/context/CartContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { categories as localCatalogCategories, products } from '@/data/catalog';
import { collections as localLandingCollections } from '@/data/collections';
import { getShopStorageEventName, getWishlistIds, toggleWishlistItem } from '@/lib/shop-storage';
import { fetchAllCategories, fetchAllCollections, type ShopCategory, type ShopCollection } from '@/lib/shop-api';

gsap.registerPlugin(ScrollTrigger);

const fallbackLandingCollections: ShopCollection[] = localLandingCollections.map((collection, index) => ({
  id: index + 1,
  name: collection.name,
  slug: collection.slug,
  subtitle: collection.subtitle,
  description: collection.description,
  image: collection.image,
}));

const PRIORITY_COLLECTION_SLUGS = ['gold-classics', 'bridal-collection', 'diamond-essentials'] as const;

type HomeCategory = {
  id: number;
  name: string;
  slug: string;
  image: string;
  count: number;
};

const fallbackHomeCategories: HomeCategory[] = localCatalogCategories.map((category, index) => ({
  id: index + 1,
  name: category.name,
  slug: category.name.toLowerCase().trim().replace(/\s+/g, '-'),
  image: category.image,
  count: category.count,
}));

function mapShopCategoryToHomeCategory(category: ShopCategory): HomeCategory {
  const fallbackMatch = fallbackHomeCategories.find((item) => item.slug === category.slug);

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    image: category.image || fallbackMatch?.image || '/cat-rings.jpg',
    count: category.productCount ?? 0,
  };
}

function App() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { totalItems, addToCart, cartItems } = useCart();
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isWhatsAppDialogOpen, setIsWhatsAppDialogOpen] = useState(false);
  const [isAppointmentDialogOpen, setIsAppointmentDialogOpen] = useState(false);
  const [wishlist, setWishlist] = useState<number[]>(() => getWishlistIds());
  const [isHeroVideoReady, setIsHeroVideoReady] = useState(false);
  const [isBridalVideoReady, setIsBridalVideoReady] = useState(false);
  const [hasBridalVideoError, setHasBridalVideoError] = useState(false);
  const [isGoldClassicsVideoReady, setIsGoldClassicsVideoReady] = useState(false);
  const [hasGoldClassicsVideoError, setHasGoldClassicsVideoError] = useState(false);
  const [isEssentialsVideoReady, setIsEssentialsVideoReady] = useState(false);
  const [hasEssentialsVideoError, setHasEssentialsVideoError] = useState(false);
  const [hoveredCollection, setHoveredCollection] = useState<string | null>(null);
  const [landingCollections, setLandingCollections] = useState<ShopCollection[]>(fallbackLandingCollections);
  const [landingCategories, setLandingCategories] = useState<HomeCategory[]>(fallbackHomeCategories);
  const [shouldPlayHeroVideo] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const prefersSaveData = Boolean(connection?.saveData);
    return !(prefersReducedMotion || prefersSaveData);
  });
  
  const heroRef = useRef<HTMLDivElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);
  const featuredRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const productsRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animations
      gsap.from('.hero-title', {
        opacity: 0,
        y: 50,
        duration: 1.2,
        ease: 'power3.out',
        delay: 0.3
      });
      
      gsap.from('.hero-subtitle', {
        opacity: 0,
        y: 30,
        duration: 1,
        ease: 'power3.out',
        delay: 0.6
      });
      
      gsap.from('.hero-cta', {
        opacity: 0,
        y: 20,
        duration: 0.8,
        ease: 'power3.out',
        delay: 0.9
      });

      // Collection section
      gsap.from('.collection-title', {
        scrollTrigger: {
          trigger: collectionRef.current,
          start: 'top 80%',
        },
        opacity: 0,
        x: -50,
        duration: 1,
        ease: 'power3.out'
      });

      gsap.from('.collection-card', {
        scrollTrigger: {
          trigger: collectionRef.current,
          start: 'top 70%',
        },
        opacity: 0,
        x: 100,
        duration: 1,
        stagger: 0.2,
        ease: 'power3.out'
      });

      // Featured section
      gsap.from('.featured-content', {
        scrollTrigger: {
          trigger: featuredRef.current,
          start: 'top 75%',
        },
        opacity: 0,
        y: 50,
        duration: 1,
        ease: 'power3.out'
      });

      // Category section
      gsap.from('.category-card', {
        scrollTrigger: {
          trigger: categoryRef.current,
          start: 'top 75%',
        },
        opacity: 0,
        y: 60,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out'
      });

      // Products section
      gsap.fromTo(
        '.product-card',
        {
          opacity: 0,
          y: 40,
        },
        {
          scrollTrigger: {
            trigger: productsRef.current,
            start: 'top 75%',
            invalidateOnRefresh: true,
          },
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.1,
          ease: 'power3.out',
          immediateRender: false,
        },
      );

      // Trust section
      gsap.from('.trust-item', {
        scrollTrigger: {
          trigger: trustRef.current,
          start: 'top 80%',
        },
        opacity: 0,
        y: 30,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power3.out'
      });
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const syncWishlist = () => setWishlist(getWishlistIds());
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

    const loadHomeContent = async () => {
      const [collectionsResult, categoriesResult] = await Promise.allSettled([
        fetchAllCollections(),
        fetchAllCategories(),
      ]);

      if (!isMounted) {
        return;
      }

      if (collectionsResult.status === 'fulfilled') {
        setLandingCollections(collectionsResult.value);
      } else {
        setLandingCollections(fallbackLandingCollections);
        toast.error('Unable to load collections from Supabase. Showing local lookbook.');
      }

      if (categoriesResult.status === 'fulfilled') {
        setLandingCategories(categoriesResult.value.map((category) => mapShopCategoryToHomeCategory(category)));
      } else {
        setLandingCategories(fallbackHomeCategories);
        toast.error('Unable to load categories from Supabase. Showing local categories.');
      }
    };

    void loadHomeContent();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleWishlist = (id: number) => {
    const isAdding = !wishlist.includes(id);
    const updated = toggleWishlistItem(id);
    setWishlist(updated);

    if (isAdding) {
      const productName = products.find((item) => item.id === id)?.name ?? 'Product';
      toast.success(`${productName} added to wishlist.`);
    }
  };

  const addProductToCart = (product: (typeof products)[0]) => {
    addToCart({
      productId: product.id,
      name: product.name,
      image: product.image,
      unitPrice: product.price,
      quantity: 1,
      selection: {
        metal: product.metal,
        carat: 3,
        diamondType: product.metal === 'Diamond' ? 'Natural' : 'Lab-Grown',
        size: 'N/A',
      },
    });
    toast.success(`${product.name} added to cart.`);
  };

  const openProductDialog = (product: typeof products[0]) => {
    setSelectedProduct(product);
    setIsProductDialogOpen(true);
  };

  const scrollToSection = (sectionId: string) => {
    const section = document.getElementById(sectionId);
    if (!section) {
      return;
    }

    const navbarOffset = 88;
    const top = section.getBoundingClientRect().top + window.scrollY - navbarOffset;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
  };

  const handleSectionNavigation = (sectionId: string, shouldCloseMobileMenu = false) => {
    if (shouldCloseMobileMenu) {
      setIsNavOpen(false);
    }

    scrollToSection(sectionId);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  const bestSellerProducts = useMemo(() => {
    const ranked = [...products].sort((a, b) => {
      const byBestSeller = Number(b.isBestSeller) - Number(a.isBestSeller);
      if (byBestSeller !== 0) return byBestSeller;
      const byRating = b.rating - a.rating;
      if (byRating !== 0) return byRating;
      return b.price - a.price;
    });

    const selected = ranked.filter((item) => item.isBestSeller).slice(0, 3);
    if (selected.length >= 3) {
      return selected;
    }

    return ranked.slice(0, 3);
  }, []);

  const cartProductIds = useMemo(() => {
    return new Set(cartItems.map((item) => item.productId));
  }, [cartItems]);

  const orderedCollections = useMemo(() => {
    const prioritized: ShopCollection[] = [];
    const usedIndexes = new Set<number>();

    PRIORITY_COLLECTION_SLUGS.forEach((slug) => {
      landingCollections.forEach((collection, index) => {
        if (collection.slug === slug) {
          prioritized.push(collection);
          usedIndexes.add(index);
        }
      });
    });

    const remaining = landingCollections.filter((_, index) => !usedIndexes.has(index));
    return [...prioritized, ...remaining];
  }, [landingCollections]);

  const shouldScrollCollections = isMobile || landingCollections.length > 3;
  const shouldScrollCategories = isMobile || landingCategories.length > 4;

  return (
    <div className="min-h-screen bg-charcoal text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-charcoal/90 backdrop-blur-md border-b border-white/5">
        <div className="section-padding">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2"
            >
              <Gem className="w-8 h-8 text-gold" />
              <span className="font-serif text-2xl tracking-wider">
                Aurum <span className="text-gold">&</span> Gems
              </span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-8">
              <button type="button" onClick={() => handleSectionNavigation('collections')} className="nav-link text-sm tracking-widest uppercase">Collections</button>
              <button type="button" onClick={() => handleSectionNavigation('featured')} className="nav-link text-sm tracking-widest uppercase">Featured</button>
              <button type="button" onClick={() => handleSectionNavigation('categories')} className="nav-link text-sm tracking-widest uppercase">Categories</button>
              <button type="button" onClick={() => handleSectionNavigation('products')} className="nav-link text-sm tracking-widest uppercase">Shop</button>
              <button type="button" onClick={() => handleSectionNavigation('trust')} className="nav-link text-sm tracking-widest uppercase">About</button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Link to="/search" className="p-2 hover:text-gold transition-colors" aria-label="Search products">
                <Search className="w-5 h-5" />
              </Link>
              <Link
                to="/wishlist"
                className="p-2 hover:text-gold transition-colors relative"
                aria-label="Open wishlist"
              >
                <Heart className="w-5 h-5" />
                {wishlist.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-gold text-charcoal text-[10px] rounded-full flex items-center justify-center font-semibold">
                    {wishlist.length}
                  </span>
                )}
              </Link>
              <Link
                to="/cart"
                className="p-2 hover:text-gold transition-colors relative"
                aria-label="Open cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-gold text-charcoal text-xs rounded-full flex items-center justify-center font-semibold">
                    {totalItems}
                  </span>
                )}
              </Link>
              
              {/* Mobile Menu */}
              <Sheet open={isNavOpen} onOpenChange={setIsNavOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <button className="p-2">
                    <Menu className="w-6 h-6" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-charcoal border-white/10 w-80">
                  <div className="flex flex-col gap-6 mt-8">
                    <button type="button" onClick={() => handleSectionNavigation('collections', true)} className="text-lg hover:text-gold transition-colors text-left">Collections</button>
                    <button type="button" onClick={() => handleSectionNavigation('featured', true)} className="text-lg hover:text-gold transition-colors text-left">Featured</button>
                    <button type="button" onClick={() => handleSectionNavigation('categories', true)} className="text-lg hover:text-gold transition-colors text-left">Categories</button>
                    <button type="button" onClick={() => handleSectionNavigation('products', true)} className="text-lg hover:text-gold transition-colors text-left">Shop</button>
                    <button type="button" onClick={() => handleSectionNavigation('trust', true)} className="text-lg hover:text-gold transition-colors text-left">About</button>
                    <Link to="/cart" onClick={() => setIsNavOpen(false)} className="text-lg hover:text-gold transition-colors">Cart ({totalItems})</Link>
                    <hr className="border-white/10" />
                    <Button 
                      onClick={() => { setIsNavOpen(false); setIsWhatsAppDialogOpen(true); }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <WhatsAppIcon className="w-5 h-5 mr-2" />
                      Enquire on WhatsApp
                    </Button>
                    <Button 
                      onClick={() => { setIsNavOpen(false); setIsAppointmentDialogOpen(true); }}
                      variant="outline"
                      className="border-gold text-gold hover:bg-gold hover:text-charcoal"
                    >
                      <Calendar className="w-5 h-5 mr-2" />
                      Book Appointment
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0 hero-media">
          <img
            src="/hero-model.jpg"
            alt="Luxury gold ornaments"
            className="hero-fallback-image"
          />
          {shouldPlayHeroVideo && (
            <video
              ref={heroVideoRef}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/hero-model.jpg"
              onCanPlay={() => setIsHeroVideoReady(true)}
              className={`hero-video transition-opacity duration-700 ${isHeroVideoReady ? 'opacity-100' : 'opacity-0'}`}
              aria-label="Luxury gold ornaments showcase"
            >
              <source src="/goldvedio.mp4" type="video/mp4" />
            </video>
          )}
          <div className="absolute inset-0 hero-video-vignette" />
          <div className="absolute inset-0 gradient-overlay" />
        </div>
        
        <div className="relative h-full flex items-center section-padding">
          <div className="max-w-2xl">
            <h1 className="hero-title heading-xl text-white mb-6">
              Aurum <span className="text-gold">&</span> Gems
            </h1>
            <p className="hero-subtitle text-xl md:text-2xl text-gray-300 mb-4 font-light">
              Timeless Elegance, Crafted for You
            </p>
            <p className="hero-subtitle text-gray-400 mb-10 max-w-lg">
              Discover our exquisite collection of gold and diamond jewelry, 
              where tradition meets contemporary luxury.
            </p>
            <div className="hero-cta flex flex-wrap gap-4">
              <a href="#products" className="btn-primary-luxury inline-flex items-center gap-2">
                Explore Collection
                <ArrowRight className="w-5 h-5" />
              </a>
              <button 
                onClick={() => setIsWhatsAppDialogOpen(true)}
                className="btn-luxury inline-flex items-center gap-2"
              >
                <WhatsAppIcon className="w-5 h-5" />
                Enquire Now
              </button>
            </div>
          </div>
        </div>
        
        {/* Scroll indicator */}
        {/* <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/60">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-12 bg-gradient-to-b from-gold to-transparent" />
        </div> */}
      </section>

      {/* Collection Section */}
      <section id="collections" ref={collectionRef} className="py-24 section-padding">
        <div className="flex flex-col lg:flex-row gap-12 items-start">
          <div className="lg:w-1/3 lg:sticky lg:top-28">
            <span className="text-gold text-sm tracking-widest uppercase mb-4 block">New Arrivals</span>
            <h2 className="collection-title heading-lg text-white mb-6">The Collection</h2>
            <p className="text-body mb-8">
              Step into a world of refined luxury. Our latest collection features bold gold chains, 
              delicate pendants, and statement earrings designed to captivate and inspire.
            </p>
            <Link to="/collections" className="btn-luxury inline-flex items-center gap-2">
              View Lookbook
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
          
          <div className={`lg:w-2/3 max-w-full ${shouldScrollCollections ? 'overflow-x-auto overscroll-x-contain scrollbar-hide pb-2' : ''}`}>
            <div className={shouldScrollCollections ? 'flex gap-3 sm:gap-6 min-w-max pr-1' : 'grid grid-cols-1 md:grid-cols-3 gap-6'}>
              {orderedCollections.map((collection) => (
                <Link
                  key={`${collection.slug}-${collection.id}`}
                  to={`/collections/${collection.slug}`}
                  className={`collection-card group relative overflow-hidden cursor-pointer block ${shouldScrollCollections ? 'w-[180px] sm:w-[220px] md:w-[260px] lg:w-[280px] shrink-0' : ''}`}
                  onMouseEnter={() => setHoveredCollection(collection.slug)}
                  onMouseLeave={() => setHoveredCollection(null)}
                >
                  <div className="relative aspect-[2/3] overflow-hidden bg-charcoal-dark">
                    <img 
                      src={collection.image} 
                      alt={collection.name}
                      className={`w-full h-full object-cover transform-gpu will-change-opacity transition-all duration-1000 ease-in-out group-hover:scale-110 ${
                        ((collection.slug === 'bridal-collection' && shouldPlayHeroVideo && !hasBridalVideoError && isBridalVideoReady && hoveredCollection === 'bridal-collection') ||
                         (collection.slug === 'gold-classics' && shouldPlayHeroVideo && !hasGoldClassicsVideoError && isGoldClassicsVideoReady && hoveredCollection === 'gold-classics') ||
                         (collection.slug === 'diamond-essentials' && shouldPlayHeroVideo && !hasEssentialsVideoError && isEssentialsVideoReady && hoveredCollection === 'diamond-essentials'))
                          ? 'opacity-0 pointer-events-none'
                          : 'opacity-100'
                      } ${
                        ((collection.slug === 'bridal-collection' && shouldPlayHeroVideo && !hasBridalVideoError && !isBridalVideoReady && hoveredCollection === 'bridal-collection') ||
                         (collection.slug === 'gold-classics' && shouldPlayHeroVideo && !hasGoldClassicsVideoError && !isGoldClassicsVideoReady && hoveredCollection === 'gold-classics') ||
                         (collection.slug === 'diamond-essentials' && shouldPlayHeroVideo && !hasEssentialsVideoError && !isEssentialsVideoReady && hoveredCollection === 'diamond-essentials'))
                          ? 'animate-pulse'
                          : ''
                      }`}
                    />

                    {collection.slug === 'bridal-collection' && shouldPlayHeroVideo && !hasBridalVideoError && hoveredCollection === 'bridal-collection' && (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        poster={collection.image}
                        onCanPlay={() => setIsBridalVideoReady(true)}
                        onError={() => {
                          setHasBridalVideoError(true);
                          setIsBridalVideoReady(false);
                        }}
                        className={`absolute inset-0 w-full h-full object-cover transform-gpu will-change-opacity transition-all duration-1000 ease-in-out group-hover:scale-110 pointer-events-none ${
                          isBridalVideoReady ? 'opacity-100' : 'opacity-0'
                        }`}
                        aria-label="Bridal collection video preview"
                      >
                        <source src="/bridalvideo.mp4" type="video/mp4" />
                      </video>
                    )}

                    {collection.slug === 'gold-classics' && shouldPlayHeroVideo && !hasGoldClassicsVideoError && hoveredCollection === 'gold-classics' && (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        poster={collection.image}
                        onCanPlay={() => setIsGoldClassicsVideoReady(true)}
                        onError={() => {
                          setHasGoldClassicsVideoError(true);
                          setIsGoldClassicsVideoReady(false);
                        }}
                        className={`absolute inset-0 w-full h-full object-cover transform-gpu will-change-opacity transition-all duration-1000 ease-in-out group-hover:scale-110 pointer-events-none ${
                          isGoldClassicsVideoReady ? 'opacity-100' : 'opacity-0'
                        }`}
                        aria-label="Gold Classics collection video preview"
                      >
                        <source src="/clasicalvideo.mp4" type="video/mp4" />
                      </video>
                    )}

                    {collection.slug === 'diamond-essentials' && shouldPlayHeroVideo && !hasEssentialsVideoError && hoveredCollection === 'diamond-essentials' && (
                      <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        preload="metadata"
                        poster={collection.image}
                        onCanPlay={() => setIsEssentialsVideoReady(true)}
                        onError={() => {
                          setHasEssentialsVideoError(true);
                          setIsEssentialsVideoReady(false);
                        }}
                        className={`absolute inset-0 w-full h-full object-cover transform-gpu will-change-opacity transition-all duration-1000 ease-in-out group-hover:scale-110 pointer-events-none ${
                          isEssentialsVideoReady ? 'opacity-100' : 'opacity-0'
                        }`}
                        aria-label="Diamond Essentials collection video preview"
                      >
                        <source src="/diamondvideo.mp4" type="video/mp4" />
                      </video>
                    )}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <span className="text-gold text-xs tracking-widest uppercase mb-2 block">
                      {collection.subtitle || 'Signature Edit'}
                    </span>
                    <h3 className="font-serif text-xl text-white">{collection.name}</h3>
                  </div>
                </Link>
              ))}

              {orderedCollections.length === 0 && (
                <div className={`${shouldScrollCollections ? 'w-[280px] shrink-0' : 'md:col-span-3'} border border-white/10 bg-charcoal-light p-6 text-gray-300`}>
                  Collections are not available right now.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section id="featured" ref={featuredRef} className="py-24 section-padding bg-charcoal-light">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="featured-content order-2 lg:order-1">
            <span className="text-gold text-sm tracking-widest uppercase mb-4 block">Featured Products</span>
            <h2 className="heading-lg text-white mb-6">Handpicked Excellence</h2>
            <p className="text-body mb-8">
              Each piece in our featured collection represents the pinnacle of craftsmanship. 
              From intricate goldwork to brilliant diamond settings, these are the pieces that 
              define our commitment to excellence.
            </p>
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="border border-white/10 p-6 text-center">
                <span className="font-serif text-3xl text-gold block mb-2">18K</span>
                <span className="text-gray-400 text-sm">Pure Gold</span>
              </div>
              <div className="border border-white/10 p-6 text-center">
                <span className="font-serif text-3xl text-gold block mb-2">VS1</span>
                <span className="text-gray-400 text-sm">Diamond Grade</span>
              </div>
            </div>
            <a href="#products" className="btn-luxury inline-flex items-center gap-2">
              Shop Featured
              <ArrowRight className="w-5 h-5" />
            </a>
          </div>
          
          <div className="order-1 lg:order-2 grid grid-cols-2 gap-4">
            <div className="image-hover-zoom">
              <img 
                src="/featured-main.jpg" 
                alt="Featured Jewelry" 
                className="w-full h-[400px] object-cover"
              />
            </div>
            <div className="image-hover-zoom mt-12">
              <img 
                src="/featured-detail.jpg" 
                alt="Jewelry Detail" 
                className="w-full h-[400px] object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section id="categories" ref={categoryRef} className="py-24 section-padding">
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-widest uppercase mb-4 block">Browse</span>
          <h2 className="heading-lg text-white">Shop by Category</h2>
        </div>
        
        <div className={shouldScrollCategories ? 'max-w-full overflow-x-auto overscroll-x-contain scrollbar-hide pb-2' : ''}>
          <div className={shouldScrollCategories ? 'flex min-w-max gap-3 sm:gap-6 pr-1' : 'grid grid-cols-2 lg:grid-cols-4 gap-6'}>
            {landingCategories.map((category) => (
              <div
                key={`${category.slug}-${category.id}`}
                className={`category-card group cursor-pointer ${shouldScrollCategories ? 'w-[190px] sm:w-[240px] md:w-[280px] lg:w-[320px] shrink-0' : ''}`}
              >
                <div className="relative overflow-hidden mb-4">
                  <div className="aspect-square">
                    <img 
                      src={category.image} 
                      alt={category.name}
                      onError={(event) => {
                        const target = event.currentTarget;
                        if (target.dataset.fallbackApplied === 'true') {
                          return;
                        }

                        target.dataset.fallbackApplied = 'true';
                        target.src = fallbackHomeCategories.find((item) => item.slug === category.slug)?.image || '/cat-rings.jpg';
                      }}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <Link
                      to={`/category/${category.slug}`}
                      className="btn-luxury text-sm"
                    >
                      Explore
                    </Link>
                  </div>
                </div>
                <h3 className="font-serif text-xl text-white text-center">{category.name}</h3>
                <p className="text-gray-400 text-sm text-center">{category.count.toLocaleString()} {category.count === 1 ? 'Product' : 'Products'}</p>
              </div>
            ))}

            {landingCategories.length === 0 && (
              <div className={`${shouldScrollCategories ? 'w-[260px] shrink-0' : 'col-span-2 lg:col-span-4'} border border-white/10 bg-charcoal-light p-6 text-center text-gray-300`}>
                Categories are not available right now.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" ref={productsRef} className="py-24 section-padding bg-charcoal-light">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <span className="text-gold text-sm tracking-widest uppercase mb-4 block">Our Selection</span>
            <h2 className="heading-lg text-white">Best Sellers</h2>
          </div>
          <Link to="/category/rings" className="text-gold hover:text-gold-light transition-colors flex items-center gap-2 mt-4 md:mt-0">
            View All Products
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {bestSellerProducts.map((product) => (
            <div key={product.id} className="product-card card-luxury group">
              <div className="relative overflow-hidden">
                <div className="aspect-square">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                {product.isNew && (
                  <Badge className="absolute top-4 left-4 bg-gold text-charcoal">New</Badge>
                )}
                <button 
                  onClick={() => toggleWishlist(product.id)}
                  className="absolute top-4 right-4 p-2 bg-charcoal/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Heart 
                    className={`w-5 h-5 ${wishlist.includes(product.id) ? 'fill-gold text-gold' : 'text-white'}`} 
                  />
                </button>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-charcoal to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => openProductDialog(product)}
                      className="w-full btn-primary-luxury text-center"
                    >
                      Quick View
                    </button>
                    <button
                      onClick={() => {
                        if (cartProductIds.has(product.id)) {
                          navigate('/cart');
                          return;
                        }

                        addProductToCart(product);
                      }}
                      className={`w-full border border-gold transition-colors text-sm ${
                        cartProductIds.has(product.id)
                          ? 'bg-gold text-charcoal hover:bg-gold-light'
                          : 'text-gold hover:bg-gold hover:text-charcoal'
                      }`}
                    >
                      {cartProductIds.has(product.id) ? 'View Cart' : 'Add Cart'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <span className="text-gray-400 text-xs tracking-widest uppercase">{product.category}</span>
                <h3 className="font-serif text-lg text-white mt-1 mb-2">{product.name}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-gold font-medium">{formatPrice(product.price)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section id="trust" ref={trustRef} className="py-24 section-padding">
        <div className="text-center mb-16">
          <span className="text-gold text-sm tracking-widest uppercase mb-4 block">Why Choose Us</span>
          <h2 className="heading-lg text-white">The Aurum & Gems Promise</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="trust-item text-center p-8 border border-white/10 hover:border-gold/50 transition-colors">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border border-gold/50 rounded-full">
              <Award className="w-8 h-8 text-gold" />
            </div>
            <h3 className="font-serif text-xl text-white mb-3">Certified Quality</h3>
            <p className="text-gray-400 text-sm">BIS hallmarked gold and certified diamonds with authenticity guarantee.</p>
          </div>
          
          <div className="trust-item text-center p-8 border border-white/10 hover:border-gold/50 transition-colors">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border border-gold/50 rounded-full">
              <Shield className="w-8 h-8 text-gold" />
            </div>
            <h3 className="font-serif text-xl text-white mb-3">Lifetime Warranty</h3>
            <p className="text-gray-400 text-sm">Every piece comes with our comprehensive lifetime warranty coverage.</p>
          </div>
          
          <div className="trust-item text-center p-8 border border-white/10 hover:border-gold/50 transition-colors">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border border-gold/50 rounded-full">
              <Gem className="w-8 h-8 text-gold" />
            </div>
            <h3 className="font-serif text-xl text-white mb-3">Expert Craftsmanship</h3>
            <p className="text-gray-400 text-sm">Handcrafted by master artisans with decades of experience.</p>
          </div>
          
          <div className="trust-item text-center p-8 border border-white/10 hover:border-gold/50 transition-colors">
            <div className="w-16 h-16 mx-auto mb-6 flex items-center justify-center border border-gold/50 rounded-full">
              <Heart className="w-8 h-8 text-gold" />
            </div>
            <h3 className="font-serif text-xl text-white mb-3">Custom Designs</h3>
            <p className="text-gray-400 text-sm">Bespoke jewelry design services to bring your vision to life.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 section-padding bg-gold/5">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="heading-lg text-white mb-6">Ready to Find Your Perfect Piece?</h2>
          <p className="text-gray-300 mb-10 max-w-2xl mx-auto">
            Our jewelry experts are here to help you discover the perfect piece. 
            Book an appointment for a personalized consultation or reach out to us on WhatsApp.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button 
              onClick={() => setIsWhatsAppDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 text-lg"
            >
              <WhatsAppIcon className="w-5 h-5 mr-2" />
              Enquire on WhatsApp
            </Button>
            <Button 
              onClick={() => setIsAppointmentDialogOpen(true)}
              variant="outline"
              className="border-gold text-gold hover:bg-gold hover:text-charcoal px-8 py-6 text-lg"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Book Appointment
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 section-padding bg-charcoal-dark border-t border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div>
            <a href="#" className="flex items-center gap-2 mb-6">
              <Gem className="w-8 h-8 text-gold" />
              <span className="font-serif text-2xl tracking-wider">
                Aurum <span className="text-gold">&</span> Gems
              </span>
            </a>
            <p className="text-gray-400 text-sm mb-6">
              Crafting timeless elegance since 1985. Your trusted destination for 
              exquisite gold and diamond jewelry.
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-12 h-12 border border-white/20 flex items-center justify-center hover:border-gold transition-colors bg-white/5"
              >
                <img src="/fblogo.png" alt="Facebook" className="w-6 h-6 object-contain" loading="lazy" decoding="async" />
              </a>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-12 h-12 border border-white/20 flex items-center justify-center hover:border-gold transition-colors bg-white/5"
              >
                <img src="/intalogo.png" alt="Instagram" className="w-6 h-6 object-contain" loading="lazy" decoding="async" />
              </a>
              <a
                href="https://wa.me/919876543210"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-12 h-12 border border-white/20 flex items-center justify-center hover:border-gold hover:text-gold transition-colors bg-white/5"
              >
                <WhatsAppIcon className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h4 className="font-serif text-lg text-white mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li><a href="#collections" className="text-gray-400 hover:text-gold transition-colors text-sm">Collections</a></li>
              <li><a href="#featured" className="text-gray-400 hover:text-gold transition-colors text-sm">Featured</a></li>
              <li><a href="#categories" className="text-gray-400 hover:text-gold transition-colors text-sm">Categories</a></li>
              <li><a href="#products" className="text-gray-400 hover:text-gold transition-colors text-sm">Shop</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-serif text-lg text-white mb-6">Customer Service</h4>
            <ul className="space-y-3">
              <li><a href="#" className="text-gray-400 hover:text-gold transition-colors text-sm">Contact Us</a></li>
              <li><a href="#" className="text-gray-400 hover:text-gold transition-colors text-sm">Shipping Info</a></li>
              <li><a href="#" className="text-gray-400 hover:text-gold transition-colors text-sm">Returns & Exchanges</a></li>
              <li><a href="#" className="text-gray-400 hover:text-gold transition-colors text-sm">Size Guide</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-serif text-lg text-white mb-6">Contact</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">123 Luxury Lane, Mumbai, India 400001</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gold flex-shrink-0" />
                <span className="text-gray-400 text-sm">+91 98765 43210</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gold flex-shrink-0" />
                <span className="text-gray-400 text-sm">info@aurumandgems.com</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © 2024 Aurum & Gems. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-gray-500 hover:text-gold transition-colors text-sm">Privacy Policy</a>
            <a href="#" className="text-gray-500 hover:text-gold transition-colors text-sm">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="bg-charcoal border-white/10 max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-4">
              <div className="aspect-square">
                <img 
                  src={selectedProduct.image} 
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <span className="text-gold text-sm tracking-widest uppercase">{selectedProduct.category}</span>
                <DialogHeader>
                  <DialogTitle className="font-serif text-3xl text-white mt-2">{selectedProduct.name}</DialogTitle>
                </DialogHeader>
                <p className="text-gold text-2xl font-medium mt-4">{formatPrice(selectedProduct.price)}</p>
                <DialogDescription className="text-gray-400 mt-4">
                  Exquisite craftsmanship meets timeless design. This stunning piece is 
                  meticulously crafted using the finest materials and expert techniques 
                  passed down through generations.
                </DialogDescription>
                <div className="mt-6 space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-1 border border-white/10 p-3 text-center">
                      <span className="text-gray-400 text-xs block">Purity</span>
                      <span className="text-white">18K Gold</span>
                    </div>
                    <div className="flex-1 border border-white/10 p-3 text-center">
                      <span className="text-gray-400 text-xs block">Weight</span>
                      <span className="text-white">12.5g</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 mt-8">
                  <Button 
                    onClick={() => setIsWhatsAppDialogOpen(true)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <WhatsAppIcon className="w-5 h-5 mr-2" />
                    Enquire
                  </Button>
                  <Button 
                    onClick={() => setIsAppointmentDialogOpen(true)}
                    variant="outline"
                    className="flex-1 border-gold text-gold hover:bg-gold hover:text-charcoal"
                  >
                    <Calendar className="w-5 h-5 mr-2" />
                    Book View
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* WhatsApp Dialog */}
      <Dialog open={isWhatsAppDialogOpen} onOpenChange={setIsWhatsAppDialogOpen}>
        <DialogContent className="bg-charcoal border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-white text-center">Enquire on WhatsApp</DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <WhatsAppIcon className="w-10 h-10 text-white" />
            </div>
            <p className="text-gray-300 mb-6">
              Connect with us directly on WhatsApp for instant assistance and personalized recommendations.
            </p>
            <div className="space-y-3">
              <a 
                href="https://wa.me/919876543210?text=Hi,%20I'm%20interested%20in%20your%20jewelry%20collection"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded flex items-center justify-center gap-2 transition-colors"
              >
                <WhatsAppIcon className="w-5 h-5" />
                Start Chat
              </a>
              <Button 
                variant="outline" 
                onClick={() => setIsWhatsAppDialogOpen(false)}
                className="w-full border-white/20 text-white hover:bg-white/10"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Appointment Dialog */}
      <Dialog open={isAppointmentDialogOpen} onOpenChange={setIsAppointmentDialogOpen}>
        <DialogContent className="bg-charcoal border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-white text-center">Book an Appointment</DialogTitle>
          </DialogHeader>
          <div className="py-6">
            <p className="text-gray-300 text-center mb-6">
              Schedule a personalized consultation with our jewelry experts.
            </p>
            <form className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm block mb-2">Full Name</label>
                <input 
                  type="text" 
                  className="w-full bg-charcoal-light border border-white/10 text-white px-4 py-3 focus:border-gold focus:outline-none"
                  placeholder="Enter your name"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  className="w-full bg-charcoal-light border border-white/10 text-white px-4 py-3 focus:border-gold focus:outline-none"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Preferred Date</label>
                <input 
                  type="date" 
                  className="w-full bg-charcoal-light border border-white/10 text-white px-4 py-3 focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="text-gray-400 text-sm block mb-2">Message (Optional)</label>
                <textarea 
                  className="w-full bg-charcoal-light border border-white/10 text-white px-4 py-3 focus:border-gold focus:outline-none resize-none"
                  rows={3}
                  placeholder="What are you looking for?"
                />
              </div>
              <Button 
                type="submit"
                className="w-full bg-gold hover:bg-gold-light text-charcoal font-medium"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Request Appointment
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating WhatsApp Button */}
      <a 
        href="https://wa.me/919876543210"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all z-40"
      >
        <WhatsAppIcon className="w-7 h-7 text-white" />
      </a>
    </div>
  );
}

export default App;
