export type MetalType = 'Gold' | 'Diamond' | 'Platinum';
export type DiamondType = 'Natural' | 'Lab-Grown';

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  hoverImage: string;
  rating: number;
  isNew: boolean;
  isBestSeller: boolean;
  engravable: boolean;
  metal: MetalType;
  createdAt: string;
}

export interface ProductDetail extends Product {
  gallery: string[];
  reviewsCount: number;
  inStock: boolean;
  shipsBy: string;
  emiMonths: number;
  caratOptions: number[];
  metalOptions: MetalType[];
  diamondOptions: DiamondType[];
  ringSizes: string[];
  unavailableRingSizes: string[];
}

export interface Category {
  name: string;
  image: string;
  count: number;
}

export interface Collection {
  name: string;
  subtitle: string;
  image: string;
}

export const products: Product[] = [
  {
    id: 1,
    name: 'Solitaire Diamond Ring',
    category: 'Rings',
    price: 125000,
    image: '/product-ring.jpg',
    hoverImage: '/cat-rings.jpg',
    rating: 4.9,
    isNew: false,
    isBestSeller: true,
    engravable: true,
    metal: 'Diamond',
    createdAt: '2026-01-05',
  },
  {
    id: 2,
    name: 'Cuban Link Chain',
    category: 'Necklaces',
    price: 85000,
    image: '/product-chain.jpg',
    hoverImage: '/cat-necklace.jpg',
    rating: 4.8,
    isNew: false,
    isBestSeller: true,
    engravable: false,
    metal: 'Gold',
    createdAt: '2025-11-10',
  },
  {
    id: 3,
    name: 'Diamond Stud Earrings',
    category: 'Earrings',
    price: 45000,
    image: '/product-studs.jpg',
    hoverImage: '/cat-earrings.jpg',
    rating: 5,
    isNew: true,
    isBestSeller: true,
    engravable: false,
    metal: 'Diamond',
    createdAt: '2026-03-15',
  },
  {
    id: 4,
    name: 'Classic Gold Bangle',
    category: 'Bangles',
    price: 65000,
    image: '/product-bangle.jpg',
    hoverImage: '/product-bangle.jpg',
    rating: 4.7,
    isNew: false,
    isBestSeller: false,
    engravable: true,
    metal: 'Gold',
    createdAt: '2025-09-03',
  },
  {
    id: 5,
    name: 'Halo Ring',
    category: 'Rings',
    price: 98000,
    image: '/product-ring.jpg',
    hoverImage: '/cat-rings.jpg',
    rating: 4.8,
    isNew: true,
    isBestSeller: false,
    engravable: true,
    metal: 'Diamond',
    createdAt: '2026-02-18',
  },
  {
    id: 6,
    name: 'Minimal Ring Band',
    category: 'Rings',
    price: 38000,
    image: '/cat-rings.jpg',
    hoverImage: '/product-ring.jpg',
    rating: 4.6,
    isNew: false,
    isBestSeller: false,
    engravable: true,
    metal: 'Platinum',
    createdAt: '2025-08-21',
  },
  {
    id: 7,
    name: 'Pearl Drop Necklace',
    category: 'Necklaces',
    price: 72000,
    image: '/cat-necklace.jpg',
    hoverImage: '/product-chain.jpg',
    rating: 4.7,
    isNew: true,
    isBestSeller: false,
    engravable: false,
    metal: 'Gold',
    createdAt: '2026-03-01',
  },
  {
    id: 8,
    name: 'Rose Gold Pendant',
    category: 'Necklaces',
    price: 54000,
    image: '/cat-pendant.jpg',
    hoverImage: '/cat-necklace.jpg',
    rating: 4.5,
    isNew: false,
    isBestSeller: false,
    engravable: true,
    metal: 'Gold',
    createdAt: '2025-10-09',
  },
  {
    id: 9,
    name: 'Hoop Diamond Earrings',
    category: 'Earrings',
    price: 52000,
    image: '/product-studs.jpg',
    hoverImage: '/cat-earrings.jpg',
    rating: 4.8,
    isNew: false,
    isBestSeller: true,
    engravable: false,
    metal: 'Diamond',
    createdAt: '2025-12-11',
  },
  {
    id: 10,
    name: 'Petite Ear Drops',
    category: 'Earrings',
    price: 36000,
    image: '/cat-earrings.jpg',
    hoverImage: '/product-studs.jpg',
    rating: 4.6,
    isNew: true,
    isBestSeller: false,
    engravable: false,
    metal: 'Gold',
    createdAt: '2026-03-20',
  },
  {
    id: 11,
    name: 'Twist Bangle Set',
    category: 'Bangles',
    price: 89000,
    image: '/product-bangle.jpg',
    hoverImage: '/cat-rings.jpg',
    rating: 4.7,
    isNew: true,
    isBestSeller: true,
    engravable: false,
    metal: 'Gold',
    createdAt: '2026-02-12',
  },
  {
    id: 12,
    name: 'Slim Platinum Kada',
    category: 'Bangles',
    price: 112000,
    image: '/product-bangle.jpg',
    hoverImage: '/cat-necklace.jpg',
    rating: 4.9,
    isNew: false,
    isBestSeller: false,
    engravable: true,
    metal: 'Platinum',
    createdAt: '2025-07-30',
  },
  {
    id: 13,
    name: 'Bridal Diamond Set',
    category: 'Necklaces',
    price: 285000,
    image: '/product-bridal.jpg',
    hoverImage: '/collection-1.jpg',
    rating: 5,
    isNew: true,
    isBestSeller: true,
    engravable: false,
    metal: 'Diamond',
    createdAt: '2026-03-12',
  },
  {
    id: 14,
    name: 'Charm Bracelet',
    category: 'Bangles',
    price: 35000,
    image: '/product-bracelet.jpg',
    hoverImage: '/product-bangle.jpg',
    rating: 4.6,
    isNew: false,
    isBestSeller: false,
    engravable: true,
    metal: 'Gold',
    createdAt: '2025-09-26',
  },
];

export const categories: Category[] = [
  { name: 'Rings', image: '/cat-rings.jpg', count: 120 },
  { name: 'Necklaces', image: '/cat-necklace.jpg', count: 85 },
  { name: 'Earrings', image: '/cat-earrings.jpg', count: 150 },
  { name: 'Bangles', image: '/product-bangle.jpg', count: 65 },
];

export const collections: Collection[] = [
  { name: 'Bridal Collection', subtitle: 'Eternal Love', image: '/collection-1.jpg' },
  { name: 'Diamond Essentials', subtitle: 'Timeless Sparkle', image: '/collection-2.jpg' },
  { name: 'Gold Classics', subtitle: 'Pure Elegance', image: '/collection-3.jpg' },
];

export const toCategorySlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

export const fromCategorySlug = (slug: string) => slug.replace(/-/g, ' ').toLowerCase();

export const getCategoryBySlug = (slug: string) => {
  const normalizedSlug = fromCategorySlug(slug);
  return categories.find((category) => category.name.toLowerCase() === normalizedSlug);
};

export const getProductsByCategorySlug = (slug: string) => {
  const category = getCategoryBySlug(slug);
  if (!category) {
    return [];
  }

  return products.filter((product) => product.category.toLowerCase() === category.name.toLowerCase());
};

const allRingSizes = ['4', '5', '6', '7', '8', '9'];

const categoryGallery: Record<string, string[]> = {
  rings: ['/product-ring.jpg', '/cat-rings.jpg', '/collection-2.jpg'],
  necklaces: ['/product-chain.jpg', '/cat-necklace.jpg', '/cat-pendant.jpg', '/collection-1.jpg'],
  earrings: ['/product-studs.jpg', '/cat-earrings.jpg', '/collection-3.jpg'],
  bangles: ['/product-bangle.jpg', '/product-bracelet.jpg', '/collection-3.jpg'],
};

const buildGallery = (product: Product): string[] => {
  const key = product.category.toLowerCase();
  const fallbacks = categoryGallery[key] ?? ['/collection-1.jpg', '/collection-2.jpg'];

  return [product.image, product.hoverImage, ...fallbacks].filter(
    (value, index, array) => array.indexOf(value) === index,
  );
};

const buildMetalOptions = (product: Product): MetalType[] => {
  if (product.metal === 'Diamond') {
    return ['Gold', 'Diamond', 'Platinum'];
  }

  if (product.metal === 'Platinum') {
    return ['Platinum', 'Gold'];
  }

  return ['Gold', 'Diamond'];
};

export const getProductById = (productId: number) => {
  return products.find((product) => product.id === productId);
};

export const getProductDetailById = (productId: number): ProductDetail | null => {
  const product = getProductById(productId);
  if (!product) {
    return null;
  }

  const isRing = product.category.toLowerCase() === 'rings';
  const shipsByDate = new Date();
  shipsByDate.setDate(shipsByDate.getDate() + ((productId % 4) + 2));

  return {
    ...product,
    gallery: buildGallery(product),
    reviewsCount: 64 + (productId * 11),
    inStock: productId % 5 !== 0,
    shipsBy: shipsByDate.toDateString(),
    emiMonths: 6,
    caratOptions: [2, 3, 4, 5, 6],
    metalOptions: buildMetalOptions(product),
    diamondOptions: ['Natural', 'Lab-Grown'],
    ringSizes: isRing ? allRingSizes : ['Standard'],
    unavailableRingSizes: isRing ? ['4'] : [],
  };
};
