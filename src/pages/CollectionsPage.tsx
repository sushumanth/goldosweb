import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { collections as localCollections } from '@/data/collections';
import { fetchAllCollections, type ShopCollection } from '@/lib/shop-api';

const fallbackCollections: ShopCollection[] = localCollections.map((collection, index) => ({
  id: index + 1,
  name: collection.name,
  slug: collection.slug,
  subtitle: collection.subtitle,
  description: collection.description,
  image: collection.image,
}));

function CollectionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [collections, setCollections] = useState<ShopCollection[]>(fallbackCollections);

  useEffect(() => {
    let isMounted = true;

    const loadCollections = async () => {
      setIsLoading(true);

      try {
        const rows = await fetchAllCollections();

        if (!isMounted) {
          return;
        }

        setCollections(rows);
      } catch {
        if (!isMounted) {
          return;
        }

        setCollections(fallbackCollections);
        toast.error('Unable to load collections from Supabase. Showing local lookbook.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadCollections();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-charcoal text-white page-fade-in pb-16">
      <section className="section-padding py-5 border-b border-white/10 bg-charcoal">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <p className="text-sm text-gray-300">{isLoading ? 'Loading collections...' : `${collections.length} collections`}</p>
        </div>
      </section>

      <section className="section-padding py-10">
        <div className="max-w-7xl mx-auto">
          <span className="text-gold text-sm tracking-widest uppercase mb-3 block">Lookbook</span>
          <h1 className="heading-lg text-white mb-3">All Collections</h1>
          <p className="text-body max-w-3xl mb-8">
            Explore every collection currently available. Open any collection to view products and details.
          </p>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="aspect-[2/3] bg-charcoal-light border border-white/10 skeleton-shimmer" />
              ))}
            </div>
          ) : collections.length === 0 ? (
            <div className="border border-white/10 bg-charcoal-light p-8 text-center text-gray-300">
              No collections are available right now.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {collections.map((collection) => (
                <Link
                  key={`${collection.slug}-${collection.id}`}
                  to={`/collections/${collection.slug}`}
                  className="group relative overflow-hidden border border-white/10 hover:border-gold/50 transition-colors"
                >
                  <div className="relative aspect-[2/3] bg-charcoal-dark">
                    <img
                      src={collection.image}
                      alt={collection.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <p className="text-gold text-xs tracking-widest uppercase mb-2">
                        {collection.subtitle || 'Signature Edit'}
                      </p>
                      <h2 className="font-serif text-3xl text-white capitalize mb-2">{collection.name}</h2>
                      <p className="text-sm text-gray-200 line-clamp-2 mb-3">
                        {collection.description || 'Discover a curated jewelry collection.'}
                      </p>
                      <span className="inline-flex items-center gap-2 text-gold group-hover:text-gold-light transition-colors">
                        Open Collection
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default CollectionsPage;