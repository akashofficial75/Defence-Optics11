import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Category } from '../types';
import heroAviator from '../assets/images/hero_aviator_stone_1789622571505.jpg';

interface CategoryStripProps {
  categories: Category[];
  onSelectCategory: (categorySlug: string) => void;
}

export const CategoryStrip: React.FC<CategoryStripProps> = ({
  categories = [],
  onSelectCategory
}) => {
  const safeCategories = categories || [];

  if (safeCategories.length === 0) {
    return null;
  }

  // Dynamic grid column class based on number of active categories
  const gridColsClass =
    safeCategories.length === 1
      ? 'grid-cols-1 max-w-xl mx-auto'
      : safeCategories.length === 2
      ? 'grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto'
      : safeCategories.length === 3
      ? 'grid-cols-1 md:grid-cols-3'
      : safeCategories.length === 4
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
      : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <section className="w-full bg-[#F6F2EB] py-12 sm:py-16 border-b border-[#E5DDCF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid ${gridColsClass} gap-6 sm:gap-7 lg:gap-8`}>
          {safeCategories.map((cat, idx) => {
            if (!cat) return null;

            const imgSrc = cat.image_url?.trim() || heroAviator;
            const tagline = cat.tagline?.trim() || cat.description?.trim() || 'Precision luxury eyewear crafted for visual excellence.';

            return (
              <div
                key={cat.id || cat.slug || idx}
                id={`cat-card-${cat.slug || idx}`}
                onClick={() => onSelectCategory(cat.slug)}
                className="card-lift relative group cursor-pointer overflow-hidden rounded-xl h-72 sm:h-80 lg:h-88 flex flex-col justify-between p-7 border border-[#2E2820] bg-[#101010] text-white shadow-[0_8px_24px_rgba(0,0,0,0.20)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.32)] hover:border-[#D4A347] transition-all duration-300"
              >
                {/* Background Lifestyle Product Image with smooth hover zoom */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-xl">
                  <img
                    src={imgSrc}
                    alt={cat.name}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = heroAviator;
                    }}
                    className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-106"
                  />
                  {/* Rich Dark Gradient Overlays: Fades from transparent at top/middle to deep charcoal/black (rgba(0,0,0,0.75-0.85)) at the bottom */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-[rgba(10,10,10,0.85)] via-[rgba(10,10,10,0.50)] to-transparent group-hover:via-[rgba(10,10,10,0.40)] transition-opacity duration-300"
                  />
                  <div
                    className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[rgba(8,8,8,0.85)] via-[rgba(8,8,8,0.50)] to-transparent pointer-events-none"
                  />
                </div>

                {/* Top Category Title & Subtext */}
                <div className="relative z-10">
                  <span className="text-[10px] tracking-[0.25em] font-sans font-bold uppercase block mb-1.5 text-[#D4A347]">
                    COLLECTION
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-black uppercase tracking-tight mb-2 text-white">
                    {cat.name}
                  </h3>
                  <p className="text-xs sm:text-sm font-sans font-medium leading-relaxed max-w-xs text-[#D0C9BD]">
                    {tagline}
                  </p>
                </div>

                {/* Bottom Arrow Link Indicator */}
                <div className="relative z-10 flex items-center pt-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center border-2 border-[#D4A347] text-[#D4A347] group-hover:bg-[#D4A347] group-hover:text-[#101010] transition-all duration-300 shadow-xs">
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                  <span className="ml-3 text-xs uppercase tracking-[0.2em] font-bold text-[#D4A347] opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-[-4px] group-hover:translate-x-0">
                    Explore {cat.name}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
