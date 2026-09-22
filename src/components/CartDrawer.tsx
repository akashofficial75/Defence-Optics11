import React, { useState } from 'react';
import { X, Trash2, ArrowRight, Tag, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { CartItem } from '../types';
import { PROMO_CODES } from '../data/initialData';
import { useSiteSettings } from '../lib/useSiteSettings';
import { RenderTrustIcon } from './TrustIcon';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems?: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout?: (appliedPromo?: { code: string; discount_percentage: number }) => void;
  onCheckout?: (appliedPromo?: { code: string; discount_percentage: number }) => void;
  onBrowseShop: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems = [],
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onCheckout,
  onBrowseShop
}) => {
  const { settings } = useSiteSettings();
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount_percentage: number } | null>(null);

  if (!isOpen) return null;

  const safeItems = cartItems || [];

  const subtotal = safeItems.reduce((acc, item) => {
    if (!item?.product) return acc;
    const price = item.product.discount_price || item.product.price || 0;
    return acc + price * (item.quantity || 1);
  }, 0);

  const discountAmount = appliedPromo
    ? Math.round((subtotal * appliedPromo.discount_percentage) / 100)
    : 0;

  const chargeInside = Number(settings.delivery_charge_inside_dhaka) || 100;
  const chargeOutside = Number(settings.delivery_charge_outside_dhaka) || 130;
  const estimatedSubtotalAfterDiscount = Math.max(0, subtotal - discountAmount);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError('');
    const found = PROMO_CODES.find((p) => p.code.toUpperCase() === promoInput.trim().toUpperCase());
    if (found) {
      setAppliedPromo(found);
      setPromoInput('');
    } else {
      setPromoError('Invalid voucher code. Try DEFENCE10 or OPTICS20');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#F5F1EA] text-[#141414] shadow-2xl flex flex-col justify-between border-l border-[#DCD3C4]">
          {/* Header */}
          <div className="p-6 bg-[#141414] text-white flex items-center justify-between border-b border-[#2A2A2A]">
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-[#C89B4A]" />
              <h3 className="font-serif text-lg font-bold uppercase tracking-wider">
                Your Shopping Bag ({safeItems.reduce((s, i) => s + (i?.quantity || 0), 0)})
              </h3>
            </div>
            <button
              id="close-cart-btn"
              onClick={onClose}
              className="p-1 text-[#BFB9AF] hover:text-white transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {safeItems.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingBag className="w-12 h-12 text-[#B5ADA0] mx-auto mb-3 stroke-[1.2]" />
                <p className="font-serif text-lg font-bold text-[#141414] mb-1">
                  Your bag is empty
                </p>
                <p className="text-xs text-[#706B62] mb-6">
                  Explore our handcrafted eyeglasses, sunglasses, and frames.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    onBrowseShop();
                  }}
                  className="btn-lift px-6 py-2.5 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#D4A347] hover:text-[#141414] transition-colors rounded-lg cursor-pointer shadow-xs"
                >
                  Start Browsing
                </button>
              </div>
            ) : (
              cartItems.map((item) => {
                const itemPrice = item.product.discount_price || item.product.price;
                return (
                  <div
                    key={item.product.id}
                    className="flex gap-4 p-3.5 bg-white border border-[#E3DBD0] rounded-xl shadow-xs transition-colors"
                  >
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      onError={(e) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80';
                      }}
                      className="w-20 h-20 object-contain bg-[#FAF8F5] border border-[#F0EBE1] rounded-lg flex-shrink-0"
                    />

                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-serif font-bold text-sm text-[#141414] line-clamp-1">
                            {item.product.name}
                          </h4>
                          <span className="text-[10px] text-[#827C72] uppercase tracking-wider">
                            {item.product.category_slug || 'Eyewear'}
                          </span>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.product.id)}
                          className="text-[#999285] hover:text-red-600 transition-colors p-1 cursor-pointer"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center border border-[#DCD3C4] bg-[#F9F7F4] rounded-lg overflow-hidden">
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center text-xs font-semibold hover:bg-[#EBE4D8] cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-xs font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                            disabled={item.quantity >= item.product.stock_quantity}
                            className="w-7 h-7 flex items-center justify-center text-xs font-semibold hover:bg-[#EBE4D8] disabled:opacity-30 cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <span className="font-sans font-bold text-sm text-[#141414]">
                            ৳{(itemPrice * item.quantity).toLocaleString()}
                          </span>
                          {item.product.discount_price && (
                            <span className="block text-[10px] text-[#9A9387] line-through">
                              ৳{(item.product.price * item.quantity).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Summary & Checkout */}
          {cartItems.length > 0 && (
            <div className="p-6 bg-[#EDE7DC] border-t border-[#DCD3C4] space-y-4">
              {/* Promo Code Form */}
              <form onSubmit={handleApplyPromo} className="space-y-1">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 absolute left-3 top-3 text-[#7F796F]" />
                    <input
                      type="text"
                      placeholder="Promo Code (DEFENCE10)"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-white border border-[#DCD3C4] text-xs uppercase placeholder:normal-case focus:outline-hidden focus:border-[#D4A347] rounded-lg"
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn-lift px-4 py-2 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#D4A347] hover:text-[#141414] transition-colors rounded-lg cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
                {promoError && <p className="text-[11px] text-red-600">{promoError}</p>}
                {appliedPromo && (
                  <p className="text-[11px] text-emerald-700 font-medium">
                    ✓ Promo applied: {appliedPromo.code} ({appliedPromo.discount_percentage}% OFF)
                  </p>
                )}
              </form>

              {/* Price Breakdown */}
              <div className="text-xs space-y-2 text-[#565148] pt-2 border-t border-[#DCD3C4]/60">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#141414]">
                    ৳{subtotal.toLocaleString()}
                  </span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Voucher Discount</span>
                    <span>-৳{discountAmount.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex items-start justify-between text-[11px] pt-1 border-t border-dashed border-[#E3DBD0]">
                  <div className="flex items-center gap-1.5 text-[#141414]">
                    <Truck className="w-3.5 h-3.5 text-[#C89B4A]" />
                    <span className="font-semibold">Delivery Charge:</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-[#141414] font-semibold">
                      ৳{chargeInside} (Inside) / ৳{chargeOutside} (Outside)
                    </span>
                    <span className="block text-[10px] text-[#8C8477]">
                      Select location at checkout
                    </span>
                  </div>
                </div>

                <div className="flex justify-between text-base font-bold text-[#141414] pt-2 border-t border-[#DCD3C4]">
                  <span>Items Total</span>
                  <span className="text-[#B8852B]">৳{estimatedSubtotalAfterDiscount.toLocaleString()}</span>
                </div>
              </div>

              {/* Proceed to Checkout CTA */}
              <button
                id="cart-checkout-btn"
                onClick={() => {
                  onClose();
                  if (onProceedToCheckout) {
                    onProceedToCheckout(appliedPromo || undefined);
                  } else if (onCheckout) {
                    onCheckout(appliedPromo || undefined);
                  }
                }}
                className="btn-lift w-full py-3.5 bg-[#101010] text-white text-xs sm:text-sm uppercase tracking-[0.14em] font-semibold hover:bg-[#D4A347] hover:text-[#101010] transition-all flex items-center justify-center gap-2 group shadow-[0_4px_16px_rgba(0,0,0,0.14)] rounded-lg cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-[#787165] uppercase tracking-wider pt-1">
                {settings.trust_badges.map((badge) => (
                  <span key={badge.id} className="inline-flex items-center gap-1">
                    <RenderTrustIcon name={badge.icon_name} className="w-3 h-3 text-[#C89B4A]" />
                    <span>{badge.label}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
