import { supabase } from '@/lib/supabase';
import { getCurrentTenantId } from '@/lib/tenant';
import { collections as localCollections, type Collection as LocalCollection } from '@/data/collections';

type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  sort_order?: number | null;
  created_at?: string | null;
};

type CollectionRow = {
  id: number;
  name: string;
  slug: string;
  subtitle: string | null;
  description: string | null;
  image_url: string | null;
  created_at?: string | null;
  sort_order?: number | null;
};

type ProductRow = {
  id: number;
  name: string;
  slug: string;
  sku: string;
  base_price: number;
  original_price: number | null;
  image_url: string | null;
  hover_image_url: string | null;
  description: string | null;
  long_description: string | null;
  rating: number | null;
  is_new: boolean | null;
  is_best_seller: boolean | null;
  is_engravable: boolean | null;
  stock_quantity: number | null;
  created_at: string;
  category_id: number;
  collection_id: number | null;
};

type ProductImageRow = {
  image_url: string;
  sort_order: number;
};

type ProductImageByProductRow = {
  product_id: number;
  image_url: string;
  sort_order: number;
};

type ProductMetalRow = {
  metal_type: string;
};

type RingSizeRow = {
  size_label: string;
  is_available: boolean;
};

type ProductOptionRow = {
  option_type: string;
  option_value: string;
};

export type ShopCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount?: number;
};

export type ShopCollection = {
  id: number;
  name: string;
  slug: string;
  subtitle: string;
  description: string;
  image: string;
};

export type ShopProductCard = {
  id: number;
  slug: string;
  name: string;
  category: string;
  categorySlug: string;
  collectionSlug: string | null;
  price: number;
  image: string;
  hoverImage: string;
  rating: number;
  isNew: boolean;
  isBestSeller: boolean;
  engravable: boolean;
  metal: string;
  createdAt: string;
  reviewsCount: number;
};

export type ShopCollectionProduct = {
  id: number;
  name: string;
  price: string;
  priceValue: number;
  image: string;
  hoverImage: string;
  badges: string[];
  rating: number;
  reviews: number;
  collectionSlug: string;
};

export type ShopProductDetail = {
  id: number;
  slug: string;
  sku: string;
  name: string;
  category: string;
  categorySlug: string;
  collectionSlug: string | null;
  description: string;
  longDescription: string;
  price: number;
  image: string;
  hoverImage: string;
  gallery: string[];
  rating: number;
  reviewsCount: number;
  inStock: boolean;
  isNew: boolean;
  isBestSeller: boolean;
  metalOptions: string[];
  caratOptions: number[];
  diamondOptions: string[];
  ringSizes: string[];
  unavailableRingSizes: string[];
};

export type ShopMetalPriceTickerItem = {
  metal: string;
  unit: string;
  price: number;
  priceDate: string;
};

const fallbackImage = '/collection-1.jpg';
const collectionFallbackImages = [
  '/collection-1.jpg',
  '/collection-2.jpg',
  '/collection-3.jpg',
  '/hero-model.jpg',
  '/featured-main.jpg',
  '/featured-detail.jpg',
  '/cat-earrings.jpg',
  '/cat-necklace.jpg',
  '/cat-pendant.jpg',
  '/cat-rings.jpg',
  '/product-bangle.jpg',
  '/product-bracelet.jpg',
  '/product-bridal.jpg',
  '/product-chain.jpg',
  '/product-ring.jpg',
  '/product-studs.jpg',
];
const categoryFallbackImages = [
  '/cat-rings.jpg',
  '/cat-necklace.jpg',
  '/cat-earrings.jpg',
  '/cat-pendant.jpg',
  '/product-bangle.jpg',
  '/product-bracelet.jpg',
  '/product-ring.jpg',
  '/product-studs.jpg',
  '/product-chain.jpg',
  '/hero-model.jpg',
  '/featured-main.jpg',
  '/featured-detail.jpg',
];

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

function getCollectionFallbackImage(seed: string | number): string {
  if (collectionFallbackImages.length === 0) {
    return fallbackImage;
  }

  const seedValue = typeof seed === 'number' ? String(seed) : seed;
  const index = hashSeed(seedValue) % collectionFallbackImages.length;
  return collectionFallbackImages[index] ?? fallbackImage;
}

function getCategoryFallbackImage(seed: string | number): string {
  if (categoryFallbackImages.length === 0) {
    return fallbackImage;
  }

  const seedValue = typeof seed === 'number' ? String(seed) : seed;
  const index = hashSeed(seedValue) % categoryFallbackImages.length;
  return categoryFallbackImages[index] ?? fallbackImage;
}

function normalizeImageUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (/^(https?:)?\/\//i.test(trimmed) || trimmed.startsWith('/') || trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  const normalizedPath = trimmed
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^public\//i, '');

  return `/${normalizedPath}`;
}

function normalizeSlug(value: string): string {
  return decodeURIComponent(value)
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/-+/g, '-');
}

function toPriceNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getDisplayPrice(row: Pick<ProductRow, 'base_price' | 'original_price'>): number {
  const originalPrice = toPriceNumber(row.original_price);
  if (originalPrice > 0) {
    return originalPrice;
  }

  return toPriceNumber(row.base_price);
}

export async function fetchMetalPriceTicker(): Promise<ShopMetalPriceTickerItem[]> {
  const tenantId = await getCurrentTenantId();

  type MetalPriceRow = {
    price: number;
    price_date: string;
    created_at: string | null;
    metal: { id: string; name: string; unit: string } | Array<{ id: string; name: string; unit: string }> | null;
  };

  const { data, error } = await supabase
    .from('metal_prices')
    .select('price, price_date, created_at, metal:metals!metal_prices_metal_id_fkey(id, name, unit)')
    .eq('tenant_id', tenantId)
    .order('price_date', { ascending: false })
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(500);

  if (error) {
    throw error;
  }

  const latestByMetal = new Map<string, ShopMetalPriceTickerItem>();

  ((data ?? []) as MetalPriceRow[]).forEach((row) => {
    const metalRaw = Array.isArray(row.metal) ? row.metal[0] : row.metal;
    if (!metalRaw?.id || !metalRaw.name) {
      return;
    }

    if (latestByMetal.has(metalRaw.id)) {
      return;
    }

    latestByMetal.set(metalRaw.id, {
      metal: metalRaw.name,
      unit: metalRaw.unit || 'unit',
      price: toPriceNumber(row.price),
      priceDate: row.price_date,
    });
  });

  return Array.from(latestByMetal.values()).sort((a, b) => a.metal.localeCompare(b.metal));
}

function findLocalCollectionBySlug(slug: string): LocalCollection | null {
  const normalizedSlug = normalizeSlug(slug);
  const bySlug = localCollections.find((collection) => normalizeSlug(collection.slug) === normalizedSlug);
  if (bySlug) {
    return bySlug;
  }

  return localCollections.find((collection) => normalizeSlug(collection.name) === normalizedSlug) ?? null;
}

function mapLocalCollection(collection: LocalCollection): ShopCollection {
  return {
    id: 0,
    name: collection.name,
    slug: normalizeSlug(collection.slug),
    subtitle: collection.subtitle,
    description: collection.description,
    image: collection.image || getCollectionFallbackImage(collection.slug || collection.name),
  };
}

function toNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asIntRating(value: number | null): number {
  if (!value || Number.isNaN(value)) {
    return 4;
  }

  return Math.max(1, Math.min(5, Math.round(value)));
}

function getDiamondTypeLabel(optionValue: string): string {
  return optionValue.trim();
}

function normalizeSearchTerm(value: string): string {
  return value
    .trim()
    .replace(/[,%()]/g, ' ')
    .replace(/\s+/g, ' ');
}

function resolveProductImages(
  row: Pick<ProductRow, 'image_url' | 'hover_image_url'>,
  orderedProductImages: string[] = [],
): { image: string; hoverImage: string; gallery: string[] } {
  const gallery = Array.from(
    new Set(
      [
        ...orderedProductImages,
        normalizeImageUrl(row.image_url),
        normalizeImageUrl(row.hover_image_url),
      ].filter((value): value is string => Boolean(value)),
    ),
  );

  const image = gallery[0] ?? fallbackImage;
  const hoverImage = gallery[1] ?? gallery[0] ?? fallbackImage;

  return {
    image,
    hoverImage,
    gallery,
  };
}

function normalizeCollection(row: CollectionRow): ShopCollection {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    subtitle: row.subtitle ?? '',
    description: row.description ?? '',
    image: normalizeImageUrl(row.image_url) ?? getCollectionFallbackImage(`${row.id}-${row.slug}`),
  };
}

export async function fetchAllCollections(): Promise<ShopCollection[]> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('collections')
    .select('id, name, slug, subtitle, description, image_url, sort_order, created_at')
    .eq('tenant_id', tenantId)
    .or('is_active.is.null,is_active.eq.true')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CollectionRow[]).map((row) => normalizeCollection(row));
}

function mapProductCard(
  row: ProductRow,
  category: ShopCategory,
  collectionSlug: string | null,
  primaryMetal: string,
  reviewsCount: number,
  images: { image: string; hoverImage: string },
): ShopProductCard {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: category.name,
    categorySlug: category.slug,
    collectionSlug,
    price: getDisplayPrice(row),
    image: images.image,
    hoverImage: images.hoverImage,
    rating: asIntRating(row.rating),
    isNew: Boolean(row.is_new),
    isBestSeller: Boolean(row.is_best_seller),
    engravable: Boolean(row.is_engravable),
    metal: primaryMetal,
    createdAt: row.created_at,
    reviewsCount,
  };
}

async function getCategoriesByIds(ids: number[], tenantId: string): Promise<Map<number, ShopCategory>> {
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('tenant_id', tenantId)
    .in('id', ids);

  if (error) {
    throw error;
  }

  const map = new Map<number, ShopCategory>();
  (data as CategoryRow[]).forEach((row) => {
    map.set(row.id, {
      id: row.id,
      name: row.name,
      slug: row.slug,
    });
  });

  return map;
}

async function getCollectionsByIds(ids: number[], tenantId: string): Promise<Map<number, ShopCollection>> {
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('collections')
    .select('id, name, slug, subtitle, description, image_url')
    .eq('tenant_id', tenantId)
    .in('id', ids);

  if (error) {
    throw error;
  }

  const map = new Map<number, ShopCollection>();
  (data as CollectionRow[]).forEach((row) => {
    map.set(row.id, normalizeCollection(row));
  });

  return map;
}

async function getProductCountsByCategoryIds(ids: number[], tenantId: string): Promise<Map<number, number>> {
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('products')
    .select('category_id')
    .eq('tenant_id', tenantId)
    .in('category_id', ids)
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  const map = new Map<number, number>();
  (data as Array<{ category_id: number }>).forEach((row) => {
    map.set(row.category_id, (map.get(row.category_id) ?? 0) + 1);
  });

  return map;
}

async function getPrimaryMetalsByProductIds(ids: number[], tenantId: string): Promise<Map<number, string>> {
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('product_metals')
    .select('product_id, metal_type')
    .eq('tenant_id', tenantId)
    .in('product_id', ids)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const map = new Map<number, string>();
  (data as Array<{ product_id: number; metal_type: string }>).forEach((row) => {
    if (!map.has(row.product_id)) {
      map.set(row.product_id, row.metal_type);
    }
  });

  return map;
}

async function getReviewCountsByProductIds(ids: number[], tenantId: string): Promise<Map<number, number>> {
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('product_id')
    .eq('tenant_id', tenantId)
    .in('product_id', ids)
    .eq('is_approved', true);

  if (error) {
    throw error;
  }

  const counts = new Map<number, number>();
  (data as Array<{ product_id: number }>).forEach((row) => {
    counts.set(row.product_id, (counts.get(row.product_id) ?? 0) + 1);
  });

  return counts;
}

async function getProductImageSetsByProductIds(ids: number[], tenantId: string): Promise<Map<number, string[]>> {
  if (ids.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase
    .from('product_images')
    .select('product_id, image_url, sort_order')
    .eq('tenant_id', tenantId)
    .in('product_id', ids)
    .order('product_id', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  const map = new Map<number, string[]>();

  (data as ProductImageByProductRow[]).forEach((row) => {
    const imageUrl = normalizeImageUrl(row.image_url);
    if (!imageUrl) {
      return;
    }

    const existing = map.get(row.product_id) ?? [];
    if (!existing.includes(imageUrl)) {
      existing.push(imageUrl);
      map.set(row.product_id, existing);
    }
  });

  return map;
}

async function getProductCards(rows: ProductRow[], tenantId: string): Promise<ShopProductCard[]> {
  const productIds = rows.map((row) => row.id);
  const categoryIds = Array.from(new Set(rows.map((row) => row.category_id)));
  const collectionIds = Array.from(new Set(rows.map((row) => row.collection_id).filter((id): id is number => Boolean(id))));

  const [categoriesMap, collectionsMap, metalsMap, reviewCountsMap, productImagesMap] = await Promise.all([
    getCategoriesByIds(categoryIds, tenantId),
    getCollectionsByIds(collectionIds, tenantId),
    getPrimaryMetalsByProductIds(productIds, tenantId),
    getReviewCountsByProductIds(productIds, tenantId),
    getProductImageSetsByProductIds(productIds, tenantId),
  ]);

  return rows.map((row) => {
    const category = categoriesMap.get(row.category_id) ?? {
      id: row.category_id,
      name: 'Jewelry',
      slug: 'jewelry',
    };

    const collectionSlug = row.collection_id ? collectionsMap.get(row.collection_id)?.slug ?? null : null;
    const metal = metalsMap.get(row.id) ?? 'Gold';
    const reviewsCount = reviewCountsMap.get(row.id) ?? 0;
    const images = resolveProductImages(row, productImagesMap.get(row.id));

    return mapProductCard(row, category, collectionSlug, metal, reviewsCount, images);
  });
}

export async function fetchAllCategories(): Promise<ShopCategory[]> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url, sort_order, created_at')
    .eq('tenant_id', tenantId)
    .or('is_active.is.null,is_active.eq.true')
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false, nullsFirst: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as CategoryRow[];
  const countsByCategoryId = await getProductCountsByCategoryIds(rows.map((row) => row.id), tenantId);

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? '',
    image: normalizeImageUrl(row.image_url) ?? getCategoryFallbackImage(`${row.id}-${row.slug}`),
    productCount: countsByCategoryId.get(row.id) ?? 0,
  }));
}

export async function fetchCategoryBySlug(slug: string): Promise<ShopCategory | null> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, image_url')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .or('is_active.is.null,is_active.eq.true')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const category = data as CategoryRow;
  const countMap = await getProductCountsByCategoryIds([category.id], tenantId);

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    image: normalizeImageUrl(category.image_url) ?? getCategoryFallbackImage(`${category.id}-${category.slug}`),
    productCount: countMap.get(category.id) ?? 0,
  };
}

export async function fetchProductsByCategorySlug(slug: string): Promise<{ category: ShopCategory | null; products: ShopProductCard[] }> {
  const tenantId = await getCurrentTenantId();
  const category = await fetchCategoryBySlug(slug);
  if (!category) {
    return {
      category: null,
      products: [],
    };
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, sku, base_price, original_price, image_url, hover_image_url, description, long_description, rating, is_new, is_best_seller, is_engravable, stock_quantity, created_at, category_id, collection_id')
    .eq('tenant_id', tenantId)
    .eq('category_id', category.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const productRows = (data ?? []) as ProductRow[];
  const products = await getProductCards(productRows, tenantId);

  return {
    category,
    products,
  };
}

export async function fetchBestSellerProducts(limit = 12): Promise<ShopProductCard[]> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, sku, base_price, original_price, image_url, hover_image_url, description, long_description, rating, is_new, is_best_seller, is_engravable, stock_quantity, created_at, category_id, collection_id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .eq('is_best_seller', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ProductRow[];
  return getProductCards(rows, tenantId);
}

export async function fetchCollectionBySlug(slug: string): Promise<ShopCollection | null> {
  const tenantId = await getCurrentTenantId();
  const normalizedSlug = normalizeSlug(slug);
  const slugVariants = Array.from(
    new Set([
      slug,
      normalizedSlug,
      normalizedSlug.replace(/-/g, '_'),
      normalizedSlug.replace(/-/g, ' '),
    ]),
  );

  const { data, error } = await supabase
    .from('collections')
    .select('id, name, slug, subtitle, description, image_url')
    .eq('tenant_id', tenantId)
    .in('slug', slugVariants)
    .or('is_active.is.null,is_active.eq.true');

  if (error) {
    const localCollection = findLocalCollectionBySlug(slug);
    if (localCollection) {
      return mapLocalCollection(localCollection);
    }

    throw error;
  }

  const rows = (data ?? []) as CollectionRow[];
  if (rows.length > 0) {
    const bestMatch = rows.find((row) => normalizeSlug(row.slug) === normalizedSlug) ?? rows[0];
    return normalizeCollection(bestMatch);
  }

  const localCollection = findLocalCollectionBySlug(slug);
  if (localCollection) {
    return mapLocalCollection(localCollection);
  }

  return null;
}

export async function fetchProductsByCollectionSlug(slug: string): Promise<{ collection: ShopCollection | null; products: ShopCollectionProduct[] }> {
  const tenantId = await getCurrentTenantId();
  const collection = await fetchCollectionBySlug(slug);
  if (!collection) {
    return {
      collection: null,
      products: [],
    };
  }

  if (collection.id <= 0) {
    return {
      collection,
      products: [],
    };
  }

  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, sku, base_price, original_price, image_url, hover_image_url, description, long_description, rating, is_new, is_best_seller, is_engravable, stock_quantity, created_at, category_id, collection_id')
    .eq('tenant_id', tenantId)
    .eq('collection_id', collection.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ProductRow[];

  const productIds = rows.map((row) => row.id);
  const [reviewCounts, productImagesMap] = await Promise.all([
    getReviewCountsByProductIds(productIds, tenantId),
    getProductImageSetsByProductIds(productIds, tenantId),
  ]);

  const mapped = rows.map((row) => {
    const badges: string[] = [];
    const displayPrice = getDisplayPrice(row);
    const images = resolveProductImages(row, productImagesMap.get(row.id));

    if (row.is_best_seller) {
      badges.push('Best Seller');
    }

    if (row.is_new) {
      badges.push('New');
    }

    if (row.is_engravable) {
      badges.push('Engravable');
    }

    return {
      id: row.id,
      name: row.name,
      price: new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(displayPrice),
      priceValue: displayPrice,
      image: images.image,
      hoverImage: images.hoverImage,
      badges,
      rating: asIntRating(row.rating),
      reviews: reviewCounts.get(row.id) ?? 0,
      collectionSlug: collection.slug,
    };
  });

  return {
    collection,
    products: mapped,
  };
}

export async function fetchProductDetailById(productId: number): Promise<ShopProductDetail | null> {
  const tenantId = await getCurrentTenantId();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, sku, base_price, original_price, image_url, hover_image_url, description, long_description, rating, is_new, is_best_seller, is_engravable, stock_quantity, created_at, category_id, collection_id')
    .eq('tenant_id', tenantId)
    .eq('id', productId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const row = data as ProductRow;

  const [categoriesMap, collectionsMap, imagesRes, metalsRes, sizesRes, optionsRes, reviewsRes] = await Promise.all([
    getCategoriesByIds([row.category_id], tenantId),
    row.collection_id ? getCollectionsByIds([row.collection_id], tenantId) : Promise.resolve(new Map<number, ShopCollection>()),
    supabase
      .from('product_images')
      .select('image_url, sort_order')
      .eq('tenant_id', tenantId)
      .eq('product_id', row.id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('product_metals')
      .select('metal_type')
      .eq('tenant_id', tenantId)
      .eq('product_id', row.id),
    supabase
      .from('ring_sizes')
      .select('size_label, is_available')
      .eq('tenant_id', tenantId)
      .eq('product_id', row.id),
    supabase
      .from('product_options')
      .select('option_type, option_value')
      .eq('tenant_id', tenantId)
      .eq('product_id', row.id)
      .in('option_type', ['carat', 'diamond_type', 'metal', 'size']),
    supabase
      .from('reviews')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('product_id', row.id)
      .eq('is_approved', true),
  ]);

  if (imagesRes.error) {
    throw imagesRes.error;
  }

  if (metalsRes.error) {
    throw metalsRes.error;
  }

  if (sizesRes.error) {
    throw sizesRes.error;
  }

  if (optionsRes.error) {
    throw optionsRes.error;
  }

  if (reviewsRes.error) {
    throw reviewsRes.error;
  }

  const imageRows = (imagesRes.data ?? []) as ProductImageRow[];
  const metalRows = (metalsRes.data ?? []) as ProductMetalRow[];
  const sizeRows = (sizesRes.data ?? []) as RingSizeRow[];
  const optionRows = (optionsRes.data ?? []) as ProductOptionRow[];

  const category = categoriesMap.get(row.category_id) ?? {
    id: row.category_id,
    name: 'Jewelry',
    slug: 'jewelry',
  };

  const collectionSlug = row.collection_id ? collectionsMap.get(row.collection_id)?.slug ?? null : null;

  const metalOptionsFromOptions = optionRows
    .filter((option) => option.option_type === 'metal')
    .map((option) => option.option_value);

  const metalOptions = Array.from(
    new Set([
      ...metalRows.map((metal) => metal.metal_type),
      ...metalOptionsFromOptions,
    ]),
  );

  const caratOptions = Array.from(
    new Set(
      optionRows
        .filter((option) => option.option_type === 'carat')
        .map((option) => toNumber(option.option_value))
        .filter((value) => value > 0),
    ),
  ).sort((a, b) => a - b);

  const diamondOptions = Array.from(
    new Set(
      optionRows
        .filter((option) => option.option_type === 'diamond_type')
        .map((option) => getDiamondTypeLabel(option.option_value)),
    ),
  );

  const availableSizes = sizeRows.filter((size) => size.is_available).map((size) => size.size_label);
  const unavailableSizes = sizeRows.filter((size) => !size.is_available).map((size) => size.size_label);

  const orderedGalleryImages = imageRows
    .map((item) => normalizeImageUrl(item.image_url))
    .filter((value): value is string => Boolean(value));
  const resolvedImages = resolveProductImages(row, orderedGalleryImages);
  const gallery = resolvedImages.gallery.length > 0 ? resolvedImages.gallery : [resolvedImages.image];

  return {
    id: row.id,
    slug: row.slug,
    sku: row.sku,
    name: row.name,
    category: category.name,
    categorySlug: category.slug,
    collectionSlug,
    description: row.description ?? '',
    longDescription: row.long_description ?? row.description ?? '',
    price: getDisplayPrice(row),
    image: resolvedImages.image,
    hoverImage: resolvedImages.hoverImage,
    gallery,
    rating: asIntRating(row.rating),
    reviewsCount: reviewsRes.count ?? 0,
    inStock: (row.stock_quantity ?? 0) > 0,
    isNew: Boolean(row.is_new),
    isBestSeller: Boolean(row.is_best_seller),
    metalOptions,
    caratOptions,
    diamondOptions,
    ringSizes: availableSizes,
    unavailableRingSizes: unavailableSizes,
  };
}

export async function searchProducts(query: string, limit = 24): Promise<ShopProductCard[]> {
  const tenantId = await getCurrentTenantId();

  const normalized = normalizeSearchTerm(query);
  if (normalized.length < 2) {
    return [];
  }

  const pattern = `%${normalized.replace(/\s+/g, '%')}%`;

  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, sku, base_price, original_price, image_url, hover_image_url, description, long_description, rating, is_new, is_best_seller, is_engravable, stock_quantity, created_at, category_id, collection_id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .or(`name.ilike.${pattern},slug.ilike.${pattern},sku.ilike.${pattern},description.ilike.${pattern}`)
    .order('is_best_seller', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ProductRow[];
  return getProductCards(rows, tenantId);
}

export async function fetchProductsByIds(productIds: number[]): Promise<ShopProductCard[]> {
  const tenantId = await getCurrentTenantId();

  if (productIds.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(productIds));

  const { data, error } = await supabase
    .from('products')
    .select('id, name, slug, sku, base_price, original_price, image_url, hover_image_url, description, long_description, rating, is_new, is_best_seller, is_engravable, stock_quantity, created_at, category_id, collection_id')
    .eq('tenant_id', tenantId)
    .in('id', uniqueIds)
    .eq('is_active', true);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ProductRow[];
  const cards = await getProductCards(rows, tenantId);
  const byId = new Map(cards.map((item) => [item.id, item]));

  return uniqueIds
    .map((id) => byId.get(id))
    .filter((item): item is ShopProductCard => Boolean(item));
}
