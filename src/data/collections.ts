export type CollectionProduct = {
  id: number;
  name: string;
  price: string;
  image: string;
  hoverImage: string;
  badges: string[];
  rating: number;
  reviews: number;
  colors: string[];
};

export type Collection = {
  slug: string;
  name: string;
  subtitle: string;
  image: string;
  description: string;
  products: CollectionProduct[];
};

export const collections: Collection[] = [
  {
    slug: 'bridal-collection',
    name: 'Bridal Collection',
    subtitle: 'Eternal Love',
    image: '/collection-1.jpg',
    description:
      'Designed for your most meaningful moments, this curation blends heirloom-inspired silhouettes with modern diamond craftsmanship for ceremonies, receptions, and everything in between.',
    products: [
      {
        id: 101,
        name: 'Emerald Cut Diamond Eternity Ring In 14K White Gold',
        price: '$6,460',
        image: '/product-ring.jpg',
        hoverImage: '/hero-model.jpg',
        badges: ['Natural', 'Carats'],
        rating: 5,
        reviews: 75,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7', '#c2c2c2'],
      },
      {
        id: 102,
        name: 'Low Dome Basket Diamond Eternity Ring In 14K White Gold',
        price: '$2,620',
        image: '/product-studs.jpg',
        hoverImage: '/collection-1.jpg',
        badges: ['Natural', 'Carats'],
        rating: 5,
        reviews: 19,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7', '#c2c2c2'],
      },
      {
        id: 103,
        name: 'Crescendo Curved Diamond Wedding Ring In 14K White Gold',
        price: '$1,640',
        image: '/featured-detail.jpg',
        hoverImage: '/collection-2.jpg',
        badges: ['Lab Grown'],
        rating: 5,
        reviews: 9,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7'],
      },
      {
        id: 104,
        name: 'French Pave Diamond Eternity Ring In 14K White Gold',
        price: '$1,100',
        image: '/product-bangle.jpg',
        hoverImage: '/collection-3.jpg',
        badges: ['Natural', 'Carats'],
        rating: 4,
        reviews: 10,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7', '#c2c2c2'],
      },
      {
        id: 105,
        name: 'Classic Prong Set Wedding Ring In 18K White Gold',
        price: '$1,890',
        image: '/product-chain.jpg',
        hoverImage: '/hero-model.jpg',
        badges: ['Natural'],
        rating: 5,
        reviews: 31,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7'],
      },
      {
        id: 106,
        name: 'Petite Diamond Band In 14K White Gold',
        price: '$980',
        image: '/product-bridal.jpg',
        hoverImage: '/collection-1.jpg',
        badges: ['Lab Grown', 'Carats'],
        rating: 4,
        reviews: 22,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7'],
      },
    ],
  },
  {
    slug: 'diamond-essentials',
    name: 'Diamond Essentials',
    subtitle: 'Timeless Sparkle',
    image: '/collection-2.jpg',
    description:
      'A refined edit of everyday brilliance featuring versatile diamond hoops, studs, and pendants that elevate both festive looks and minimalist daily styling.',
    products: [
      {
        id: 201,
        name: 'Round Brilliant Diamond Studs In 14K White Gold',
        price: '$1,250',
        image: '/product-studs.jpg',
        hoverImage: '/collection-2.jpg',
        badges: ['Lab Grown'],
        rating: 5,
        reviews: 41,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7'],
      },
      {
        id: 202,
        name: 'Tapered Diamond Ring In 18K White Gold',
        price: '$2,950',
        image: '/product-ring.jpg',
        hoverImage: '/hero-model.jpg',
        badges: ['Natural', 'Carats'],
        rating: 5,
        reviews: 28,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7', '#c2c2c2'],
      },
      {
        id: 203,
        name: 'Halo Diamond Necklace In 14K White Gold',
        price: '$2,150',
        image: '/featured-main.jpg',
        hoverImage: '/collection-1.jpg',
        badges: ['Natural'],
        rating: 4,
        reviews: 16,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7'],
      },
      {
        id: 204,
        name: 'Petite Cluster Diamond Ring In 14K White Gold',
        price: '$1,460',
        image: '/featured-detail.jpg',
        hoverImage: '/collection-3.jpg',
        badges: ['Lab Grown'],
        rating: 5,
        reviews: 34,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7'],
      },
      {
        id: 205,
        name: 'Diamond Accent Pendant In Platinum Finish',
        price: '$1,320',
        image: '/cat-pendant.jpg',
        hoverImage: '/hero-model.jpg',
        badges: ['Natural', 'Carats'],
        rating: 4,
        reviews: 12,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7'],
      },
      {
        id: 206,
        name: 'Classic Solitaire Ring In 18K White Gold',
        price: '$2,780',
        image: '/product-bridal.jpg',
        hoverImage: '/collection-2.jpg',
        badges: ['Natural'],
        rating: 5,
        reviews: 26,
        colors: ['#f5f5f5', '#d4af37', '#d39ea7', '#c2c2c2'],
      },
    ],
  },
  {
    slug: 'gold-classics',
    name: 'Gold Classics',
    subtitle: 'Pure Elegance',
    image: '/collection-3.jpg',
    description:
      'Signature yellow-gold pieces rooted in tradition, reimagined with sleek forms and clean finishes to deliver effortless luxury for every generation.',
    products: [
      {
        id: 301,
        name: 'Statement Gold Link Necklace In 22K Gold',
        price: '$3,980',
        image: '/product-chain.jpg',
        hoverImage: '/collection-3.jpg',
        badges: ['Natural'],
        rating: 5,
        reviews: 44,
        colors: ['#d4af37', '#f5f5f5', '#d39ea7'],
      },
      {
        id: 302,
        name: 'Classic Gold Bangle With Diamond Accent',
        price: '$2,450',
        image: '/product-bangle.jpg',
        hoverImage: '/hero-model.jpg',
        badges: ['Natural', 'Carats'],
        rating: 5,
        reviews: 18,
        colors: ['#d4af37', '#f5f5f5', '#d39ea7'],
      },
      {
        id: 303,
        name: 'Charm Gold Bracelet In 18K Gold',
        price: '$1,780',
        image: '/product-bracelet.jpg',
        hoverImage: '/collection-1.jpg',
        badges: ['Natural'],
        rating: 4,
        reviews: 15,
        colors: ['#d4af37', '#f5f5f5', '#d39ea7'],
      },
      {
        id: 304,
        name: 'Pendant Coin Necklace In Vintage Gold Tone',
        price: '$1,260',
        image: '/cat-pendant.jpg',
        hoverImage: '/collection-2.jpg',
        badges: ['Natural'],
        rating: 5,
        reviews: 23,
        colors: ['#d4af37', '#f5f5f5', '#d39ea7'],
      },
      {
        id: 305,
        name: 'Signature Gold Hoop Earrings',
        price: '$940',
        image: '/cat-earrings.jpg',
        hoverImage: '/hero-model.jpg',
        badges: ['Natural', 'On Sale'],
        rating: 4,
        reviews: 17,
        colors: ['#d4af37', '#f5f5f5', '#d39ea7'],
      },
      {
        id: 306,
        name: 'Fine Gold Ring Stack Set',
        price: '$1,420',
        image: '/product-ring.jpg',
        hoverImage: '/collection-3.jpg',
        badges: ['Natural', 'Carats'],
        rating: 5,
        reviews: 29,
        colors: ['#d4af37', '#f5f5f5', '#d39ea7', '#c2c2c2'],
      },
    ],
  },
];
