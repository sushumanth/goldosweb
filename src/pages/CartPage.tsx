import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Minus, Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { collections } from '@/data/collections';

function formatPrice(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function CartPage() {
  const { cartItems, totalItems, subtotal, updateQuantity, removeFromCart, clearCart } = useCart();

  const shipping = subtotal > 150000 ? 0 : totalItems > 0 ? 1200 : 0;
  const estimatedTotal = subtotal + shipping;

  const getProductHref = (productId: number) => {
    const collection = collections.find((item) =>
      item.products.some((product) => product.id === productId),
    );

    return collection
      ? `/collections/${collection.slug}/product/${productId}`
      : '/';
  };

  return (
    <main className="min-h-screen bg-charcoal text-white page-fade-in pb-24 md:pb-12">
      <section className="section-padding py-4 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Continue Shopping
          </Link>
          <p className="text-sm text-gray-300">{totalItems} items</p>
        </div>
      </section>

      <section className="section-padding py-7">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
          <h1 className="font-serif text-3xl md:text-4xl text-white">Your Cart</h1>
          <div className="text-right text-sm text-gray-300">
            <p>{cartItems.length} products</p>
            <p>{totalItems} total units</p>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="border border-white/10 bg-charcoal-light p-6 rounded-2xl">
            <p className="text-gray-300 mb-4">Your cart is empty.</p>
            <Link to="/" className="text-gold hover:text-gold-light transition-colors">
              Start shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {cartItems.map((item) => (
                <article
                  key={item.key}
                  className="border border-white/15 bg-charcoal-light p-3.5 rounded-2xl hover:border-gold/40 transition-colors"
                >
                  <div className="grid grid-cols-[84px_1fr_auto] gap-3 items-start">
                    <Link to={getProductHref(item.productId)} className="group">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-[84px] h-[84px] object-cover border border-white/10 rounded-xl transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </Link>

                    <div>
                      <Link
                        to={getProductHref(item.productId)}
                        className="font-serif text-xl text-white mb-1 leading-tight line-clamp-2 hover:text-gold transition-colors inline-block"
                      >
                        {item.name}
                      </Link>
                      <p className="text-xl text-gold mb-1.5">{formatPrice(item.unitPrice)}</p>

                      <div className="text-gray-300 text-sm space-y-0.5">
                        <p>Metal: {item.selection.metal}</p>
                        <p>Carat: {item.selection.carat} ct</p>
                        <p>Diamond: {item.selection.diamondType}</p>
                        <p>Size: {item.selection.size}</p>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <div className="h-9 border border-white/20 inline-flex items-center rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, item.quantity - 1)}
                            className="h-full w-9 inline-flex items-center justify-center text-white hover:text-gold transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-9 text-center text-sm">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.key, item.quantity + 1)}
                            className="h-full w-9 inline-flex items-center justify-center text-white hover:text-gold transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.key)}
                          className="h-9 px-3 border border-white/20 inline-flex items-center gap-2 text-sm rounded-lg hover:border-gold hover:text-gold transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="text-xl text-white font-medium pt-0.5">
                      {formatPrice(item.unitPrice * item.quantity)}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={clearCart}
                className="h-10 px-4 border border-white/25 text-sm rounded-lg hover:border-gold hover:text-gold transition-colors"
              >
                Clear Cart
              </button>
              <div className="text-right bg-charcoal-light border border-white/10 rounded-xl px-4 py-2">
                <p className="text-gray-400 text-sm">Cart Total</p>
                <p className="text-2xl text-gold font-semibold">{formatPrice(estimatedTotal)}</p>
              </div>
            </div>

            <Button className="w-full mt-6 h-12 bg-gold text-charcoal font-semibold hover:bg-gold-light rounded-xl">
              <CreditCard className="w-4 h-4 mr-2" />
              Proceed To Checkout
            </Button>
            <p className="text-xs text-gray-500 mt-3">
              Secure checkout integration ready for payment gateway connection.
            </p>
          </>
        )}
      </section>

      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 md:hidden z-40 border-t border-white/10 bg-charcoal/95 backdrop-blur-md p-3">
          <div className="section-padding !px-0 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-gray-400">{totalItems} items</p>
              <p className="text-gold font-semibold">{formatPrice(estimatedTotal)}</p>
            </div>
            <Button className="h-11 bg-gold text-charcoal font-semibold hover:bg-gold-light rounded-xl">
              Checkout
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}

export default CartPage;
