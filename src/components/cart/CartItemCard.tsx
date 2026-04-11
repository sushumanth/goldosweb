import { Minus, Plus, Trash2 } from 'lucide-react';

import type { CartItem } from '@/context/CartContext';
import { Button } from '@/components/ui/button';

type CartItemCardProps = {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
};

export function CartItemCard({ item, onIncrease, onDecrease, onRemove }: CartItemCardProps) {
  const formatPrice = (value: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <article className="border border-white/10 bg-charcoal-light p-4 md:p-5">
      <div className="grid grid-cols-[96px_minmax(0,1fr)] md:grid-cols-[120px_minmax(0,1fr)] gap-4">
        <div className="aspect-square bg-[#111] border border-white/10 overflow-hidden flex items-center justify-center">
          <img src={item.image} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-contain" />
        </div>

        <div className="min-w-0">
          <h3 className="font-serif text-lg text-white leading-tight">{item.name}</h3>
          <p className="text-gold mt-2 font-medium">{formatPrice(item.unitPrice)}</p>

          <div className="mt-3 text-xs text-gray-400 space-y-1">
            <p>Metal: {item.selection.metal}</p>
            <p>Carat: {item.selection.carat} ct</p>
            <p>Diamond: {item.selection.diamondType}</p>
            <p>Size: {item.selection.size}</p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center border border-white/20">
              <button
                type="button"
                onClick={onDecrease}
                className="h-9 w-9 inline-flex items-center justify-center text-gray-200 hover:text-gold transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-sm">{item.quantity}</span>
              <button
                type="button"
                onClick={onIncrease}
                className="h-9 w-9 inline-flex items-center justify-center text-gray-200 hover:text-gold transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <Button
              variant="outline"
              onClick={onRemove}
              className="h-9 border-white/20 text-white hover:border-rose-400 hover:text-rose-300"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>

            <p className="ml-auto text-sm text-white font-medium">
              {formatPrice(item.unitPrice * item.quantity)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
