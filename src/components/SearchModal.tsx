import React, { useState, useMemo } from 'react';
import { Search, X, ShoppingBag, ArrowRight } from 'lucide-react';
import { Product } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onSelectProduct: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  products,
  onSelectProduct
}) => {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.category_slug?.toLowerCase().includes(q) ||
        p.frame_shape?.toLowerCase().includes(q) ||
        p.frame_material?.toLowerCase().includes(q)
    );
  }, [query, products]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24 animate-fadeIn">
      <div
        className="relative bg-[#F5F1EA] w-full max-w-2xl shadow-2xl border border-[#DCD3C4] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative p-4 sm:p-6 bg-[#141414] text-white flex items-center border-b border-[#2A2A2A]">
          <Search className="w-5 h-5 text-[#C89B4A] mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Search eyeglasses, sunglasses, frames, shapes (e.g. Aviator, Noir, Titanium)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-white text-sm sm:text-base placeholder:text-[#7A746B] focus:outline-hidden"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-[#8A8377] hover:text-white mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 text-[#C4BCB0] hover:text-[#C89B4A] transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-5 py-2.5 bg-[#EAE4D7] border-b border-[#D8CFC0] flex items-center gap-2 overflow-x-auto text-[11px] text-[#615B52]">
          <span className="uppercase tracking-wider font-semibold text-[#141414]">Popular:</span>
          {['Clubmaster', 'Aviator', 'Titanium', 'Ghost Crystal', 'Acetate', 'Wayfarer'].map((term) => (
            <button
              key={term}
              onClick={() => setQuery(term)}
              className="px-2.5 py-0.5 bg-white border border-[#D5CEC2] hover:border-[#C89B4A] hover:text-[#141414] transition-colors"
            >
              {term}
            </button>
          ))}
        </div>

        {/* Results Area */}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6 divide-y divide-[#E5DFD4]">
          {query.trim() === '' ? (
            <div className="text-center py-10 text-xs text-[#706A61]">
              <Search className="w-8 h-8 text-[#A8A196] mx-auto mb-2 stroke-[1.5]" />
              Type to search through our catalog of handcrafted optical pieces.
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#706A61]">
              No eyewear models match &ldquo;{query}&rdquo;. Try another shape or category.
            </div>
          ) : (
            filtered.map((product) => {
              const currentPrice = product.discount_price || product.price;
              return (
                <div
                  key={product.id}
                  onClick={() => {
                    onSelectProduct(product);
                    onClose();
                  }}
                  className="py-3 flex items-center justify-between group cursor-pointer hover:bg-white/60 px-3 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-14 h-14 object-contain bg-white border border-[#E3DBD0] p-1"
                    />
                    <div>
                      <div className="text-[10px] text-[#8C8478] uppercase tracking-wider">
                        {product.category_slug} &bull; {product.frame_shape}
                      </div>
                      <h4 className="font-serif font-bold text-sm text-[#141414] group-hover:text-[#A87D33] transition-colors">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs font-semibold text-[#141414] mt-0.5">
                        <span>৳{currentPrice.toLocaleString()}</span>
                        {product.discount_price && (
                          <span className="text-[11px] text-[#918A7E] line-through font-normal">
                            ৳{product.price.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#141414] font-medium group-hover:text-[#A87D33]">
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
