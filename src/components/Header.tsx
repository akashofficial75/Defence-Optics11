import React, { useState } from 'react';
import { Search, ShoppingBag, Menu, X, Glasses, Heart } from 'lucide-react';
import { CartItem, Category } from '../types';

interface HeaderProps {
  currentPage?: string;
  activeSection?: string;
  onNavigate?: (page: string, categorySlug?: string) => void;
  onScrollToSection: (sectionId: string) => void;
  cartItems?: CartItem[];
  cartCount?: number;
  wishlistCount?: number;
  categories?: Category[];
  currentCategorySlug?: string;
  onOpenCart: () => void;
  onOpenSearch: () => void;
  onOpenWishlist?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentPage: _currentPage,
  activeSection = 'home',
  onNavigate: _onNavigate,
  onScrollToSection,
  cartItems,
  cartCount,
  wishlistCount = 0,
  categories = [],
  currentCategorySlug: _currentCategorySlug,
  onOpenCart,
  onOpenSearch,
  onOpenWishlist
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const totalCartCount =
    typeof cartCount === 'number'
      ? cartCount
      : (cartItems || []).reduce((sum, item) => sum + (item?.quantity || 0), 0);

  interface NavItem {
    label: string;
    targetId: string;
  }

  // Use live categories only - no hardcoded fallback
  const allCategories = categories || [];

  const categoryNavItems: NavItem[] = allCategories.map((cat) => ({
    label: cat.name,
    targetId: (cat.slug || cat.id).toLowerCase()
  }));

  const navLinks: NavItem[] = [
    { label: 'Home', targetId: 'home' },
    { label: 'Shop', targetId: 'shop' },
    ...categoryNavItems,
    { label: 'About', targetId: 'about' },
    { label: 'Contact', targetId: 'contact' }
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#141414] text-white shadow-md border-b border-[#262626]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Wordmark */}
          <div
            id="brand-logo-button"
            onClick={() => onScrollToSection('home')}
            className="flex items-center gap-3.5 cursor-pointer group py-2"
          >
            {/* Minimalist Glasses Icon Mark */}
            <div className="w-10 h-10 rounded-lg border-2 border-[#D4A347]/70 flex items-center justify-center bg-[#181818] group-hover:border-[#D4A347] group-hover:bg-[#202020] transition-all shadow-xs">
              <Glasses className="w-6 h-6 text-[#D4A347] stroke-[2]" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center tracking-[0.06em] font-serif text-xl sm:text-2xl font-black uppercase leading-none">
                <span className="text-white">DEFENCE</span>
                <span className="text-[#D4A347] ml-1.5 font-black">OPTICS</span>
              </div>
              <span className="text-[9px] tracking-[0.24em] text-[#B5ADA0] uppercase font-sans font-bold mt-1">
                PROTECTING YOUR VISION IN STYLE
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center space-x-5 xl:space-x-7">
            {navLinks.map((link) => {
              const isActive = activeSection === link.targetId;

              return (
                <button
                  key={link.targetId}
                  id={`nav-${link.targetId}`}
                  onClick={() => {
                    onScrollToSection(link.targetId);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-[13px] tracking-[0.05em] font-medium transition-colors relative py-2 cursor-pointer whitespace-nowrap ${
                    isActive ? 'text-white font-semibold' : 'text-[#B8B2A7] hover:text-[#C89B4A]'
                  }`}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-[#C89B4A] transition-all" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons */}
          <div className="flex items-center space-x-5 sm:space-x-6">
            {/* Search Trigger */}
            <button
              id="header-search-btn"
              onClick={onOpenSearch}
              aria-label="Search Eyewear"
              className="text-[#E0D8CC] hover:text-[#D4A347] transition-colors p-1.5"
            >
              <Search className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Wishlist Trigger */}
            {onOpenWishlist && (
              <button
                id="header-wishlist-btn"
                onClick={onOpenWishlist}
                aria-label="View Saved Wishlist"
                className="relative text-[#E0D8CC] hover:text-[#D4A347] transition-colors p-1.5"
              >
                <Heart className="w-5 h-5 stroke-[2]" />
                {wishlistCount > 0 && (
                  <span
                    id="wishlist-badge-count"
                    className="absolute -top-1.5 -right-2 bg-[#181818] text-[#D4A347] border border-[#D4A347] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow-xs"
                  >
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}

            {/* Shopping Cart Trigger */}
            <button
              id="header-cart-btn"
              onClick={onOpenCart}
              aria-label="Shopping Cart"
              className="relative text-[#E0D8CC] hover:text-[#D4A347] transition-colors p-1.5"
            >
              <ShoppingBag className="w-5 h-5 stroke-[2]" />
              {totalCartCount > 0 && (
                <span
                  id="cart-badge-count"
                  className="absolute -top-1.5 -right-2 bg-[#D4A347] text-[#101010] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-[#101010] shadow-xs"
                >
                  {totalCartCount}
                </span>
              )}
            </button>

            {/* Mobile Hamburger Menu Toggle */}
            <button
              id="mobile-menu-toggle-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden text-[#D3CBBF] hover:text-[#C89B4A] p-1"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#181818] border-t border-[#2A2A2A] px-6 py-5 space-y-4">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => {
              const isActive = activeSection === link.targetId;
              return (
                <button
                  key={link.targetId}
                  id={`mobile-nav-${link.targetId}`}
                  onClick={() => {
                    onScrollToSection(link.targetId);
                    setMobileMenuOpen(false);
                  }}
                  className={`text-left text-sm uppercase tracking-wider py-2.5 font-medium transition-colors border-b border-[#2A2A2A]/50 flex items-center justify-between cursor-pointer ${
                    isActive ? 'text-[#D4A347] font-bold' : 'text-[#E5DFD5] hover:text-[#C89B4A]'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#D4A347]" />}
                </button>
              );
            })}
            {onOpenWishlist && (
              <button
                onClick={() => {
                  onOpenWishlist();
                  setMobileMenuOpen(false);
                }}
                className="text-left text-sm uppercase tracking-wider py-2 font-medium text-[#E5DFD5] hover:text-[#C89B4A] border-b border-[#2A2A2A]/50 flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Heart className="w-4 h-4 text-[#C89B4A]" /> Wishlist
                </span>
                {wishlistCount > 0 && (
                  <span className="bg-[#C89B4A] text-[#141414] text-xs px-2 py-0.5 font-bold">
                    {wishlistCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
