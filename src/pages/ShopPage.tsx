import React, { useState, useMemo } from 'react';
import { Filter, SlidersHorizontal, X, ChevronRight, RotateCcw } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';

interface ShopPageProps {
  products: Product[];
  categories: Category[];
  activeCategorySlug?: string;
  onNavigate: (page: string, categorySlug?: string) => void;
  onAddToCart: (product: Product) => void;
  onQuickView: (product: Product) => void;
  wishlist: string[];
  onToggleWishlist: (productId: string) => void;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  products = [],
  categories = [],
  activeCategorySlug,
  onNavigate,
  onAddToCart,
  onQuickView,
  wishlist = [],
  onToggleWishlist
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(activeCategorySlug || 'all');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [maxPrice, setMaxPrice] = useState<number>(5500);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [selectedShape, setSelectedShape] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync category if activeCategorySlug changes
  React.useEffect(() => {
    setSelectedCategory(activeCategorySlug || 'all');
  }, [activeCategorySlug]);

  const safeCategories = categories || [];
  const safeProducts = products || [];

  const activeCategoryObj = safeCategories.find((c) => c.slug === selectedCategory);

  // Extract unique shapes
  const allShapes = useMemo(() => {
    const shapes = new Set<string>();
    safeProducts.forEach((p) => {
      if (p?.frame_shape) shapes.add(p.frame_shape);
    });
    return Array.from(shapes);
  }, [safeProducts]);

  // Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return safeProducts.filter((p) => {
      if (!p || !p.is_active) return false;

      // Category filter
      if (selectedCategory !== 'all') {
        const catObj = categories.find((c) => c.slug === selectedCategory);
        const matchesId = catObj ? p.category_id === catObj.id : false;
        const matchesSlug = p.category_slug === selectedCategory;
        if (!matchesId && !matchesSlug) {
          return false;
        }
      }

      // Price filter
      const effectivePrice = p.discount_price || p.price;
      if (effectivePrice > maxPrice) return false;

      // In-stock filter
      if (inStockOnly && p.stock_quantity <= 0) return false;

      // Shape filter
      if (selectedShape !== 'all' && p.frame_shape !== selectedShape) return false;

      // Gender filter
      if (selectedGender !== 'all' && p.gender !== selectedGender) return false;

      return true;
    }).sort((a, b) => {
      const priceA = a.discount_price || a.price;
      const priceB = b.discount_price || b.price;

      if (sortBy === 'price-asc') return priceA - priceB;
      if (sortBy === 'price-desc') return priceB - priceA;
      if (sortBy === 'newest') {
        return new Date(b.created_at || '').getTime() - new Date(a.created_at || '').getTime();
      }
      if (sortBy === 'discount') {
        const discA = a.discount_price ? (a.price - a.discount_price) / a.price : 0;
        const discB = b.discount_price ? (b.price - b.discount_price) / b.price : 0;
        return discB - discA;
      }
      // default: featured
      return (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0);
    });
  }, [products, categories, selectedCategory, maxPrice, inStockOnly, selectedShape, selectedGender, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setMaxPrice(5500);
    setInStockOnly(false);
    setSelectedShape('all');
    setSelectedGender('all');
    setSortBy('featured');
  };

  const hasActiveFilters =
    selectedCategory !== 'all' ||
    maxPrice < 5500 ||
    inStockOnly ||
    selectedShape !== 'all' ||
    selectedGender !== 'all';

  return (
    <section id="shop" className="scroll-mt-24 w-full bg-[#F5F1EA] py-12 sm:py-16 border-b border-[#E7DFD0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs text-[#7A746B] uppercase tracking-wider mb-4 font-medium">
          <button onClick={() => onNavigate('home')} className="hover:text-[#141414]">
            Home
          </button>
          <ChevronRight className="w-3.5 h-3.5" />
          <button onClick={() => setSelectedCategory('all')} className="hover:text-[#141414]">
            Shop
          </button>
          {activeCategoryObj && (
            <>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="text-[#141414] font-semibold">{activeCategoryObj.name}</span>
            </>
          )}
        </div>

        {/* Page Banner Title */}
        <div className="mb-8 border-b border-[#E3DBD0] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-6 h-[2px] bg-[#C89B4A]" />
              <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#A87D33]">
                {activeCategoryObj ? `${activeCategoryObj.name.toUpperCase()} COLLECTION` : 'DEFENCE OPTICS CATALOG'}
              </span>
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold uppercase text-[#141414] tracking-tight">
              {activeCategoryObj ? activeCategoryObj.name : 'All Eyewear Collections'}
            </h1>
            <p className="text-xs sm:text-sm text-[#615B52] mt-1 max-w-xl">
              {activeCategoryObj?.description ||
                'Explore hand-finished optical spectacles, polarized sunglasses, and custom lens-compatible frames designed for lifelong clarity.'}
            </p>
          </div>

          {/* Controls: Mobile Filter Trigger & Sort Dropdown */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden px-4 py-2.5 bg-white border border-[#D5CEC2] text-xs font-semibold uppercase tracking-wider text-[#141414] flex items-center gap-2"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#C89B4A]" /> Filters
            </button>

            <div className="flex items-center gap-2 bg-white border border-[#D5CEC2] px-3 py-2 text-xs">
              <span className="text-[#7A746B] uppercase tracking-wider font-medium text-[10px]">
                Sort By:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent text-[#141414] font-semibold focus:outline-hidden cursor-pointer"
              >
                <option value="featured">Featured First</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
                <option value="discount">Highest Discount</option>
              </select>
            </div>
          </div>
        </div>

        {/* Layout: Sidebar + Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* Desktop Filter Sidebar (3 cols) */}
          <aside className="hidden md:block md:col-span-3 space-y-6">
            <div className="bg-white border border-[#E3DBD0] p-6 space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0EBE1]">
                <h3 className="font-serif font-bold text-sm uppercase tracking-wider text-[#141414] flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[#C89B4A]" /> Filter Products
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="text-[11px] text-[#A87D33] hover:underline flex items-center gap-1 font-medium"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>

              {/* 1. Category Filter */}
              <div>
                <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#141414] mb-2.5">
                  Category
                </h4>
                <div className="space-y-1.5 text-xs">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`w-full text-left px-2.5 py-1.5 transition-colors flex items-center justify-between ${
                      selectedCategory === 'all'
                        ? 'bg-[#141414] text-white font-semibold'
                        : 'text-[#4A453D] hover:bg-[#F5F1EA]'
                    }`}
                  >
                    <span>All Eyewear</span>
                    <span className="text-[10px] opacity-75">{products.length}</span>
                  </button>
                  {categories.map((cat) => {
                    const count = products.filter(
                      (p) => p.category_id === cat.id || p.category_slug === cat.slug
                    ).length;
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.slug)}
                        className={`w-full text-left px-2.5 py-1.5 transition-colors flex items-center justify-between ${
                          selectedCategory === cat.slug
                            ? 'bg-[#141414] text-white font-semibold'
                            : 'text-[#4A453D] hover:bg-[#F5F1EA]'
                        }`}
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] opacity-75">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Price Range Slider */}
              <div className="pt-4 border-t border-[#F0EBE1]">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#141414]">
                    Max Price
                  </h4>
                  <span className="font-mono text-xs font-bold text-[#C89B4A]">
                    ৳{maxPrice.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={2000}
                  max={5500}
                  step={100}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full accent-[#C89B4A] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#7A746B] mt-1">
                  <span>৳2,000</span>
                  <span>৳5,500</span>
                </div>
              </div>

              {/* 3. In Stock Only Toggle */}
              <div className="pt-4 border-t border-[#F0EBE1] flex items-center justify-between">
                <label
                  htmlFor="in-stock-toggle"
                  className="text-xs text-[#141414] font-semibold cursor-pointer"
                >
                  In-Stock Only
                </label>
                <input
                  type="checkbox"
                  id="in-stock-toggle"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="w-4 h-4 accent-[#C89B4A] cursor-pointer"
                />
              </div>

              {/* 4. Frame Shape */}
              {allShapes.length > 0 && (
                <div className="pt-4 border-t border-[#F0EBE1]">
                  <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#141414] mb-2">
                    Frame Silhouette
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setSelectedShape('all')}
                      className={`px-2.5 py-1 text-[11px] border transition-colors ${
                        selectedShape === 'all'
                          ? 'border-[#141414] bg-[#141414] text-white'
                          : 'border-[#D5CEC2] bg-[#FAF8F5] text-[#4A453D] hover:border-[#141414]'
                      }`}
                    >
                      All
                    </button>
                    {allShapes.map((shape) => (
                      <button
                        key={shape}
                        onClick={() => setSelectedShape(shape)}
                        className={`px-2.5 py-1 text-[11px] border transition-colors ${
                          selectedShape === shape
                            ? 'border-[#141414] bg-[#141414] text-white'
                            : 'border-[#D5CEC2] bg-[#FAF8F5] text-[#4A453D] hover:border-[#141414]'
                        }`}
                      >
                        {shape}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. Gender Filter */}
              <div className="pt-4 border-t border-[#F0EBE1]">
                <h4 className="text-[11px] uppercase tracking-wider font-bold text-[#141414] mb-2">
                  Target Fit
                </h4>
                <div className="grid grid-cols-3 gap-1 text-xs">
                  {['all', 'Unisex', 'Men', 'Women'].map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelectedGender(g)}
                      className={`py-1 text-[11px] border capitalize transition-colors ${
                        selectedGender === g
                          ? 'border-[#141414] bg-[#141414] text-white'
                          : 'border-[#D5CEC2] bg-[#FAF8F5] text-[#4A453D] hover:border-[#141414]'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Product Grid Area (9 cols) */}
          <main className="md:col-span-9">
            {/* Active Filter Chips */}
            {hasActiveFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
                <span className="text-[11px] uppercase tracking-wider text-[#7A746B] font-medium">
                  Active Filters:
                </span>
                {selectedCategory !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-white border border-[#D5CEC2] px-2.5 py-1">
                    Category: {categories.find((c) => c.slug === selectedCategory)?.name || selectedCategory}
                    <button onClick={() => setSelectedCategory('all')}>
                      <X className="w-3 h-3 text-[#7A746B] hover:text-black" />
                    </button>
                  </span>
                )}
                {maxPrice < 5500 && (
                  <span className="inline-flex items-center gap-1 bg-white border border-[#D5CEC2] px-2.5 py-1">
                    Under ৳{maxPrice.toLocaleString()}
                    <button onClick={() => setMaxPrice(5500)}>
                      <X className="w-3 h-3 text-[#7A746B] hover:text-black" />
                    </button>
                  </span>
                )}
                {inStockOnly && (
                  <span className="inline-flex items-center gap-1 bg-white border border-[#D5CEC2] px-2.5 py-1">
                    In-Stock Only
                    <button onClick={() => setInStockOnly(false)}>
                      <X className="w-3 h-3 text-[#7A746B] hover:text-black" />
                    </button>
                  </span>
                )}
                {selectedShape !== 'all' && (
                  <span className="inline-flex items-center gap-1 bg-white border border-[#D5CEC2] px-2.5 py-1">
                    Shape: {selectedShape}
                    <button onClick={() => setSelectedShape('all')}>
                      <X className="w-3 h-3 text-[#7A746B] hover:text-black" />
                    </button>
                  </span>
                )}
                <button
                  onClick={resetFilters}
                  className="text-xs text-[#A87D33] hover:underline font-semibold ml-2"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Results Counter */}
            <div className="flex items-center justify-between mb-4 text-xs text-[#7A746B]">
              <span>
                Showing <strong>{filteredProducts.length}</strong> optical styles
              </span>
            </div>

            {/* Product Cards Grid */}
            {filteredProducts.length === 0 ? (
              <div className="bg-white border border-[#E3DBD0] p-12 text-center my-6">
                <p className="font-serif text-lg font-bold text-[#141414] mb-2">
                  No Eyewear Found Matching Criteria
                </p>
                <p className="text-xs text-[#6B655C] max-w-sm mx-auto mb-6">
                  Try widening your price range, clearing shape filters, or browsing all categories.
                </p>
                <button
                  onClick={resetFilters}
                  className="px-6 py-2.5 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#C89B4A]"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    onQuickView={onQuickView}
                    isWishlisted={wishlist.includes(product.id)}
                    onToggleWishlist={onToggleWishlist}
                  />
                ))}
              </div>
            )}
          </main>

        </div>
      </div>

      {/* Mobile Filters Slide-over Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => setMobileFilterOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xs bg-white p-6 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D5]">
                  <h3 className="font-serif font-bold text-base uppercase text-[#141414]">
                    Filter Eyewear
                  </h3>
                  <button onClick={() => setMobileFilterOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Categories */}
                <div>
                  <h4 className="text-xs uppercase font-bold text-[#141414] mb-2">Category</h4>
                  <div className="space-y-1 text-xs">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`block w-full text-left py-1.5 px-2 ${
                        selectedCategory === 'all' ? 'bg-[#141414] text-white font-bold' : ''
                      }`}
                    >
                      All Eyewear
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCategory(c.slug)}
                        className={`block w-full text-left py-1.5 px-2 ${
                          selectedCategory === c.slug ? 'bg-[#141414] text-white font-bold' : ''
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Price */}
                <div>
                  <h4 className="text-xs uppercase font-bold text-[#141414] mb-1">
                    Max Price: ৳{maxPrice.toLocaleString()}
                  </h4>
                  <input
                    type="range"
                    min={2000}
                    max={5500}
                    step={100}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full accent-[#C89B4A]"
                  />
                </div>

                {/* Mobile In Stock */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">In Stock Only</span>
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="w-4 h-4 accent-[#C89B4A]"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-[#E8E2D5] space-y-2">
                <button
                  onClick={() => setMobileFilterOpen(false)}
                  className="w-full py-3 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold"
                >
                  Apply Filters ({filteredProducts.length})
                </button>
                <button
                  onClick={resetFilters}
                  className="w-full py-2 bg-transparent text-[#7A746B] text-xs uppercase tracking-wider hover:text-black"
                >
                  Reset All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
