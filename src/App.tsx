import React, { useState, useEffect, useMemo } from 'react';
import { MessageCircle, Check } from 'lucide-react';
import { Product, Category, CartItem, Order } from './types';
import { getProducts, getCategories } from './lib/dataStore';
import { buildWhatsAppLink } from './data/initialData';
import { useSiteSettings } from './lib/useSiteSettings';

// Components
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { CheckoutModal } from './components/CheckoutModal';
import { ProductModal } from './components/ProductModal';
import { SearchModal } from './components/SearchModal';
import { CategorySection } from './components/CategorySection';
import { Newsletter } from './components/Newsletter';

// Pages
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { AdminPage } from './pages/AdminPage';

export default function App() {
  const { settings } = useSiteSettings();
  // Navigation State - Supports direct /admin access via URL pathname or hash
  const [currentPage, setCurrentPage] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || hash === '#admin' || hash === '#/admin') {
        return 'admin';
      }
    }
    return 'home';
  });

  // Active section currently in view for nav highlighting
  const [activeSection, setActiveSection] = useState<string>('home');
  const [shopCategorySlug, setShopCategorySlug] = useState<string>('all');

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Cart State (Persisted in localStorage)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('defence_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Wishlist State (Persisted in localStorage)
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('defence_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modals
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load initial products & categories from dataStore
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedProducts, fetchedCategories] = await Promise.all([
        getProducts(),
        getCategories()
      ]);
      setProducts(fetchedProducts);
      setCategories(fetchedCategories);
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for direct URL back/forward and hash changes
    const handleUrlChange = () => {
      const path = window.location.pathname.toLowerCase().replace(/\/+$/, '');
      const hash = window.location.hash.toLowerCase();
      if (path === '/admin' || hash === '#admin' || hash === '#/admin') {
        setCurrentPage('admin');
      } else if (path === '' || path === '/') {
        if (currentPage === 'admin') {
          setCurrentPage('home');
        }
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [currentPage]);

  // Dynamically sort live categories by their configured sort_order
  const orderedCategories = useMemo(() => {
    if (!categories || categories.length === 0) {
      return [];
    }
    return [...categories].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
  }, [categories]);

  // Smooth scroll to a section on the continuous page
  const scrollToSection = (sectionId: string) => {
    if (currentPage === 'admin') {
      setCurrentPage('home');
    }
    const cleanId = (sectionId || '').replace(/^#/, '').toLowerCase();
    const element = document.getElementById(cleanId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });

      try {
        window.history.pushState(null, '', `#${cleanId}`);
      } catch {
        // safe fallback for sandboxed environments
      }
      setActiveSection(cleanId);
    }
  };

  // Scroll to section based on initial URL hash on first load
  useEffect(() => {
    if (typeof window !== 'undefined' && currentPage !== 'admin') {
      const hash = window.location.hash.replace(/^#/, '').toLowerCase();
      if (hash && hash !== 'admin' && hash !== '/admin') {
        const timer = setTimeout(() => {
          scrollToSection(hash);
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [loading]);

  // Active section scroll detection for nav link highlighting
  useEffect(() => {
    if (currentPage === 'admin') return;

    const sectionIds = [
      'home',
      'shop',
      ...orderedCategories.map((c) => (c.slug || c.id).toLowerCase()),
      'about',
      'contact'
    ];

    const handleScroll = () => {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const headerOffset = 90;

      // If close to top, highlight home
      if (scrollY < 180) {
        setActiveSection('home');
        return;
      }

      // If close to the bottom of document, highlight contact
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      if (scrollY + windowHeight >= docHeight - 120) {
        setActiveSection('contact');
        return;
      }

      // Check section bounding rect from bottom to top
      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const id = sectionIds[i];
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= headerOffset + 60) {
            setActiveSection(id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [currentPage, orderedCategories]);

  // Save Cart to LocalStorage
  useEffect(() => {
    localStorage.setItem('defence_cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Save Wishlist to LocalStorage
  useEffect(() => {
    localStorage.setItem('defence_wishlist', JSON.stringify(wishlist));
  }, [wishlist]);

  // Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  };

  // Cart Handlers
  const handleAddToCart = (product: Product, quantity = 1) => {
    if (product.stock_quantity <= 0) {
      showToast(`${product.name} is currently out of stock`);
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity }];
    });

    showToast(`Added "${product.name}" to cart`);
  };

  const handleUpdateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity: newQty } : item
      )
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    showToast('Item removed from cart');
  };

  // Wishlist Handler
  const handleToggleWishlist = (productId: string) => {
    setWishlist((prev) => {
      const exists = prev.includes(productId);
      if (exists) {
        showToast('Removed from saved items');
        return prev.filter((id) => id !== productId);
      } else {
        showToast('Saved to wishlist');
        return [...prev, productId];
      }
    });
  };

  // Checkout Handlers
  const handleOpenCheckout = () => {
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleBuyNow = (product: Product, quantity: number = 1) => {
    handleAddToCart(product, quantity);
    setQuickViewProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleOrderComplete = (_order: Order) => {
    setCartItems([]);
    loadData();
  };

  const handleFilterInShop = (categorySlug: string) => {
    setShopCategorySlug(categorySlug);
    scrollToSection('shop');
  };

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#141414] font-sans flex flex-col selection:bg-[#C89B4A] selection:text-white">
      {/* If current page is Admin, render the isolated admin dashboard */}
      {currentPage === 'admin' ? (
        <AdminPage
          onBackToStore={() => {
            loadData();
            setCurrentPage('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      ) : (
        <>
          {/* Sticky Storefront Header with Scroll Anchors */}
          <Header
            activeSection={activeSection}
            onScrollToSection={scrollToSection}
            cartItems={cartItems}
            cartCount={(cartItems || []).reduce((sum, item) => sum + (item?.quantity || 0), 0)}
            wishlistCount={(wishlist || []).length}
            categories={orderedCategories}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
            onOpenWishlist={() => {
              scrollToSection('shop');
              showToast(`${(wishlist || []).length} items in your wishlist`);
            }}
          />

          {/* Single Continuous Scrolling Storefront Page */}
          <main className="flex-1 w-full">
            {/* 1. Home Section (#home) */}
            <HomePage
              products={products}
              categories={orderedCategories}
              onNavigate={(_page, categorySlug) => {
                if (categorySlug) {
                  scrollToSection(categorySlug);
                } else {
                  scrollToSection('shop');
                }
              }}
              onAddToCart={handleAddToCart}
              onQuickView={setQuickViewProduct}
              wishlist={wishlist}
              onToggleWishlist={handleToggleWishlist}
            />

            {/* 2. Shop Catalog Section (#shop) */}
            <ShopPage
              products={products}
              categories={orderedCategories}
              activeCategorySlug={shopCategorySlug}
              onNavigate={(page, slug) => {
                if (slug) {
                  scrollToSection(slug);
                } else if (page === 'home') {
                  scrollToSection('home');
                } else {
                  scrollToSection('shop');
                }
              }}
              onAddToCart={handleAddToCart}
              onQuickView={setQuickViewProduct}
              wishlist={wishlist}
              onToggleWishlist={handleToggleWishlist}
            />

            {/* 3. Category Sections (#eyeglasses, #sunglasses, #frames, #female-glass, #akash-glass, etc.) */}
            {orderedCategories.map((cat, idx) => (
              <CategorySection
                key={cat.id || cat.slug}
                category={cat}
                products={products}
                onAddToCart={handleAddToCart}
                onQuickView={setQuickViewProduct}
                wishlist={wishlist}
                onToggleWishlist={handleToggleWishlist}
                onFilterInShop={handleFilterInShop}
                bgAlt={idx % 2 === 1}
              />
            ))}

            {/* 4. About Brand Section (#about) */}
            <AboutPage onShopNow={() => scrollToSection('shop')} />

            {/* 5. Contact & Concierge Section (#contact) */}
            <ContactPage />

            {/* 6. Newsletter Subscription */}
            <Newsletter />
          </main>

          {/* Storefront Footer with Smooth Scroll Anchors */}
          <Footer
            onNavigate={(_page, slug) => {
              if (slug) scrollToSection(slug);
              else scrollToSection('home');
            }}
            onScrollToSection={scrollToSection}
            categories={orderedCategories}
          />

          {/* Floating WhatsApp Quick Action */}
          <a
            href={buildWhatsAppLink(
              settings.whatsapp,
              'Hello Defence Optics, I would like to inquire about frames and lenses.'
            )}
            target="_blank"
            rel="noreferrer"
            aria-label="Chat with Defence Optics on WhatsApp"
            className="fixed bottom-6 right-6 z-40 w-12 h-12 sm:w-14 sm:h-14 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-300 group"
          >
            <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 stroke-[2]" />
            <span className="sr-only">Chat on WhatsApp</span>
            <span className="hidden sm:group-hover:block absolute right-16 bg-[#141414] text-white text-[11px] font-sans font-semibold py-1.5 px-3 whitespace-nowrap shadow-md border border-[#333]">
              Need Optical Help? Chat Now
            </span>
          </a>

          {/* Modals & Overlays */}
          <CartDrawer
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
            cartItems={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveCartItem}
            onCheckout={handleOpenCheckout}
            onProceedToCheckout={handleOpenCheckout}
            onBrowseShop={() => {
              setIsCartOpen(false);
              scrollToSection('shop');
            }}
          />

          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            cartItems={cartItems}
            onOrderSuccess={handleOrderComplete}
            onContinueShopping={() => {
              setIsCheckoutOpen(false);
              scrollToSection('shop');
            }}
          />

          <ProductModal
            product={quickViewProduct}
            onClose={() => setQuickViewProduct(null)}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            isWishlisted={quickViewProduct ? wishlist.includes(quickViewProduct.id) : false}
            onToggleWishlist={handleToggleWishlist}
          />

          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            products={products}
            onSelectProduct={(p) => setQuickViewProduct(p)}
          />

          {/* Toast Notification Alert */}
          {toastMessage && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#141414] text-white px-5 py-3 shadow-2xl border border-[#C89B4A] flex items-center gap-3 text-xs uppercase tracking-wider font-semibold animate-fadeIn">
              <Check className="w-4 h-4 text-[#C89B4A] stroke-[3]" />
              <span>{toastMessage}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
