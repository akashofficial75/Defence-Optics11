import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, MessageCircle } from 'lucide-react';
import { Product, Category } from '../types';
import { ProductCard } from '../components/ProductCard';
import { useSiteSettings } from '../lib/useSiteSettings';
import { buildWhatsAppLink } from '../data/initialData';

interface CategorySectionProps {
  category: Category;
  products: Product[];
  onAddToCart: (product: Product) => void;
  onQuickView: (product: Product) => void;
  wishlist: string[];
  onToggleWishlist: (productId: string) => void;
  onFilterInShop: (categorySlug: string) => void;
  bgAlt?: boolean;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  products = [],
  onAddToCart,
  onQuickView,
  wishlist = [],
  onToggleWishlist,
  onFilterInShop,
  bgAlt = false
}) => {
  const { settings } = useSiteSettings();

  // Filter products belonging to this category live
  const categoryProducts = useMemo(() => {
    const slug = (category.slug || '').toLowerCase();
    const catId = (category.id || '').toLowerCase();
    const catName = (category.name || '').toLowerCase();

    return (products || []).filter((p) => {
      if (!p || !p.is_active) return false;

      const pCatId = (p.category_id || '').toLowerCase();
      const pCatSlug = (p.category_slug || '').toLowerCase();

      // Direct match
      if (pCatId === catId || pCatSlug === slug || pCatId === `cat-${slug}`) {
        return true;
      }

      // Name match
      if (catName && (pCatId === catName || pCatSlug === catName)) {
        return true;
      }

      // Semantic matching for female-glass
      if (slug === 'female-glass') {
        const gender = (p.gender || '').toLowerCase();
        if (gender === 'women' || (p.title || '').toLowerCase().includes('women') || (p.title || '').toLowerCase().includes('female')) {
          return true;
        }
      }

      // Semantic matching for akash-glass
      if (slug === 'akash-glass') {
        const title = (p.title || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        if (title.includes('akash') || desc.includes('akash') || p.is_featured) {
          return true;
        }
      }

      return false;
    });
  }, [category, products]);

  const sectionId = (category.slug || category.id || 'category').toLowerCase();
  const bgClass = bgAlt ? 'bg-[#EDE7DC]/70' : 'bg-[#F6F2EB]';

  return (
    <section
      id={sectionId}
      className={`scroll-mt-24 w-full py-16 sm:py-24 border-b border-[#E5DDCF] ${bgClass} transition-colors duration-300`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-12 gap-4 border-b border-[#E0D7C8] pb-6"
        >
          <div className="max-w-2xl">
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="w-8 h-[2.5px] bg-[#D4A347]" />
              <span className="text-[11px] uppercase tracking-[0.28em] font-bold text-[#B8852B] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#D4A347]" />
                {category.name.toUpperCase()} COLLECTION
              </span>
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl lg:text-[40px] font-black text-[#101010] uppercase tracking-tight leading-tight">
              {category.name}
            </h2>
            <p className="text-xs sm:text-sm text-[#554E44] mt-2 font-sans font-medium leading-relaxed">
              {category.tagline || category.description || 'Precision luxury eyewear crafted for optical excellence and enduring comfort.'}
            </p>
          </div>

          {/* Action Trigger: View in Catalog */}
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              id={`explore-cat-${sectionId}-btn`}
              onClick={() => onFilterInShop(category.slug)}
              className="btn-lift inline-flex items-center gap-2 px-5 py-2.5 border-2 border-[#101010] bg-transparent text-[#101010] text-xs uppercase tracking-[0.14em] font-bold hover:bg-[#101010] hover:text-white transition-all shadow-xs rounded-lg cursor-pointer group"
            >
              <span>Explore All {category.name}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
          </div>
        </motion.div>

        {/* Product Grid or Elegant Empty Fallback */}
        {categoryProducts.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6"
          >
            {categoryProducts.map((product) => (
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
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white border border-[#DDD5C7] rounded-xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs"
          >
            <div className="w-12 h-12 mx-auto rounded-full bg-[#141414] text-[#D4A347] flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#101010] uppercase mb-2">
              New {category.name} Arriving Soon
            </h3>
            <p className="text-xs sm:text-sm text-[#615B51] mb-6 leading-relaxed">
              Our optical artisans are currently handcrafting the latest batch of {category.name.toLowerCase()} frames. In the meantime, explore our active collections in the catalog or consult directly with our optical concierge.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => onFilterInShop('all')}
                className="px-6 py-2.5 bg-[#141414] text-white text-xs uppercase tracking-wider font-bold hover:bg-[#D4A347] hover:text-[#101010] transition-colors rounded-lg"
              >
                Browse All Frames
              </button>
              <a
                href={buildWhatsAppLink(
                  settings.whatsapp,
                  `Hello Defence Optics Concierge, I would like to inquire about the ${category.name} collection.`
                )}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-[#25D366] text-[#128C7E] text-xs uppercase tracking-wider font-bold hover:bg-[#25D366] hover:text-white transition-colors rounded-lg"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Inquire on WhatsApp</span>
              </a>
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
};
