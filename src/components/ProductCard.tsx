import React, { useState } from 'react';
import { Heart, ShoppingBag, Eye, Check } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onQuickView: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: (productId: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onQuickView,
  isWishlisted = false,
  onToggleWishlist
}) => {
  const [added, setAdded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const hasDiscount = Boolean(product.discount_price && product.discount_price < product.price);
  const discountPercent = hasDiscount
    ? Math.round(((product.price - (product.discount_price as number)) / product.price) * 100)
    : 0;

  const currentPrice = hasDiscount ? (product.discount_price as number) : product.price;
  const isOutOfStock = product.stock_quantity <= 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleWishlist) {
      onToggleWishlist(product.id);
    }
  };

  return (
    <div
      id={`product-card-${product.id}`}
      onClick={() => onQuickView(product)}
      className="card-lift group relative bg-[#FFFFFF] border border-[#E0D7CB] flex flex-col justify-between cursor-pointer rounded-xl overflow-hidden shadow-[0_8px_24px_rgba(16,16,16,0.06)] hover:border-[#D4A347]"
    >
      {/* Top Media Area with Badges and Subtle Reflection Shadow */}
      <div className="relative w-full aspect-[4/3] sm:aspect-square bg-gradient-to-b from-[#FCFAF7] to-[#F4EFE7] overflow-hidden flex items-center justify-center p-5">
        {/* Discount Badge (Top Left) in vibrant gold/amber */}
        {hasDiscount && !isOutOfStock && (
          <div className="absolute top-3 left-3 z-10 bg-[#D4A347] text-[#101010] text-[10px] sm:text-[11px] font-black tracking-wider px-2 py-0.5 shadow-xs uppercase font-sans rounded-md">
            -{discountPercent}%
          </div>
        )}

        {/* Out of Stock Badge */}
        {isOutOfStock && (
          <div className="absolute top-3 left-3 z-10 bg-[#252525] text-white text-[10px] font-bold tracking-wider px-2 py-0.5 uppercase rounded-md">
            Sold Out
          </div>
        )}

        {/* Wishlist Heart Icon (Top Right) */}
        <button
          id={`wishlist-btn-${product.id}`}
          onClick={handleWishlist}
          aria-label="Add to Wishlist"
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-xs text-[#101010] hover:text-[#D4A347] hover:bg-white transition-all shadow-xs border border-[#E2DAD0] rounded-lg cursor-pointer"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-[#D4A347] text-[#D4A347]' : 'text-[#655E54]'
            }`}
          />
        </button>

        {/* Product Image with smooth hover scale and shadow */}
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src={product.images[imageIndex] || product.images[0]}
            alt={product.name}
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=80';
            }}
            className={`w-full h-full object-contain object-center transition-transform duration-500 ease-out group-hover:scale-106 drop-shadow-sm ${
              isOutOfStock ? 'opacity-50 grayscale' : ''
            }`}
            loading="lazy"
          />
          {/* Subtle soft contact shadow beneath product */}
          <div className="absolute bottom-1 w-2/3 h-2 bg-black/8 rounded-full blur-xs pointer-events-none -z-10 group-hover:scale-110 transition-transform duration-500" />
        </div>

        {/* Quick View Hover Button */}
        <div className="absolute inset-x-3 bottom-3 z-10 opacity-0 group-hover:opacity-100 transition-all duration-250 translate-y-1 group-hover:translate-y-0 hidden sm:flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickView(product);
            }}
            className="flex-1 py-2 bg-[#101010]/95 backdrop-blur-xs text-white text-[11px] uppercase tracking-wider font-bold border border-white/20 hover:bg-[#D4A347] hover:text-[#101010] transition-colors flex items-center justify-center gap-1.5 shadow-md rounded-lg cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" /> Quick View
          </button>
        </div>
      </div>

      {/* Card Info Area */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow justify-between border-t border-[#EDE5DA] bg-white">
        <div>
          {/* Subtle Category & Gender Label */}
          <div className="flex items-center justify-between text-[11px] text-[#7A7368] uppercase tracking-wider mb-1.5 font-sans font-semibold">
            <span>{product.gender || 'Eyewear'}</span>
            {product.frame_shape && <span>{product.frame_shape}</span>}
          </div>

          {/* Product Name - High contrast serif */}
          <h4 className="font-serif text-[15px] sm:text-base font-bold text-[#101010] group-hover:text-[#B8852B] transition-colors line-clamp-1 mb-2">
            {product.name}
          </h4>
        </div>

        {/* Pricing & Add to Cart Footer */}
        <div className="pt-2.5 border-t border-[#F0EAE0] flex items-center justify-between mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="font-sans font-extrabold text-base text-[#101010]">
              ৳{currentPrice.toLocaleString()}
            </span>
            {hasDiscount && (
              <span className="font-sans text-xs text-[#8F897F] line-through font-medium">
                ৳{product.price.toLocaleString()}
              </span>
            )}
          </div>

          <button
            id={`add-cart-btn-${product.id}`}
            onClick={handleAdd}
            disabled={isOutOfStock}
            aria-label={`Add ${product.name} to cart`}
            className={`btn-lift px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs rounded-lg cursor-pointer ${
              isOutOfStock
                ? 'bg-[#E5DFD4] text-[#8F887C] cursor-not-allowed'
                : added
                ? 'bg-[#2E7D32] text-white'
                : 'bg-[#101010] text-white hover:bg-[#D4A347] hover:text-[#101010]'
            }`}
          >
            {added ? (
              <>
                <Check className="w-3 h-3" /> Added
              </>
            ) : isOutOfStock ? (
              'Sold Out'
            ) : (
              <>
                <ShoppingBag className="w-3 h-3" /> Add
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
