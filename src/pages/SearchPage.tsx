import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search, ShoppingBag, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

import { useCart } from '@/context/CartContext';
import { searchProducts, type ShopProductCard } from '@/lib/shop-api';

function SearchSkeletonCard() {
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

function formatPrice(price: number) {
	return new Intl.NumberFormat('en-IN', {
		style: 'currency',
		currency: 'INR',
		maximumFractionDigits: 0,
	}).format(price);
}

function SearchPage() {
	const { totalItems } = useCart();
	const [searchParams, setSearchParams] = useSearchParams();
	const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
	const [results, setResults] = useState<ShopProductCard[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const normalizedQuery = useMemo(() => query.trim(), [query]);

	useEffect(() => {
		const urlQuery = searchParams.get('q') ?? '';
		if (urlQuery !== query) {
			setQuery(urlQuery);
		}
	}, [searchParams, query]);

	const updateQuery = (nextQuery: string) => {
		setQuery(nextQuery);

		if (nextQuery.trim().length > 0) {
			setSearchParams({ q: nextQuery.trim() }, { replace: true });
			return;
		}

		setSearchParams({}, { replace: true });
	};

	useEffect(() => {
		let isMounted = true;

		if (normalizedQuery.length < 2) {
			setResults([]);
			setIsLoading(false);
			return () => {
				isMounted = false;
			};
		}

		setIsLoading(true);

		const timer = window.setTimeout(() => {
			void (async () => {
				try {
					const payload = await searchProducts(normalizedQuery);
					if (!isMounted) {
						return;
					}

					setResults(payload);
				} catch {
					if (!isMounted) {
						return;
					}

					setResults([]);
					toast.error('Unable to search products right now. Please try again.');
				} finally {
					if (isMounted) {
						setIsLoading(false);
					}
				}
			})();
		}, 250);

		return () => {
			isMounted = false;
			window.clearTimeout(timer);
		};
	}, [normalizedQuery]);

	return (
		<main className="min-h-screen bg-charcoal text-white page-fade-in">
			<section className="section-padding pt-5 md:pt-6 pb-3 border-b border-white/5 bg-charcoal-light/50">
				<div className="max-w-7xl mx-auto">
					<div className="flex items-center justify-between gap-4">
						<Link to="/" className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors">
							<ArrowLeft className="w-4 h-4" />
							Back to Home
						</Link>
						<Link to="/cart" className="relative p-2 text-gray-300 hover:text-gold transition-colors" aria-label="Open cart">
							<ShoppingBag className="w-5 h-5" />
							{totalItems > 0 && (
								<span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-gold text-charcoal text-[10px] rounded-full flex items-center justify-center font-semibold">
									{totalItems}
								</span>
							)}
						</Link>
					</div>

					<div className="mt-4">
						<p className="text-gold uppercase tracking-[0.22em] text-[10px] md:text-xs">Find Your Piece</p>
						<h1 className="font-serif text-[1.7rem] md:text-[1.95rem] leading-tight text-white mt-1">Search Products</h1>
					</div>

					<div className="mt-5 relative max-w-2xl">
						<Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
						<input
							value={query}
							onChange={(event) => updateQuery(event.target.value)}
							placeholder="Search by product name, SKU, or style"
							className="w-full bg-charcoal border border-white/15 pl-10 pr-10 py-3 text-white placeholder:text-gray-500 focus:border-gold focus:outline-none"
						/>
						{query.length > 0 && (
							<button
								type="button"
								onClick={() => updateQuery('')}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gold transition-colors"
								aria-label="Clear search"
							>
								<X className="w-4 h-4" />
							</button>
						)}
					</div>

					<p className="mt-3 text-sm text-gray-400">
						{normalizedQuery.length < 2
							? 'Type at least 2 characters to start searching.'
							: isLoading
								? 'Searching...'
								: `${results.length} result${results.length === 1 ? '' : 's'} for "${normalizedQuery}"`}
					</p>
				</div>
			</section>

			<section className="section-padding py-8 md:py-10">
				<div className="max-w-7xl mx-auto">
					{isLoading && (
						<div className="grid grid-cols-2 xl:grid-cols-4 md:grid-cols-3 gap-6">
							{Array.from({ length: 8 }).map((_, index) => (
								<SearchSkeletonCard key={index} />
							))}
						</div>
					)}

					{!isLoading && normalizedQuery.length >= 2 && results.length === 0 && (
						<div className="card-luxury p-10 text-center">
							<p className="text-gray-300">No products matched your search. Try a different keyword.</p>
						</div>
					)}

					{!isLoading && results.length > 0 && (
						<div className="grid grid-cols-2 xl:grid-cols-4 md:grid-cols-3 gap-6">
							{results.map((product) => (
								<Link
									key={product.id}
									to={`/product/${product.id}`}
									className="card-luxury group overflow-hidden product-card-premium"
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
									</div>
									<div className="p-5">
										<p className="text-gray-400 text-xs uppercase tracking-[0.2em]">{product.category}</p>
										<h3 className="font-serif text-lg text-white mt-2 leading-tight">{product.name}</h3>
										<div className="mt-3 flex items-center justify-between gap-3">
											<p className="text-gold font-medium">{formatPrice(product.price)}</p>
											<span className="text-xs text-gray-400">{product.metal}</span>
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

export default SearchPage;
