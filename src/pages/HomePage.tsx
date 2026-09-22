import React, { useRef, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Product, Category } from '../types';
import { Hero } from '../components/Hero';
import { CategoryStrip } from '../components/CategoryStrip';
import { ProductCard } from '../components/ProductCard';
import { TrustSection } from '../components/TrustSection';
import { Newsletter } from '../components/Newsletter';

interface HomePageProps {
  products: Product[];
  categories: Category[];
  onNavigate: (page: string, categorySlug?: string) => void;
  onAddToCart: (product: Product) => void;
  onQuickView: (product: Product) => void;
  wishlist: string[];
  onToggleWishlist: (productId: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  products = [],
  categories = [],
  onNavigate,
  onAddToCart,
  onQuickView,
  wishlist = [],
  onToggleWishlist
}) => {
  const bestSellersRef = useRef<HTMLDivElement>(null);

  const handleScrollToFeatured = () => {
    bestSellersRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const safeProducts = products || [];

  // Active storefront products
  const activeProducts = useMemo(() => {
    return safeProducts.filter((p) => p && p.is_active);
  }, [safeProducts]);

  // Curate display products: featured first, then latest added active products (up to 8)
  const displayProducts = useMemo(() => {
    const featured = activeProducts.filter((p) => p.is_featured);
    const nonFeatured = activeProducts.filter((p) => !p.is_featured);
    const combined = [...featured, ...nonFeatured];
    return combined.slice(0, 8);
  }, [activeProducts]);

  return (
    <section id="home" className="scroll-mt-24 w-full">
      {/* Hero Section */}
      <Hero
        onShopNow={() => onNavigate('shop')}
        onExploreCollection={() => onNavigate('shop')}
        onScrollDown={handleScrollToFeatured}
      />

      {/* Category Strip (3 side-by-side cards: Eyeglasses / Sunglasses / Frames) */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <CategoryStrip
          categories={categories}
          onSelectCategory={(slug) => onNavigate('category', slug)}
        />
      </motion.div>

      {/* Why Choose Us Trust Section (3-column row with gold-accented icons) */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <TrustSection />
      </motion.div>

      {/* Best Sellers Section */}
      <section ref={bestSellersRef} className="w-full bg-[#F6F2EB] py-16 sm:py-24 border-b border-[#E5DDCF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14 gap-4"
          >
            <div>
              {/* Gold Label */}
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="w-8 h-[2.5px] bg-[#D4A347]" />
                <span className="text-[11px] uppercase tracking-[0.28em] font-bold text-[#B8852B]">
                  FEATURED CURATION
                </span>
              </div>
              <h2 className="font-serif text-3xl sm:text-4xl lg:text-[42px] font-black text-[#101010] uppercase tracking-tight">
                Our Best Sellers
              </h2>
              <p className="text-xs sm:text-sm text-[#554E44] mt-1.5 font-sans font-medium">
                Handcrafted frames and precision lenses, loved by our clientele.
              </p>
            </div>

            {/* View All Products Button */}
            <button
              id="view-all-products-btn"
              onClick={() => onNavigate('shop')}
              className="btn-lift inline-flex items-center gap-2 px-6 py-3 border-2 border-[#101010] bg-transparent text-[#101010] text-xs uppercase tracking-[0.14em] font-bold hover:bg-[#101010] hover:text-white transition-all self-start sm:self-auto group cursor-pointer shadow-xs rounded-lg"
            >
              <span>View All Products</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </motion.div>

          {/* Product Grid */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6"
          >
            {displayProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToCart={onAddToCart}
                onQuickView={onQuickView}
                isWishlisted={wishlist.includes(product.id)}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </motion.div>

        </div>
      </section>
    </section>
  );
};
