import React from 'react';
import { Eye, Shield, Award, Compass, Sparkles } from 'lucide-react';
import { STORE_CONTACTS } from '../data/initialData';

interface AboutPageProps {
  onShopNow: () => void;
}

export const AboutPage: React.FC<AboutPageProps> = ({ onShopNow }) => {
  return (
    <section id="about" className="scroll-mt-24 w-full bg-[#F5F1EA] py-16 sm:py-24 border-b border-[#E5DDCF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="w-6 h-[2px] bg-[#C89B4A]" />
            <span className="text-[11px] uppercase tracking-[0.25em] font-semibold text-[#A87D33]">
              OUR HERITAGE & VISION
            </span>
            <span className="w-6 h-[2px] bg-[#C89B4A]" />
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold uppercase text-[#141414] tracking-tight leading-tight">
            See Better. Look Better.
          </h1>
          <p className="text-base text-[#595349] mt-4 leading-relaxed">
            Defence Optics was founded with a singular, unyielding obsession: to fuse certified ophthalmic precision with uncompromising aesthetic luxury. Eyewear should never be merely a corrective medical necessity — it is your most intimate personal signature.
          </p>
        </div>

        {/* Split Editorial Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="relative aspect-[4/3] overflow-hidden border border-[#DCD3C4] shadow-md bg-white">
            <img
              src="https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=1200&q=80"
              alt="Artisan assembling handcrafted acetate eyeglasses"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-4 left-4 bg-[#141414]/90 text-[#F5F1EA] p-3 text-xs uppercase tracking-wider font-sans border border-white/10">
              Mazzucchelli Bio-Acetate &bull; Hand-Beveled Temples
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#141414] uppercase">
              The Architecture of Comfort
            </h2>
            <p className="text-sm text-[#575249] leading-relaxed">
              Every frame in our collection undergoes over 40 individual manufacturing steps. From tumbling raw organic cellulose acetate for 72 hours in German beechwood barrels to laser-etching tension-free beta-titanium bridges, we obsess over fractions of a millimeter.
            </p>
            <p className="text-sm text-[#575249] leading-relaxed">
              Whether you require high-index progressive optical lenses, zero-power anti-blue computer shields, or Category 3 polarized sun tinting, our in-house optical laboratory ensures every focal point is calibrated to the wearer&apos;s pupillary distance with sub-millimeter accuracy.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E3DBD0]">
              <div>
                <div className="font-serif text-2xl font-bold text-[#141414]">100%</div>
                <div className="text-xs text-[#7A746B] uppercase tracking-wider mt-0.5">
                  UV400 & Polarized Tested
                </div>
              </div>
              <div>
                <div className="font-serif text-2xl font-bold text-[#141414]">40+</div>
                <div className="text-xs text-[#7A746B] uppercase tracking-wider mt-0.5">
                  Hand-Finishing Stages
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Core Pillars */}
        <div className="bg-[#EDE7DC] border border-[#DDD5C7] p-8 sm:p-12">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#141414] uppercase">
              The Three Pillars of Defence
            </h3>
            <p className="text-xs sm:text-sm text-[#615B51] mt-1">
              What sets our frames and lenses apart from mass-produced retail spectacles.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 border border-[#DDD5C7] space-y-3">
              <div className="w-10 h-10 bg-[#141414] text-[#C89B4A] flex items-center justify-center">
                <Shield className="w-5 h-5 stroke-[1.75]" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#141414] uppercase">
                Ocular Defense
              </h4>
              <p className="text-xs text-[#595349] leading-relaxed">
                Multi-layer anti-reflective, hydrophobic, and anti-static coatings safeguard your eyesight from digital glare, harmful UV rays, and environmental dust.
              </p>
            </div>

            <div className="bg-white p-6 border border-[#DDD5C7] space-y-3">
              <div className="w-10 h-10 bg-[#141414] text-[#C89B4A] flex items-center justify-center">
                <Sparkles className="w-5 h-5 stroke-[1.75]" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#141414] uppercase">
                Artisanal Materials
              </h4>
              <p className="text-xs text-[#595349] leading-relaxed">
                We reject cheap injected plastics. Our collections are carved from pure renewable cellulose acetate and aerospace-grade Japanese titanium alloys.
              </p>
            </div>

            <div className="bg-white p-6 border border-[#DDD5C7] space-y-3">
              <div className="w-10 h-10 bg-[#141414] text-[#C89B4A] flex items-center justify-center">
                <Award className="w-5 h-5 stroke-[1.75]" />
              </div>
              <h4 className="font-serif font-bold text-base text-[#141414] uppercase">
                Lifetime Commitment
              </h4>
              <p className="text-xs text-[#595349] leading-relaxed">
                Complimentary frame tune-ups, screw tightening, ultrasonic deep cleans, and nose-pad replacements are always free at our showroom.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-8">
          <button
            onClick={onShopNow}
            className="px-8 py-3.5 bg-[#141414] text-white text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#C89B4A] hover:text-[#141414] transition-all"
          >
            Explore The Collection
          </button>
        </div>

      </div>
    </section>
  );
};
