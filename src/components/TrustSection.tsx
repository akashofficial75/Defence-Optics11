import React from 'react';
import { useSiteSettings } from '../lib/useSiteSettings';
import { RenderTrustIcon } from './TrustIcon';

export const TrustSection: React.FC = () => {
  const { settings } = useSiteSettings();

  const fallbackDescriptions = [
    'Fast, reliable, and secure nationwide courier delivery across all 64 districts with Cash on Delivery.',
    'Guaranteed authentic craftsmanship with optical grade lenses and comprehensive 1-year coverage.',
    'Shop with complete confidence. 7-day hassle-free returns or exchanges if frame fit is not perfect.'
  ];

  return (
    <section className="w-full bg-[#FAF7F2] py-14 sm:py-18 lg:py-20 border-b border-[#E5DDCF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-14">
          <div className="flex items-center justify-center gap-3 mb-2.5">
            <span className="w-8 h-[2px] bg-[#D4A347]" />
            <span className="text-[11px] uppercase tracking-[0.28em] font-bold text-[#B8852B]">
              THE DEFENCE PROMISE
            </span>
            <span className="w-8 h-[2px] bg-[#D4A347]" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-black text-[#101010] uppercase tracking-tight">
            Why Choose Us
          </h2>
          <p className="text-xs sm:text-sm text-[#665F54] mt-2 font-sans font-medium">
            Dedicated craftsmanship and genuine care in every single frame we deliver.
          </p>
        </div>

        {/* 3-Column Trust Cards - Dynamic from Site Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7 lg:gap-8">
          {settings.trust_badges.map((badge, idx) => (
            <div
              key={badge.id || idx}
              id={`trust-card-${idx}`}
              className="card-lift bg-white border border-[#E2DAD0] p-8 sm:p-9 flex flex-col items-center text-center hover:border-[#D4A347] transition-all duration-300 group rounded-xl shadow-[0_8px_24px_rgba(16,16,16,0.06)] hover:shadow-[0_16px_36px_rgba(16,16,16,0.10)]"
            >
              {/* Gold-accented Icon Container */}
              <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-[#FAF5EC] border border-[#EADFCF] text-[#D4A347] group-hover:bg-[#101010] group-hover:text-[#D4A347] group-hover:border-[#101010] transition-colors duration-300 mb-5 shadow-xs">
                <RenderTrustIcon name={badge.icon_name} className="w-7 h-7 stroke-[2]" />
              </div>

              {/* Bold Serif Title */}
              <h3 className="font-serif font-bold text-lg sm:text-xl text-[#101010] tracking-tight mb-2.5">
                {badge.label}
              </h3>

              {/* Muted Sans-Serif Description */}
              <p className="text-xs sm:text-sm text-[#665F54] leading-relaxed font-sans font-normal">
                {badge.description || fallbackDescriptions[idx % fallbackDescriptions.length]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

