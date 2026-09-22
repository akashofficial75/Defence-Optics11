import React, { useState, useEffect } from 'react';
import {
  Package, ShoppingCart, FolderTree, Database, Plus, Edit2, Trash2, CheckCircle2,
  Clock, AlertTriangle, Search, Filter, RefreshCw, Copy, Check, LogOut, Shield,
  ExternalLink, Eye, Key, Save, AlertCircle, Sliders, Truck, ShieldCheck,
  RotateCcw, Sparkles, MessageCircle, Phone, Mail, MapPin, CheckSquare, X, Loader2
} from 'lucide-react';
import { Product, Category, Order, OrderStatus, PaymentMethod, SiteSettings, TrustBadge, TrustIconName } from '../types';
import { DualImageInput } from '../components/DualImageInput';
import {
  getProducts, saveProduct, deleteProduct,
  getCategories, saveCategory, deleteCategory,
  getOrders, updateOrderStatus, deleteOrder, deleteMultipleOrders,
  getSupabaseConfig, saveSupabaseConfig, resetAllDataToDefault,
  initSupabase, cleanSupabaseUrl,
  getSiteSettings, saveSiteSettings
} from '../lib/dataStore';
import { SUPABASE_SCHEMA_SQL } from '../lib/supabaseSql';
import { NOTIFY_NEW_ORDER_EDGE_FUNCTION_CODE } from '../lib/edgeFunctionCode';
import { sendTestOrderEmail } from '../lib/notificationService';
import { INITIAL_SITE_SETTINGS, formatLocalPhoneNumber, formatWhatsAppInternational, buildWhatsAppLink } from '../data/initialData';
import { RenderTrustIcon, AVAILABLE_TRUST_ICONS } from '../components/TrustIcon';

interface AdminPageProps {
  onBackToStore: () => void;
}

export const AdminPage: React.FC<AdminPageProps> = ({ onBackToStore }) => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('defence_admin_auth') === 'true';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Clear and reset any existing lockout state currently stored in localStorage immediately
  useEffect(() => {
    try {
      localStorage.removeItem('defence_admin_failed_attempts');
      localStorage.removeItem('defence_admin_lockout_until');

      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          (key.startsWith('defence_admin_fails_') ||
            key.startsWith('defence_admin_lockout_') ||
            key.startsWith('defence_admin_failed_'))
        ) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (err) {
      console.warn('Error clearing lockout state from localStorage:', err);
    }
  }, []);

  // Synchronize authentication state with active Supabase session
  useEffect(() => {
    const client = initSupabase();
    if (!client) return;

    client.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        sessionStorage.setItem('defence_admin_auth', 'true');
        setIsAuthenticated(true);
      }
    });

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session) {
        sessionStorage.setItem('defence_admin_auth', 'true');
        setIsAuthenticated(true);
      } else {
        sessionStorage.removeItem('defence_admin_auth');
        setIsAuthenticated(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Active Tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'products' | 'categories' | 'settings' | 'supabase'>('dashboard');

  // Site Settings state
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(INITIAL_SITE_SETTINGS);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccessMessage, setSettingsSuccessMessage] = useState('');
  const [settingsErrorMessage, setSettingsErrorMessage] = useState('');

  // Data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
  const [orderPaymentFilter, setOrderPaymentFilter] = useState<string>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');

  // Modals
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);

  // Delete confirmation
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [isDeletingCategory, setIsDeletingCategory] = useState(false);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isSavingCategory, setIsSavingCategory] = useState(false);
  const [isResetDemoModalOpen, setIsResetDemoModalOpen] = useState(false);

  // Global Admin Toast
  const [adminToast, setAdminToast] = useState<{
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showAdminToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setAdminToast({ id, message, type });
    setTimeout(() => {
      setAdminToast((current) => (current?.id === id ? null : current));
    }, 4500);
  };

  // Supabase Config form
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);

  // Resend Edge Function state
  const [copiedEdgeFunctionCode, setCopiedEdgeFunctionCode] = useState(false);
  const [copiedResendKey, setCopiedResendKey] = useState(false);
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [showEdgeFunctionPreview, setShowEdgeFunctionPreview] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const handleCopyEdgeFunctionCode = () => {
    navigator.clipboard.writeText(NOTIFY_NEW_ORDER_EDGE_FUNCTION_CODE);
    setCopiedEdgeFunctionCode(true);
    showAdminToast('Edge Function code copied to clipboard!', 'success');
    setTimeout(() => setCopiedEdgeFunctionCode(false), 3000);
  };

  const handleCopyResendKey = () => {
    navigator.clipboard.writeText('RESEND_API_KEY');
    setCopiedResendKey(true);
    showAdminToast('Secret name copied to clipboard!', 'success');
    setTimeout(() => setCopiedResendKey(false), 3000);
  };

  const handleTestSendEmail = async () => {
    setIsTestingEmail(true);
    setEmailTestResult(null);
    try {
      const result = await sendTestOrderEmail();
      setEmailTestResult(result);
      if (result.success) {
        showAdminToast('Test email sent successfully! Check akashprogofficial@gmail.com', 'success');
      } else {
        showAdminToast(`Email test notice: ${result.message}`, 'info');
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to send test email';
      setEmailTestResult({ success: false, message: msg });
      showAdminToast(msg, 'error');
    } finally {
      setIsTestingEmail(false);
    }
  };

  const supabaseConfig = getSupabaseConfig();

  // Fetch data
  const refreshData = async () => {
    setLoading(true);
    try {
      const [allOrders, allProducts, allCategories, currentSettings] = await Promise.all([
        getOrders(),
        getProducts(),
        getCategories(),
        getSiteSettings()
      ]);
      setOrders(allOrders);
      setProducts(allProducts);
      setCategories(allCategories);
      setSiteSettings(currentSettings);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSiteSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccessMessage('');
    setSettingsErrorMessage('');

    try {
      const result = await saveSiteSettings(siteSettings);
      if (result.success) {
        const msg = 'Site settings, payment numbers & trust badges saved to database successfully!';
        setSettingsSuccessMessage(msg);
        showAdminToast(msg, 'success');
        setTimeout(() => setSettingsSuccessMessage(''), 5000);
      } else {
        const errMsg = result.error || 'Failed to save site settings to database.';
        setSettingsErrorMessage(errMsg);
        showAdminToast(`Database Error: ${errMsg}`, 'error');
      }
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to save site settings.';
      setSettingsErrorMessage(errMsg);
      showAdminToast(errMsg, 'error');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleResetSiteSettings = () => {
    setSiteSettings(INITIAL_SITE_SETTINGS);
    setSettingsSuccessMessage('Settings reset to default values. Click "Save Settings" to persist.');
    showAdminToast('Site settings reset to default values. Click "Save Settings" to persist.', 'info');
  };

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();
      const cfg = getSupabaseConfig();
      setSupabaseUrl(cleanSupabaseUrl(cfg.url));
      setSupabaseKey(cfg.anonKey);
    }
  }, [isAuthenticated]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const targetEmail = email.trim().toLowerCase();
    if (!targetEmail) {
      setAuthError('Please enter an admin email.');
      return;
    }

    const client = initSupabase();
    if (!client) {
      setAuthError('Authentication service is not configured. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: targetEmail,
        password: password,
      });

      if (error || !data?.session) {
        setAuthError('Invalid email or password.');
        return;
      }

      // Success: establish session
      setAuthError('');
      sessionStorage.setItem('defence_admin_auth', 'true');
      setIsAuthenticated(true);
      setEmail('');
      setPassword('');
    } catch (err) {
      setAuthError('Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!targetEmail) {
      setAuthError('Please provide your admin email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const client = initSupabase();
      if (client) {
        try {
          await client.auth.resetPasswordForEmail(targetEmail);
        } catch (err) {
          console.warn('Supabase password reset request:', err);
        }
      }

      setAuthSuccess(`If ${targetEmail} is registered, a password recovery link has been sent.`);
      setIsForgotPasswordMode(false);
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const client = initSupabase();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.error('Supabase signOut error:', err);
      }
    }
    sessionStorage.removeItem('defence_admin_auth');
    setIsAuthenticated(false);
  };

  // Status update
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const res = await updateOrderStatus(orderId, newStatus);
    if (!res.success) {
      showAdminToast(`Notice: ${res.error || 'Updated locally'}`, 'info');
    } else {
      showAdminToast(`Order #${orderId} status marked as "${newStatus}".`, 'success');
    }
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
    refreshData();
  };

  // Product Save
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSavingProduct(true);

    try {
      const cleanImages = editingProduct.images
        .map((img) => img.trim())
        .filter(Boolean);

      const cleanSlug = (editingProduct.slug || editingProduct.name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `prod-${Date.now()}`;

      const selectedCat = categories.find((c) => c.id === editingProduct.category_id) || categories[0];

      if (!selectedCat && categories.length === 0) {
        showAdminToast('Please create at least one category in the Categories tab before saving products.', 'error');
        setActiveTab('categories');
        return;
      }

      const productToSave: Product = {
        ...editingProduct,
        slug: cleanSlug,
        category_id: selectedCat ? selectedCat.id : (editingProduct.category_id || ''),
        category_slug: selectedCat ? selectedCat.slug : (editingProduct.category_slug || ''),
        is_active: editingProduct.is_active !== undefined ? editingProduct.is_active : true,
        images: cleanImages.length > 0 ? cleanImages : ['https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80']
      };

      const res = await saveProduct(productToSave);
      if (!res.success) {
        showAdminToast(`Database Error: Product was NOT saved to database: ${res.error}`, 'error');
        return;
      }
      showAdminToast(
        isNewProduct
          ? `Product "${productToSave.name}" created and saved to database successfully!`
          : `Product "${productToSave.name}" updated in database successfully!`,
        'success'
      );
      setEditingProduct(null);
      setIsNewProduct(false);
      refreshData();
    } catch (err: any) {
      showAdminToast(err?.message || 'Failed to save product.', 'error');
    } finally {
      setIsSavingProduct(false);
    }
  };

  // Product Delete
  const handleConfirmDeleteProduct = async () => {
    if (!deleteProductId) return;
    setIsDeletingProduct(true);
    try {
      const prodToDelete = products.find((p) => p.id === deleteProductId);
      const prodName = prodToDelete?.name || 'Product';
      const res = await deleteProduct(deleteProductId);
      if (!res.success) {
        showAdminToast(res.error || 'Failed to delete product.', 'error');
      } else {
        setProducts((prev) => prev.filter((p) => p.id !== deleteProductId));
        showAdminToast(`Product "${prodName}" deleted successfully.`, 'success');
        setDeleteProductId(null);
        refreshData();
      }
    } catch (err: any) {
      showAdminToast(err?.message || 'Failed to delete product.', 'error');
    } finally {
      setIsDeletingProduct(false);
    }
  };

  // Order Delete Single
  const handleConfirmDeleteOrder = async () => {
    if (!deleteOrderId) return;
    setIsDeletingOrder(true);
    try {
      const res = await deleteOrder(deleteOrderId);
      if (!res.success) {
        showAdminToast(`Notice: ${res.error || 'Deleted locally'}`, 'info');
      } else {
        showAdminToast(`Order #${deleteOrderId} deleted successfully.`, 'success');
      }
      setOrders((prev) => prev.filter((o) => o && o.id !== deleteOrderId));
      setSelectedOrderIds((prev) => prev.filter((id) => id !== deleteOrderId));
      if (selectedOrder?.id === deleteOrderId) {
        setSelectedOrder(null);
      }
      setDeleteOrderId(null);
    } catch (err: any) {
      showAdminToast(err?.message || 'Failed to delete order.', 'error');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Bulk Delete Orders
  const handleConfirmBulkDeleteOrders = async () => {
    if (selectedOrderIds.length === 0) return;
    setIsDeletingOrder(true);
    try {
      const count = selectedOrderIds.length;
      const res = await deleteMultipleOrders(selectedOrderIds);
      if (!res.success) {
        showAdminToast(`Notice: ${res.error || 'Deleted locally'}`, 'info');
      } else {
        showAdminToast(`${count} orders deleted successfully.`, 'success');
      }
      const idsToDelete = new Set(selectedOrderIds);
      setOrders((prev) => prev.filter((o) => o && !idsToDelete.has(o.id)));
      if (selectedOrder && idsToDelete.has(selectedOrder.id)) {
        setSelectedOrder(null);
      }
      setSelectedOrderIds([]);
      setIsBulkDeleteModalOpen(false);
    } catch (err: any) {
      showAdminToast(err?.message || 'Failed to bulk delete orders.', 'error');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Toggle single order selection
  const handleToggleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  // Toggle select all filtered orders
  const handleToggleSelectAllOrders = () => {
    const allFilteredIds = filteredOrders.map((o) => o.id);
    const areAllSelected =
      allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedOrderIds.includes(id));
    if (areAllSelected) {
      setSelectedOrderIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  // Category Save
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setIsSavingCategory(true);

    try {
      const cleanSlug = (editingCategory.slug || editingCategory.name)
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;

      const categoryToSave: Category = {
        ...editingCategory,
        slug: cleanSlug,
        image_url: editingCategory.image_url.trim() || 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80'
      };

      const res = await saveCategory(categoryToSave);
      if (!res.success) {
        showAdminToast(`Database Error: Category was NOT saved to database: ${res.error}`, 'error');
        return;
      }
      showAdminToast(
        isNewCategory
          ? `Category "${categoryToSave.name}" created and saved to database successfully!`
          : `Category "${categoryToSave.name}" updated in database successfully!`,
        'success'
      );
      setEditingCategory(null);
      setIsNewCategory(false);
      refreshData();
    } catch (err: any) {
      showAdminToast(err?.message || 'Failed to save category.', 'error');
    } finally {
      setIsSavingCategory(false);
    }
  };

  // Category Delete
  const handleConfirmDeleteCategory = async () => {
    if (!deleteCategoryId) return;
    const catToDelete = categories.find((c) => c.id === deleteCategoryId);
    const catName = catToDelete?.name || 'Category';

    // Check if any products exist under this category
    const productsInCategory = (products || []).filter(
      (p) =>
        p &&
        (p.category_id === deleteCategoryId ||
          (catToDelete &&
            (p.category_id === catToDelete.slug ||
              (p as any).category_slug === catToDelete.slug)))
    );

    if (productsInCategory.length > 0) {
      showAdminToast(
        `Cannot delete — this category still has ${productsInCategory.length} product(s). Please move or delete those products first.`,
        'error'
      );
      return;
    }

    setIsDeletingCategory(true);
    try {
      const res = await deleteCategory(deleteCategoryId);
      if (!res.success) {
        showAdminToast(res.error || 'Failed to delete category.', 'error');
      } else {
        setCategories((prev) => prev.filter((c) => c.id !== deleteCategoryId));
        showAdminToast(`Category "${catName}" deleted successfully.`, 'success');
        setDeleteCategoryId(null);
        refreshData();
      }
    } catch (err: any) {
      showAdminToast(err?.message || 'Failed to delete category.', 'error');
    } finally {
      setIsDeletingCategory(false);
    }
  };

  // Save Supabase Settings
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = cleanSupabaseUrl(supabaseUrl);
    setSupabaseUrl(cleaned);
    saveSupabaseConfig(cleaned, supabaseKey);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2500);
    refreshData();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Stats calculation
  const safeProducts = products || [];
  const safeOrders = orders || [];
  const totalProductsCount = safeProducts.length;
  const lowStockCount = safeProducts.filter((p) => p && p.stock_quantity <= 5).length;
  const pendingOrdersCount = safeOrders.filter((o) => o && o.status === 'pending').length;
  const totalRevenue = safeOrders
    .filter((o) => o && o.status !== 'cancelled')
    .reduce((sum, o) => sum + (o?.total || 0), 0);

  // Filtered Orders
  const filteredOrders = orders.filter((o) => {
    if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter) return false;
    if (orderPaymentFilter !== 'all' && o.payment_method !== orderPaymentFilter) return false;
    if (orderSearchQuery.trim()) {
      const q = orderSearchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.toLowerCase().includes(q) ||
        (o.transaction_id && o.transaction_id.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    if (productCategoryFilter !== 'all' && p.category_id !== productCategoryFilter && p.category_slug !== productCategoryFilter) {
      return false;
    }
    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.frame_shape?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F5F1EA] flex items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-white border border-[#DDD4C4] rounded-xl shadow-[0_12px_36px_rgba(16,16,16,0.08)] p-8 sm:p-9 space-y-6">
          {isForgotPasswordMode ? (
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-[#141414] text-[#D4A347] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Key className="w-6 h-6 stroke-[1.75]" />
                </div>
                <span className="text-[10px] text-[#B8852B] uppercase tracking-[0.2em] font-bold">
                  PASSWORD RECOVERY
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#141414] uppercase tracking-tight">
                  Reset Password
                </h2>
                <p className="text-xs text-[#6B655B]">
                  Enter your admin email to receive password recovery instructions.
                </p>
              </div>

              {authError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">{authError}</div>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#47423B] font-bold uppercase tracking-wider mb-1.5 text-[11px]">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="admin@yourdomain.com"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#D5CEC2] rounded-lg focus:border-[#D4A347] focus:outline-hidden text-xs text-[#141414] disabled:opacity-50 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-lift w-full py-3 bg-[#101010] text-white text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#D4A347] hover:text-[#101010] transition-all rounded-lg cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Sending Request...' : 'Send Recovery Link'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPasswordMode(false);
                    setAuthError('');
                  }}
                  className="w-full py-2.5 bg-transparent text-[#7A746B] hover:text-[#101010] text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
                >
                  &larr; Back to Admin Sign In
                </button>
              </form>
            </>
          ) : (
            <>
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-[#141414] text-[#D4A347] rounded-xl flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Shield className="w-6 h-6 stroke-[1.75]" />
                </div>
                <span className="text-[10px] text-[#B8852B] uppercase tracking-[0.2em] font-bold">
                  ADMIN CONTROL PANEL
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#141414] uppercase tracking-tight">
                  Defence Optics
                </h2>
                <p className="text-xs text-[#6B655B]">
                  Sign in to manage your store.
                </p>
              </div>

              {authSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium rounded-lg flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">{authSuccess}</div>
                </div>
              )}

              {authError && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">{authError}</div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#47423B] font-bold uppercase tracking-wider mb-1.5 text-[11px]">
                    Admin Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@yourdomain.com"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#D5CEC2] rounded-lg focus:border-[#D4A347] focus:outline-hidden text-xs text-[#141414] disabled:opacity-50 transition-colors"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[#47423B] font-bold uppercase tracking-wider text-[11px]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setIsForgotPasswordMode(true);
                        setAuthError('');
                        setAuthSuccess('');
                      }}
                      className="text-[11px] text-[#A87D33] hover:text-[#101010] hover:underline cursor-pointer font-semibold"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={isSubmitting}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#D5CEC2] rounded-lg focus:border-[#D4A347] focus:outline-hidden text-xs text-[#141414] disabled:opacity-50 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-lift w-full py-3 bg-[#101010] text-white text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#D4A347] hover:text-[#101010] transition-all rounded-lg cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#101010] disabled:hover:text-white"
                >
                  {isSubmitting ? 'Authenticating...' : 'Secure Admin Login'}
                </button>
              </form>
            </>
          )}

          <div className="text-center pt-2">
            <button
              onClick={onBackToStore}
              className="text-xs text-[#7A746B] hover:text-[#101010] underline cursor-pointer transition-colors"
            >
              &larr; Return to Customer Storefront
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1EA] text-[#141414] font-sans pb-16">
      {/* Global Admin Toast Notification */}
      {adminToast && (
        <div
          role="status"
          className={`fixed top-4 right-4 z-[9999] max-w-sm w-full p-4 shadow-2xl border flex items-start gap-3 backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${
            adminToast.type === 'success'
              ? 'bg-[#141414]/95 text-white border-[#C89B4A]'
              : adminToast.type === 'error'
              ? 'bg-red-950/95 text-white border-red-500'
              : 'bg-[#1C1917]/95 text-white border-[#D5CEC2]'
          }`}
        >
          {adminToast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />}
          {adminToast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />}
          {adminToast.type === 'info' && <AlertCircle className="w-5 h-5 text-[#E6DEC8] shrink-0 mt-0.5" />}
          <div className="flex-1 text-xs">
            <h5 className="font-serif font-bold text-sm text-[#F5F2EB]">
              {adminToast.type === 'success' ? 'Success' : adminToast.type === 'error' ? 'Notice' : 'Information'}
            </h5>
            <p className="mt-1 text-[#D5CEC2] leading-relaxed">{adminToast.message}</p>
          </div>
          <button
            type="button"
            onClick={() => setAdminToast(null)}
            className="text-stone-400 hover:text-white p-0.5 cursor-pointer"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-30 bg-[#141414] text-white border-b border-[#2A2A2A] shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-lg tracking-wider text-white">
                  DEFENCE <span className="text-[#C89B4A]">OPTICS</span>
                </span>
                <span className="bg-[#242424] text-[#C89B4A] text-[10px] font-mono px-2 py-0.5 border border-[#3D3D3D] uppercase">
                  Admin v2.0
                </span>
              </div>

              {/* Database sync status pill */}
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#A8A196]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    supabaseConfig.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {supabaseConfig.isConnected ? 'Supabase Connected' : 'Local Storage Mode'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onBackToStore}
                className="text-xs text-[#C4BCB0] hover:text-white px-3 py-1.5 border border-[#333333] hover:border-[#C89B4A] transition-colors flex items-center gap-1"
              >
                <span>Storefront</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={refreshData}
                disabled={loading}
                title="Refresh Store Data"
                className="p-1.5 text-[#C4BCB0] hover:text-[#C89B4A] transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#C89B4A]' : ''}`} />
              </button>

              <button
                onClick={handleLogout}
                title="Log Out"
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 border border-red-900/40 hover:border-red-500 transition-colors flex items-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="bg-[#1A1A1A] border-t border-[#262626]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 sm:space-x-4 overflow-x-auto py-1">
            {[
              { id: 'dashboard', label: 'Dashboard & Stats', icon: ShoppingCart },
              { id: 'orders', label: `Orders (${orders.length})`, icon: ShoppingCart },
              { id: 'products', label: `Products (${products.length})`, icon: Package },
              { id: 'categories', label: `Categories (${categories.length})`, icon: FolderTree },
              { id: 'settings', label: 'Site Settings & Trust Badges', icon: Sliders },
              { id: 'supabase', label: 'Supabase, Email Alerts & Deployment', icon: Database }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3.5 py-2.5 text-xs uppercase tracking-wider font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${
                    isActive
                      ? 'border-[#C89B4A] text-white bg-[#222222]'
                      : 'border-transparent text-[#9E9689] hover:text-white hover:bg-[#202020]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#C89B4A]' : 'text-[#7D766A]'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Admin Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* ========================================================
            TAB 1: DASHBOARD OVERVIEW
           ======================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* 4 Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white border border-[#E3DBD0] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-[#7A746B] uppercase tracking-wider font-semibold mb-2">
                  <span>Total Products</span>
                  <Package className="w-4 h-4 text-[#C89B4A]" />
                </div>
                <div className="text-3xl font-serif font-bold text-[#141414]">
                  {totalProductsCount}
                </div>
                <div className="text-[11px] text-emerald-700 mt-1 font-medium">
                  {products.filter((p) => p.is_active).length} active in storefront
                </div>
              </div>

              <div className="bg-white border border-[#E3DBD0] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-[#7A746B] uppercase tracking-wider font-semibold mb-2">
                  <span>Pending Orders</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="text-3xl font-serif font-bold text-amber-700">
                  {pendingOrdersCount}
                </div>
                <div className="text-[11px] text-[#6E685E] mt-1 font-medium">
                  Requires manual verification / confirmation
                </div>
              </div>

              <div className="bg-white border border-[#E3DBD0] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-[#7A746B] uppercase tracking-wider font-semibold mb-2">
                  <span>Low Stock Alerts</span>
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div className="text-3xl font-serif font-bold text-red-700">
                  {lowStockCount}
                </div>
                <div className="text-[11px] text-[#6E685E] mt-1 font-medium">
                  Items with 5 or fewer units left
                </div>
              </div>

              <div className="bg-white border border-[#E3DBD0] p-5 shadow-xs">
                <div className="flex items-center justify-between text-xs text-[#7A746B] uppercase tracking-wider font-semibold mb-2">
                  <span>Gross Revenue</span>
                  <ShoppingCart className="w-4 h-4 text-[#C89B4A]" />
                </div>
                <div className="text-3xl font-serif font-bold text-[#141414]">
                  ৳{totalRevenue.toLocaleString()}
                </div>
                <div className="text-[11px] text-[#6E685E] mt-1 font-medium">
                  Across {orders.length} lifetime orders
                </div>
              </div>
            </div>

            {/* Recent Orders Overview */}
            <div className="bg-white border border-[#E3DBD0] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-4">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#141414] uppercase">
                    Recent Customer Orders
                  </h3>
                  <p className="text-xs text-[#6B655B]">
                    Latest purchases placed via COD, bKash/Nagad manual send-money, or WhatsApp.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-xs font-semibold text-[#A87D33] hover:underline"
                >
                  Manage All Orders &rarr;
                </button>
              </div>

              {orders.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#7A746B] border border-dashed border-[#E3DBD0] p-8">
                  <ShoppingCart className="w-8 h-8 text-[#C89B4A] mx-auto mb-2 opacity-50" />
                  <p className="font-serif font-bold text-sm text-[#141414] uppercase tracking-wide">No orders yet</p>
                  <p className="text-xs text-[#7A746B] mt-1">Orders placed by customers will appear here in real time.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF8F5] text-[#7A746B] uppercase font-semibold border-b border-[#E3DBD0]">
                      <tr>
                        <th className="py-2.5 px-3">Order ID</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3">Payment</th>
                        <th className="py-2.5 px-3">Total</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EBE1]">
                      {orders.slice(0, 5).map((order) => (
                        <tr key={order.id} className="hover:bg-[#FAF8F5] transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-[#141414]">
                            {order.id}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-[#141414]">{order.customer_name}</div>
                            <div className="text-[10px] text-[#7A746B]">{order.customer_phone}</div>
                          </td>
                          <td className="py-3 px-3">
                            <span className="uppercase font-mono font-bold text-[10px] px-2 py-0.5 bg-[#FAF8F5] border border-[#E3DBD0]">
                              {order.payment_method}
                            </span>
                            {order.transaction_id && (
                              <span className="block text-[10px] text-[#A87D33] font-mono mt-0.5">
                                Trx: {order.transaction_id}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 font-bold text-[#141414]">
                            ৳{order.total.toLocaleString()}
                          </td>
                          <td className="py-3 px-3">
                            <span
                              className={`inline-block px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider ${
                                order.status === 'confirmed' || order.status === 'delivered'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : order.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800'
                                  : order.status === 'cancelled'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-2.5 py-1 bg-[#141414] text-white text-[10px] uppercase font-semibold hover:bg-[#C89B4A]"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Quick Actions Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => {
                  if (categories.length === 0) {
                    showAdminToast('Please create a category under the Categories tab first before adding products.', 'info');
                    setActiveTab('categories');
                    return;
                  }
                  setEditingProduct({
                    id: `prod-${Date.now()}`,
                    name: '',
                    slug: '',
                    category_id: categories[0]?.id || '',
                    category_slug: categories[0]?.slug || '',
                    description: '',
                    price: 3200,
                    discount_price: null,
                    stock_quantity: 10,
                    images: ['https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80'],
                    is_featured: true,
                    is_active: true,
                    frame_shape: 'Round',
                    frame_material: 'Italian Acetate',
                    gender: 'Unisex'
                  });
                  setIsNewProduct(true);
                }}
                className="p-4 bg-white border border-[#E3DBD0] hover:border-[#C89B4A] text-left transition-all group"
              >
                <Plus className="w-5 h-5 text-[#C89B4A] mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-serif font-bold text-sm text-[#141414] uppercase">
                  Add New Product
                </h4>
                <p className="text-xs text-[#7A746B] mt-0.5">
                  Upload images, set pricing, discounts, and inventory.
                </p>
              </button>

              <button
                onClick={() => {
                  setEditingCategory({
                    id: `cat-${Date.now()}`,
                    name: '',
                    slug: '',
                    tagline: '',
                    description: '',
                    image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
                    sort_order: categories.length + 1
                  });
                  setIsNewCategory(true);
                }}
                className="p-4 bg-white border border-[#E3DBD0] hover:border-[#C89B4A] text-left transition-all group"
              >
                <FolderTree className="w-5 h-5 text-[#C89B4A] mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-serif font-bold text-sm text-[#141414] uppercase">
                  Add New Category
                </h4>
                <p className="text-xs text-[#7A746B] mt-0.5">
                  E.g. Contact Lenses, Kids Eyewear, Lens Cleaning Kits.
                </p>
              </button>

              <button
                onClick={() => setActiveTab('supabase')}
                className="p-4 bg-white border border-[#E3DBD0] hover:border-[#C89B4A] text-left transition-all group"
              >
                <Database className="w-5 h-5 text-[#C89B4A] mb-2 group-hover:scale-110 transition-transform" />
                <h4 className="font-serif font-bold text-sm text-[#141414] uppercase">
                  Supabase & Netlify Setup
                </h4>
                <p className="text-xs text-[#7A746B] mt-0.5">
                  View SQL migrations, configure RLS, and connect remote DB.
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: ORDERS MANAGEMENT
           ======================================================== */}
        {activeTab === 'orders' && (
          <div className="bg-white border border-[#E3DBD0] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0EBE1] pb-4">
              <div>
                <h2 className="font-serif font-bold text-xl uppercase text-[#141414]">
                  Orders Management
                </h2>
                <p className="text-xs text-[#6B655B]">
                  Verify bKash / Nagad Transaction IDs, confirm COD orders, and update shipping progress.
                </p>
              </div>

              {/* Status Filters & Bulk Action */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedOrderIds.length > 0 && (
                  <button
                    id="admin-top-delete-selected-btn"
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedOrderIds.length})</span>
                  </button>
                )}

                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#D5CEC2] px-3 py-1.5 text-xs font-semibold text-[#141414]"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>

                <select
                  value={orderPaymentFilter}
                  onChange={(e) => setOrderPaymentFilter(e.target.value)}
                  className="bg-[#FAF8F5] border border-[#D5CEC2] px-3 py-1.5 text-xs font-semibold text-[#141414]"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                  <option value="bkash">bKash (Personal)</option>
                  <option value="nagad">Nagad (Personal)</option>
                  <option value="whatsapp">WhatsApp Direct</option>
                </select>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#8C857B] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search orders by customer name, phone number, order ID, or TrxID..."
                value={orderSearchQuery}
                onChange={(e) => setOrderSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#D5CEC2] text-xs focus:border-[#C89B4A] focus:outline-hidden"
              />
            </div>

            {/* Bulk Selection Notification Bar */}
            {selectedOrderIds.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-red-50/90 border border-red-200 text-xs">
                <div className="flex items-center gap-2 text-red-900 font-medium">
                  <CheckSquare className="w-4 h-4 text-red-600" />
                  <span>
                    <strong className="font-bold font-mono text-red-700">{selectedOrderIds.length}</strong> of {filteredOrders.length} filtered order{selectedOrderIds.length > 1 ? 's' : ''} selected
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedOrderIds([])}
                    className="px-3 py-1 bg-white border border-red-300 text-red-700 hover:bg-red-100 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={() => setIsBulkDeleteModalOpen(true)}
                    className="px-3.5 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected ({selectedOrderIds.length})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Orders Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] text-[#7A746B] uppercase font-semibold border-b border-[#E3DBD0]">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        aria-label="Select all filtered orders"
                        title="Select or deselect all orders"
                        checked={filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrderIds.includes(o.id))}
                        onChange={handleToggleSelectAllOrders}
                        className="w-4 h-4 accent-[#141414] rounded cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3">Order ID & Date</th>
                    <th className="py-3 px-3">Customer & Phone</th>
                    <th className="py-3 px-3">Delivery Address</th>
                    <th className="py-3 px-3">Method & TrxID</th>
                    <th className="py-3 px-3">Items & Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE1]">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-xs text-[#7A746B]">
                        <ShoppingCart className="w-10 h-10 text-[#C89B4A] mx-auto mb-3 opacity-60" />
                        <div className="font-serif font-bold text-base text-[#141414] uppercase tracking-wide">
                          No orders yet
                        </div>
                        <p className="text-xs text-[#7A746B] mt-1 max-w-sm mx-auto">
                          Orders placed by customers will appear here in real time.
                        </p>
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-xs text-[#7A746B]">
                        No orders match your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className={`transition-colors ${
                          selectedOrderIds.includes(order.id)
                            ? 'bg-amber-50/60'
                            : 'hover:bg-[#FAF8F5]'
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            aria-label={`Select order ${order.id}`}
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={() => handleToggleSelectOrder(order.id)}
                            className="w-4 h-4 accent-[#141414] rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-[#141414] block">
                            {order.id}
                          </span>
                          <span className="text-[10px] text-[#7A746B]">
                            {new Date(order.created_at).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <strong className="text-[#141414] block">{order.customer_name}</strong>
                          <span className="text-[11px] font-mono text-[#615B52]">
                            {order.customer_phone}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-[200px]">
                          <span
                            className={`inline-block text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 mb-1 border ${
                              order.delivery_location === 'outside_dhaka'
                                ? 'bg-purple-50 text-purple-800 border-purple-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {order.delivery_location === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'}
                          </span>
                          <span className="block text-[#595349] truncate text-[11px]" title={order.customer_address}>
                            {order.customer_address}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="uppercase font-mono font-bold text-[10px] px-2 py-0.5 bg-[#FAF8F5] border border-[#E3DBD0]">
                            {order.payment_method}
                          </span>
                          {order.transaction_id ? (
                            <span className="block font-mono text-[11px] text-[#C89B4A] font-bold mt-1">
                              Trx: {order.transaction_id}
                            </span>
                          ) : (
                            <span className="block text-[10px] text-[#9E9689] mt-0.5">
                              No TrxID
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-[#141414] block">
                            ৳{order.total.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#7A746B] block">
                            Sub: ৳{(order.subtotal ?? (order.total - (order.delivery_charge || 0))).toLocaleString()} &bull; Del: ৳{(order.delivery_charge || (order.delivery_location === 'outside_dhaka' ? 130 : 100)).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[#8C8477]">
                            {order.items?.length || 1} line item(s)
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                            className="text-[11px] font-bold uppercase bg-white border border-[#D5CEC2] px-2 py-1 rounded-none cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="confirmed">Confirmed</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-2.5 py-1 bg-[#141414] text-white text-[10px] uppercase font-semibold hover:bg-[#C89B4A] transition-colors cursor-pointer"
                            >
                              View Modal
                            </button>
                            <button
                              onClick={() => setDeleteOrderId(order.id)}
                              className="px-2.5 py-1 bg-white text-red-600 border border-red-200 text-[10px] uppercase font-semibold hover:bg-red-600 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                              title="Delete Order"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: PRODUCTS MANAGEMENT
           ======================================================== */}
        {activeTab === 'products' && (
          <div className="bg-white border border-[#E3DBD0] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0EBE1] pb-4">
              <div>
                <h2 className="font-serif font-bold text-xl uppercase text-[#141414]">
                  Product Catalog & Inventory
                </h2>
                <p className="text-xs text-[#6B655B]">
                  Add, edit, adjust discounts, and manage live inventory stock.
                </p>
              </div>

              <button
                onClick={() => {
                  if (categories.length === 0) {
                    showAdminToast('Please create a category under the Categories tab first before adding products.', 'info');
                    setActiveTab('categories');
                    return;
                  }
                  setEditingProduct({
                    id: `prod-${Date.now()}`,
                    name: '',
                    slug: '',
                    category_id: categories[0]?.id || '',
                    category_slug: categories[0]?.slug || '',
                    description: '',
                    price: 3200,
                    discount_price: null,
                    stock_quantity: 10,
                    images: ['https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80'],
                    is_featured: true,
                    is_active: true,
                    frame_shape: 'Round',
                    frame_material: 'Italian Acetate',
                    gender: 'Unisex'
                  });
                  setIsNewProduct(true);
                }}
                className="px-4 py-2 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#C89B4A] flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8C857B] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search products by model name, shape, or slug..."
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#FAF8F5] border border-[#D5CEC2] text-xs focus:border-[#C89B4A] focus:outline-hidden"
                />
              </div>

              <select
                value={productCategoryFilter}
                onChange={(e) => setProductCategoryFilter(e.target.value)}
                className="bg-[#FAF8F5] border border-[#D5CEC2] px-3 py-2 text-xs font-semibold text-[#141414]"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Products Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] text-[#7A746B] uppercase font-semibold border-b border-[#E3DBD0]">
                  <tr>
                    <th className="py-3 px-3">Product</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Regular Price</th>
                    <th className="py-3 px-3">Discount Price</th>
                    <th className="py-3 px-3">Stock Quantity</th>
                    <th className="py-3 px-3">Featured</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE1]">
                  {filteredProducts.map((prod) => (
                    <tr key={prod.id} className="hover:bg-[#FAF8F5] transition-colors">
                      <td className="py-3 px-3 flex items-center gap-3">
                        <img
                          src={prod.images[0]}
                          alt={prod.name}
                          className="w-10 h-10 object-contain bg-white border border-[#E3DBD0] p-1 shrink-0"
                        />
                        <div>
                          <div className="font-bold text-[#141414]">{prod.name}</div>
                          <div className="text-[10px] text-[#7A746B]">{prod.frame_shape} &bull; {prod.gender}</div>
                        </div>
                      </td>
                      <td className="py-3 px-3 uppercase font-medium text-[11px]">
                        {categories.find((c) => c.id === prod.category_id)?.name || prod.category_slug}
                      </td>
                      <td className="py-3 px-3 font-semibold">
                        ৳{prod.price.toLocaleString()}
                      </td>
                      <td className="py-3 px-3">
                        {prod.discount_price ? (
                          <span className="text-[#A87D33] font-bold">
                            ৳{prod.discount_price.toLocaleString()}{' '}
                            <span className="text-[10px]">
                              (-{Math.round(((prod.price - prod.discount_price) / prod.price) * 100)}%)
                            </span>
                          </span>
                        ) : (
                          <span className="text-[#9E9689]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 ${
                            prod.stock_quantity > 5
                              ? 'text-emerald-800 bg-emerald-50'
                              : prod.stock_quantity > 0
                              ? 'text-amber-800 bg-amber-50'
                              : 'text-red-800 bg-red-50'
                          }`}
                        >
                          {prod.stock_quantity} in stock
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {prod.is_featured ? (
                          <span className="text-emerald-700 font-bold text-[10px] uppercase">
                            Yes
                          </span>
                        ) : (
                          <span className="text-[#9E9689] text-[10px] uppercase">No</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {prod.is_active ? (
                          <span className="text-emerald-700 font-bold text-[10px] uppercase">
                            Active
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold text-[10px] uppercase">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct({ ...prod });
                              setIsNewProduct(false);
                            }}
                            className="p-1.5 text-[#595349] hover:text-[#141414] hover:bg-[#EBE5DA] transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteProductId(prod.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 4: CATEGORIES MANAGEMENT (Trivial Expansion)
           ======================================================== */}
        {activeTab === 'categories' && (
          <div className="bg-white border border-[#E3DBD0] p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0EBE1] pb-4">
              <div>
                <h2 className="font-serif font-bold text-xl uppercase text-[#141414]">
                  Categories Management
                </h2>
                <p className="text-xs text-[#6B655B]">
                  Manage storefront categories. The system is designed to seamlessly add new categories (e.g., Contact Lenses, Kids Eyewear, Accessories) without any code modifications.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingCategory({
                    id: `cat-${Date.now()}`,
                    name: '',
                    slug: '',
                    tagline: '',
                    description: '',
                    image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
                    sort_order: categories.length + 1
                  });
                  setIsNewCategory(true);
                }}
                className="px-4 py-2 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#C89B4A] flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Category
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {categories.map((cat) => {
                const count = products.filter(
                  (p) => p.category_id === cat.id || p.category_slug === cat.slug
                ).length;

                return (
                  <div
                    key={cat.id}
                    className="border border-[#E3DBD0] bg-[#FAF8F5] p-5 flex flex-col justify-between space-y-4 hover:border-[#C89B4A] transition-all"
                  >
                    <div>
                      <div className="aspect-[16/9] overflow-hidden bg-white border border-[#E3DBD0] mb-3">
                        <img
                          src={cat.image_url}
                          alt={cat.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <h3 className="font-serif font-bold text-lg text-[#141414]">
                          {cat.name}
                        </h3>
                        <span className="text-[10px] font-mono bg-white px-2 py-0.5 border border-[#E3DBD0]">
                          /{cat.slug}
                        </span>
                      </div>
                      <p className="text-xs italic text-[#A87D33] font-serif mt-0.5">
                        &ldquo;{cat.tagline || 'Custom Collection'}&rdquo;
                      </p>
                      <p className="text-xs text-[#6B655C] mt-2 line-clamp-2">
                        {cat.description || 'Custom collection of optical eyewear.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#EAE3D7] flex items-center justify-between text-xs">
                      <span className="text-[#7A746B] font-medium">
                        {count} Products
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCategory({ ...cat });
                            setIsNewCategory(false);
                          }}
                          className="p-1.5 text-[#595349] hover:text-[#141414] hover:bg-white border border-transparent hover:border-[#D5CEC2]"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteCategoryId(cat.id)}
                          className="p-1.5 text-red-600 hover:text-red-800 hover:bg-white border border-transparent hover:border-red-200"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: SITE SETTINGS & TRUST BADGES
           ======================================================== */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* Header & Controls */}
            <div className="bg-white border border-[#E3DBD0] p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0EBE1] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Sliders className="w-4 h-4 text-[#C89B4A]" />
                    <span className="text-[11px] uppercase tracking-wider font-bold text-[#A87D33]">
                      STORE CONFIGURATION
                    </span>
                  </div>
                  <h2 className="font-serif font-bold text-xl uppercase text-[#141414]">
                    Site Settings & Trust Badges
                  </h2>
                  <p className="text-xs text-[#6B655B] mt-0.5">
                    Customize trust badges and store contact numbers. Changes sync to Supabase and update the storefront immediately.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleResetSiteSettings}
                    className="px-4 py-2 border border-[#D5CEC2] text-xs font-semibold text-[#666055] hover:text-[#141414] hover:border-[#141414] transition-colors cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveSiteSettings()}
                    disabled={settingsSaving}
                    className="px-6 py-2 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#C89B4A] hover:text-[#141414] transition-all flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {settingsSaving ? 'Saving...' : 'Save All Settings'}
                  </button>
                </div>
              </div>

              {/* Status notifications */}
              {settingsSuccessMessage && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{settingsSuccessMessage}</span>
                </div>
              )}

              {settingsErrorMessage && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{settingsErrorMessage}</span>
                </div>
              )}
            </div>

            {/* SECTION 1: TRUST BADGES */}
            <div className="bg-white border border-[#E3DBD0] p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-[#C89B4A]" />
                  <h3 className="font-serif font-bold text-base uppercase text-[#141414]">
                    Storefront Trust Badges
                  </h3>
                </div>
                <p className="text-xs text-[#6B655B]">
                  These 3 badges appear on the <strong>Product Detail Modal</strong> (under the Add to Cart button), in the <strong>Hero</strong> micro-bar, and in the <strong>Why Choose Us</strong> guarantee cards.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {siteSettings.trust_badges.map((badge, index) => (
                  <div
                    key={badge.id || index}
                    className="border border-[#E2DAD0] bg-[#FAF8F5] p-5 space-y-4 rounded-xs"
                  >
                    <div className="flex items-center justify-between border-b border-[#E8E1D5] pb-2">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-[#A87D33]">
                        Badge #{index + 1}
                      </span>
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-[#DCD3C4] text-[10px] font-mono text-[#554F46]">
                        <RenderTrustIcon name={badge.icon_name} className="w-3.5 h-3.5 text-[#C89B4A]" />
                        <span>{badge.icon_name}</span>
                      </div>
                    </div>

                    {/* Badge Label */}
                    <div>
                      <label className="block text-[#47423B] font-bold uppercase tracking-wider mb-1 text-[11px]">
                        Badge Label *
                      </label>
                      <input
                        type="text"
                        required
                        value={badge.label}
                        onChange={(e) => {
                          const updated = [...siteSettings.trust_badges];
                          updated[index] = { ...updated[index], label: e.target.value };
                          setSiteSettings({ ...siteSettings, trust_badges: updated });
                        }}
                        placeholder="e.g. Nationwide 48H"
                        className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-xs text-[#141414] focus:border-[#C89B4A] focus:outline-hidden font-semibold"
                      />
                    </div>

                    {/* Icon Selection */}
                    <div>
                      <label className="block text-[#47423B] font-bold uppercase tracking-wider mb-1 text-[11px]">
                        Choose Icon
                      </label>
                      <select
                        value={badge.icon_name}
                        onChange={(e) => {
                          const updated = [...siteSettings.trust_badges];
                          updated[index] = { ...updated[index], icon_name: e.target.value as TrustIconName };
                          setSiteSettings({ ...siteSettings, trust_badges: updated });
                        }}
                        className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-xs text-[#141414] focus:border-[#C89B4A] focus:outline-hidden mb-2"
                      >
                        {AVAILABLE_TRUST_ICONS.map((opt) => (
                          <option key={opt.name} value={opt.name}>
                            {opt.label}
                          </option>
                        ))}
                      </select>

                      {/* Quick Visual Icon Palette */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {AVAILABLE_TRUST_ICONS.map((opt) => {
                          const isSelected = badge.icon_name === opt.name;
                          return (
                            <button
                              key={opt.name}
                              type="button"
                              title={opt.label}
                              onClick={() => {
                                const updated = [...siteSettings.trust_badges];
                                updated[index] = { ...updated[index], icon_name: opt.name };
                                setSiteSettings({ ...siteSettings, trust_badges: updated });
                              }}
                              className={`w-7 h-7 flex items-center justify-center border transition-all ${
                                isSelected
                                  ? 'bg-[#141414] border-[#C89B4A] text-[#C89B4A] ring-1 ring-[#C89B4A]'
                                  : 'bg-white border-[#D5CEC2] text-[#696359] hover:border-[#141414] hover:text-[#141414]'
                              }`}
                            >
                              <RenderTrustIcon name={opt.name} className="w-3.5 h-3.5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Badge Description */}
                    <div>
                      <label className="block text-[#47423B] font-bold uppercase tracking-wider mb-1 text-[11px]">
                        Card Description (Optional)
                      </label>
                      <textarea
                        rows={2}
                        value={badge.description || ''}
                        onChange={(e) => {
                          const updated = [...siteSettings.trust_badges];
                          updated[index] = { ...updated[index], description: e.target.value };
                          setSiteSettings({ ...siteSettings, trust_badges: updated });
                        }}
                        placeholder="Detailed guarantee text shown on the why choose us section"
                        className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-xs text-[#141414] focus:border-[#C89B4A] focus:outline-hidden"
                      />
                    </div>

                    {/* Live Preview Pill */}
                    <div className="pt-2 border-t border-[#E8E1D5]">
                      <span className="text-[10px] text-[#7A746B] uppercase tracking-wider block mb-1">
                        Live Preview (Product Page):
                      </span>
                      <div className="flex items-center gap-2 p-2 bg-white border border-[#E3DBD0] text-[#141414]">
                        <div className="w-6 h-6 rounded-xs flex items-center justify-center bg-[#FAF5EC] border border-[#EADFCF] text-[#C89B4A] shrink-0">
                          <RenderTrustIcon name={badge.icon_name} className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[11px] font-bold tracking-tight uppercase truncate">
                          {badge.label || 'Badge Label'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2: WHATSAPP & CONTACT NUMBERS */}
            <div className="bg-white border border-[#E3DBD0] p-6 space-y-6">
              <div className="border-b border-[#F0EBE1] pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Phone className="w-4 h-4 text-[#C89B4A]" />
                  <h3 className="font-serif font-bold text-base uppercase text-[#141414]">
                    Store Contacts & Payment Accounts
                  </h3>
                </div>
                <p className="text-xs text-[#6B655B]">
                  Manage WhatsApp concierge and bKash / Nagad payment numbers used throughout the checkout process.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* WhatsApp Concierge Number */}
                <div className="space-y-2 p-4 bg-[#FAF8F5] border border-[#E3DBD0]">
                  <div className="flex items-center justify-between">
                    <label className="block text-[#141414] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      WhatsApp Concierge Number *
                    </label>
                    <span className="text-[10px] font-mono text-[#25D366] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 font-bold">
                      Direct wa.me
                    </span>
                  </div>

                  <input
                    type="text"
                    required
                    value={siteSettings.whatsapp}
                    onChange={(e) => setSiteSettings({ ...siteSettings, whatsapp: e.target.value })}
                    placeholder="01895600794"
                    className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-sm font-mono font-bold text-[#141414] focus:border-[#C89B4A] focus:outline-hidden"
                  />

                  <div className="text-[11px] text-[#554F46] space-y-1 bg-white p-3 border border-[#E2DAD0]">
                    <div className="flex items-center justify-between">
                      <span className="text-[#7A746B]">Storefront Display:</span>
                      <strong className="font-mono text-[#141414]">{formatLocalPhoneNumber(siteSettings.whatsapp)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#7A746B]">International Link:</span>
                      <strong className="font-mono text-[#141414]">{formatWhatsAppInternational(siteSettings.whatsapp)}</strong>
                    </div>
                  </div>

                  <div className="pt-2">
                    <a
                      href={buildWhatsAppLink(siteSettings.whatsapp, 'Hello Defence Optics Concierge, testing the live WhatsApp link from admin.')}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-bold hover:underline"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Test WhatsApp Chat Link ({formatWhatsAppInternational(siteSettings.whatsapp)})
                    </a>
                  </div>
                </div>

                {/* bKash & Nagad Payment Numbers (Primary & Backup) */}
                <div className="space-y-4 p-4 bg-[#FAF8F5] border border-[#E3DBD0]">
                  <div className="border-b border-[#EADFCF] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C89B4A]" />
                      <h4 className="font-bold text-xs uppercase tracking-wider text-[#141414]">
                        bKash &amp; Nagad Personal Payment Numbers
                      </h4>
                    </div>
                    <p className="text-[11px] text-[#6B655B] mt-0.5">
                      Both numbers apply to both bKash and Nagad. Customers see the Primary number first, and the Backup number as a direct fallback if the primary has reached its daily limit.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Primary Payment Number */}
                    <div className="space-y-1">
                      <label className="block text-[#141414] font-bold uppercase tracking-wider text-xs flex items-center justify-between">
                        <span>Primary Number (Send Money) *</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                          Primary
                        </span>
                      </label>
                      <input
                        type="text"
                        required
                        value={siteSettings.payment_number_primary ?? '01895600794'}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            payment_number_primary: e.target.value
                          })
                        }
                        placeholder="01895600794"
                        className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-sm font-mono font-bold text-[#141414] focus:border-[#C89B4A] focus:outline-hidden"
                      />
                      <span className="text-[10px] text-[#7A746B] block">
                        Main number displayed on checkout for bKash &amp; Nagad.
                      </span>
                    </div>

                    {/* Backup Payment Number */}
                    <div className="space-y-1">
                      <label className="block text-[#141414] font-bold uppercase tracking-wider text-xs flex items-center justify-between">
                        <span>Backup Number (Fallback) *</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.2 bg-[#EFEAE1] text-[#7A746B] border border-[#D8D1C4] font-bold">
                          Backup
                        </span>
                      </label>
                      <input
                        type="text"
                        required
                        value={siteSettings.payment_number_backup ?? '01327240031'}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            payment_number_backup: e.target.value
                          })
                        }
                        placeholder="01327240031"
                        className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-sm font-mono font-bold text-[#141414] focus:border-[#C89B4A] focus:outline-hidden"
                      />
                      <span className="text-[10px] text-[#7A746B] block">
                        Backup number displayed for customers if primary doesn&apos;t work.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Showroom & Operating Hours */}
                <div className="space-y-4 p-4 bg-[#FAF8F5] border border-[#E3DBD0]">
                  <div>
                    <label className="block text-[#141414] font-bold uppercase tracking-wider text-xs mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#C89B4A]" />
                      Showroom Address
                    </label>
                    <input
                      type="text"
                      value={siteSettings.showroom || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, showroom: e.target.value })}
                      placeholder="Shop 104, Ground Floor, Police Plaza Concord, Gulshan 1, Dhaka 1212"
                      className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-xs text-[#141414] focus:border-[#C89B4A] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[#141414] font-bold uppercase tracking-wider text-xs flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#C89B4A]" />
                        Showroom Location / Google Maps Link
                      </label>
                      {siteSettings.map_url && (
                        <a
                          href={siteSettings.map_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#C89B4A] hover:underline font-semibold"
                        >
                          Test Map Link ↗
                        </a>
                      )}
                    </div>
                    <input
                      type="url"
                      value={siteSettings.map_url || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, map_url: e.target.value })}
                      placeholder="https://www.google.com/maps/place/Defence+Optics/..."
                      className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-xs text-[#141414] focus:border-[#C89B4A] focus:outline-hidden font-mono"
                    />
                    <span className="text-[10px] text-[#7A746B] block mt-1">
                      Direct Google Maps location for Defence Optics showroom displayed across footer, contact page, and showroom directions.
                    </span>
                  </div>

                  <div>
                    <label className="block text-[#141414] font-bold uppercase tracking-wider text-xs mb-1 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#C89B4A]" />
                      Operating Hours
                    </label>
                    <input
                      type="text"
                      value={siteSettings.hours || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, hours: e.target.value })}
                      placeholder="Sat - Thu: 10:00 AM - 9:00 PM | Friday: 3:00 PM - 9:00 PM"
                      className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-xs text-[#141414] focus:border-[#C89B4A] focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Telephone & Email */}
                <div className="space-y-4 p-4 bg-[#FAF8F5] border border-[#E3DBD0]">
                  <div>
                    <label className="block text-[#141414] font-bold uppercase tracking-wider text-xs mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#C89B4A]" />
                      Customer Telephone / Hotline
                    </label>
                    <input
                      type="text"
                      value={siteSettings.phone || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, phone: e.target.value })}
                      placeholder="+880 1327-240031"
                      className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-xs text-[#141414] focus:border-[#C89B4A] focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[#141414] font-bold uppercase tracking-wider text-xs mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#C89B4A]" />
                      Concierge Support Email
                    </label>
                    <input
                      type="email"
                      value={siteSettings.email || ''}
                      onChange={(e) => setSiteSettings({ ...siteSettings, email: e.target.value })}
                      placeholder="defenceopticsinfo@gmail.com"
                      className="w-full px-3 py-2 bg-white border border-[#D5CEC2] text-xs text-[#141414] focus:border-[#C89B4A] focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: DELIVERY CHARGES (INSIDE & OUTSIDE DHAKA) */}
              <div className="bg-white border border-[#E3DBD0] p-6 space-y-6">
                <div className="border-b border-[#F0EBE1] pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="w-4 h-4 text-[#C89B4A]" />
                    <h3 className="font-serif font-bold text-base uppercase text-[#141414]">
                      Courier Delivery Charges
                    </h3>
                  </div>
                  <p className="text-xs text-[#6B655B]">
                    Configure default shipping fees for Dhaka city and outside Dhaka. These amounts are read live by checkout calculation, order summary breakdowns, and WhatsApp message templates.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Inside Dhaka */}
                  <div className="p-4 bg-[#FAF8F5] border border-[#E3DBD0] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[#141414] font-bold uppercase tracking-wider text-xs">
                        Inside Dhaka Delivery (৳) *
                      </label>
                      <span className="text-[10px] font-mono text-[#C89B4A] bg-[#FAF5EC] border border-[#EADFCF] px-1.5 py-0.5 font-bold">
                        City Courier
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-serif font-bold text-sm text-[#141414]">৳</span>
                      <input
                        type="number"
                        min={0}
                        required
                        value={siteSettings.delivery_charge_inside_dhaka ?? 100}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            delivery_charge_inside_dhaka: Number(e.target.value)
                          })
                        }
                        className="w-full pl-7 pr-3 py-2 bg-white border border-[#D5CEC2] font-mono text-sm font-bold text-[#141414] focus:border-[#C89B4A] focus:outline-hidden"
                      />
                    </div>
                    <span className="text-[10px] text-[#7A746B] block">
                      Applied when customer selects &quot;Inside Dhaka&quot; at checkout.
                    </span>
                  </div>

                  {/* Outside Dhaka */}
                  <div className="p-4 bg-[#FAF8F5] border border-[#E3DBD0] space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-[#141414] font-bold uppercase tracking-wider text-xs">
                        Outside Dhaka Delivery (৳) *
                      </label>
                      <span className="text-[10px] font-mono text-[#C89B4A] bg-[#FAF5EC] border border-[#EADFCF] px-1.5 py-0.5 font-bold">
                        Nationwide
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 font-serif font-bold text-sm text-[#141414]">৳</span>
                      <input
                        type="number"
                        min={0}
                        required
                        value={siteSettings.delivery_charge_outside_dhaka ?? 130}
                        onChange={(e) =>
                          setSiteSettings({
                            ...siteSettings,
                            delivery_charge_outside_dhaka: Number(e.target.value)
                          })
                        }
                        className="w-full pl-7 pr-3 py-2 bg-white border border-[#D5CEC2] font-mono text-sm font-bold text-[#141414] focus:border-[#C89B4A] focus:outline-hidden"
                      />
                    </div>
                    <span className="text-[10px] text-[#7A746B] block">
                      Applied when customer selects &quot;Outside Dhaka&quot; at checkout.
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Save Action */}
              <div className="pt-4 border-t border-[#F0EBE1] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#6B655B]">
                  Clicking <strong>Save All Settings</strong> updates your Supabase database and syncs live across all open sessions.
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveSiteSettings()}
                  disabled={settingsSaving}
                  className="w-full sm:w-auto px-8 py-3 bg-[#141414] text-white text-xs uppercase tracking-[0.14em] font-semibold hover:bg-[#C89B4A] hover:text-[#141414] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {settingsSaving ? 'Saving Changes...' : 'Save All Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: SUPABASE & NETLIFY DEPLOYMENT GUIDE
           ======================================================== */}
        {activeTab === 'supabase' && (
          <div className="space-y-8">
            {/* Live Supabase Connection Form */}
            <div className="bg-white border border-[#E3DBD0] p-6 space-y-6">
              <div className="border-b border-[#F0EBE1] pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Key className="w-4 h-4 text-[#C89B4A]" />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-[#A87D33]">
                    SUPABASE CREDENTIALS CONFIGURATION
                  </span>
                </div>
                <h2 className="font-serif font-bold text-xl uppercase text-[#141414]">
                  Connect Your Supabase Project
                </h2>
                <p className="text-xs text-[#6B655B]">
                  Connect your live Supabase database URL and Anon key. When filled, all products, orders, and categories will read & write directly to your Supabase PostgreSQL tables!
                </p>
              </div>

              {configSaved && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Supabase credentials saved successfully. Connecting...
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[#47423B] font-bold uppercase tracking-wider mb-1">
                    Supabase Project URL (e.g. https://your-project.supabase.co)
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzcompany.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#D5CEC2] font-mono text-xs focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[#47423B] font-bold uppercase tracking-wider mb-1">
                    Supabase Anon Public API Key (eyJh...)
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#FAF8F5] border border-[#D5CEC2] font-mono text-xs focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#C89B4A] flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" /> Save Credentials
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsResetDemoModalOpen(true)}
                    className="px-4 py-2.5 bg-transparent border border-[#D5CEC2] text-[#7A746B] text-xs uppercase tracking-wider hover:text-black hover:border-black cursor-pointer"
                  >
                    Reset Demo Seeds
                  </button>
                </div>
              </form>
            </div>

            {/* SQL Schema Ready for Copy-Paste */}
            <div className="bg-white border border-[#E3DBD0] p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                <div>
                  <h3 className="font-serif font-bold text-lg uppercase text-[#141414]">
                    Postgres Database Schema & RLS Policies (Section 4 Deliverable)
                  </h3>
                  <p className="text-xs text-[#6B655B]">
                    Copy and run this in your Supabase project&apos;s SQL Editor to instantiate all tables, foreign keys, and Row Level Security rules.
                  </p>
                </div>

                <button
                  onClick={handleCopySql}
                  className="px-4 py-2 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#C89B4A] flex items-center gap-2"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-4 h-4" /> Copied SQL!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copy SQL Schema
                    </>
                  )}
                </button>
              </div>

              <div className="relative bg-[#181818] text-[#D8D2C6] p-4 rounded-none font-mono text-[11px] max-h-96 overflow-y-auto leading-relaxed border border-[#333333]">
                <pre>{SUPABASE_SCHEMA_SQL}</pre>
              </div>
            </div>

            {/* ========================================================
                RESEND EMAIL NOTIFICATIONS: SUPABASE EDGE FUNCTION & WEBHOOK
               ======================================================== */}
            <div className="bg-white border border-[#E3DBD0] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#F0EBE1] pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-[#C89B4A]" />
                    <span className="text-[11px] uppercase tracking-wider font-bold text-[#A87D33]">
                      AUTOMATIC EMAIL NOTIFICATIONS (RESEND)
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-lg uppercase text-[#141414]">
                    Notify New Order via Supabase Edge Function & Resend
                  </h3>
                  <p className="text-xs text-[#6B655B]">
                    Instant email alerts sent to <strong className="text-[#141414]">akashprogofficial@gmail.com</strong> whenever a customer places an order.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTestSendEmail}
                  disabled={isTestingEmail}
                  className="px-4 py-2.5 bg-[#141414] text-white text-xs uppercase tracking-wider font-semibold hover:bg-[#C89B4A] hover:text-[#141414] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isTestingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Sending Test Email...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" /> Send Test Order Email
                    </>
                  )}
                </button>
              </div>

              {/* Live Test Result Banner */}
              {emailTestResult && (
                <div
                  className={`p-4 border rounded-none text-xs flex items-start gap-3 ${
                    emailTestResult.success
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  {emailTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold">
                      {emailTestResult.success ? 'Success!' : 'Configuration Notice:'}
                    </p>
                    <p>{emailTestResult.message}</p>
                    {emailTestResult.details?.resend_id && (
                      <p className="font-mono text-[11px] text-emerald-700">
                        Resend Message ID: {emailTestResult.details.resend_id}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* 4 Clear Steps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#524D44]">
                {/* Step 1 */}
                <div className="bg-[#FAF8F5] border border-[#E3DBD0] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#141414] uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center text-[10px]">1</span>
                      Create Edge Function
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyEdgeFunctionCode}
                      className="px-2.5 py-1 bg-white border border-[#D5CEC2] hover:border-[#141414] text-[11px] font-semibold text-[#141414] flex items-center gap-1"
                    >
                      {copiedEdgeFunctionCode ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Copied Code!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Code
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6B655B] leading-relaxed">
                    In your Supabase Dashboard, click <strong>Edge Functions</strong> &rarr; <strong>New Function</strong>. Name it <code className="bg-white px-1 border border-[#D5CEC2] text-[#141414] font-bold">notify-new-order</code> and paste the copied TypeScript code.
                  </p>
                </div>

                {/* Step 2 */}
                <div className="bg-[#FAF8F5] border border-[#E3DBD0] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#141414] uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center text-[10px]">2</span>
                      Add RESEND_API_KEY Secret
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyResendKey}
                      className="px-2.5 py-1 bg-white border border-[#D5CEC2] hover:border-[#141414] text-[11px] font-semibold text-[#141414] flex items-center gap-1"
                    >
                      {copiedResendKey ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Copied Name!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy Secret Name
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#6B655B] leading-relaxed">
                    Under <strong>Edge Functions &rarr; Secrets</strong>, add:
                    <br />
                    &bull; Name: <code className="bg-white px-1 border border-[#D5CEC2] text-[#141414] font-bold">RESEND_API_KEY</code>
                    <br />
                    &bull; Value: <span className="text-[#8F887C] italic">Your Resend API Key from your Resend Dashboard (e.g. starts with re_...)</span>
                  </p>
                </div>

                {/* Step 3 */}
                <div className="bg-[#FAF8F5] border border-[#E3DBD0] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#141414] uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center text-[10px]">3</span>
                      Set Up Database Webhook
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B655B] leading-relaxed">
                    Go to <strong>Database &rarr; Webhooks &rarr; Create a new webhook</strong>:
                    <br />
                    &bull; Name: <code className="bg-white px-1 text-[#141414] font-bold">notify-new-order-webhook</code>
                    <br />
                    &bull; Table: <code className="bg-white px-1 text-[#141414] font-bold">public.orders</code> | Event: <strong className="text-emerald-700">INSERT</strong>
                    <br />
                    &bull; Webhook Type: <strong>Supabase Edge Functions</strong> &rarr; Select <code className="text-[#141414] font-bold">notify-new-order</code>
                  </p>
                </div>

                {/* Step 4 */}
                <div className="bg-[#FAF8F5] border border-[#E3DBD0] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#141414] uppercase tracking-wide flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-[#141414] text-white flex items-center justify-center text-[10px]">4</span>
                      Confirm & Test Delivery
                    </span>
                  </div>
                  <p className="text-[11px] text-[#6B655B] leading-relaxed">
                    Click the <strong>Send Test Order Email</strong> button above, or place a real order through checkout. Open your Gmail (<strong className="text-[#141414]">akashprogofficial@gmail.com</strong>) to view the incoming branded email with customer name, phone, address, and items!
                  </p>
                </div>
              </div>

              {/* Code preview toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowEdgeFunctionPreview(!showEdgeFunctionPreview)}
                  className="text-xs font-semibold text-[#A87D33] hover:text-[#141414] underline cursor-pointer"
                >
                  {showEdgeFunctionPreview ? '▲ Hide Edge Function Code' : '▼ Preview notify-new-order/index.ts code'}
                </button>

                {showEdgeFunctionPreview && (
                  <div className="mt-3 relative bg-[#181818] text-[#D8D2C6] p-4 font-mono text-[11px] max-h-80 overflow-y-auto leading-relaxed border border-[#333333]">
                    <pre>{NOTIFY_NEW_ORDER_EDGE_FUNCTION_CODE}</pre>
                  </div>
                )}
              </div>
            </div>

            {/* Step-by-Step Netlify Deployment Instructions */}
            <div className="bg-white border border-[#E3DBD0] p-6 space-y-4">
              <h3 className="font-serif font-bold text-lg uppercase text-[#141414]">
                Netlify Deployment Instructions (Section 7 Deliverable)
              </h3>
              <div className="space-y-3 text-xs text-[#524D44] leading-relaxed">
                <p>
                  <strong>1. Connect to GitHub:</strong> Push this repository to your GitHub account (`git push origin main`).
                </p>
                <p>
                  <strong>2. Import into Netlify:</strong> Log into Netlify &rarr; Click &quot;Add new site&quot; &rarr; &quot;Import an existing project&quot; &rarr; select the GitHub repository.
                </p>
                <p>
                  <strong>3. Build Settings:</strong>
                </p>
                <ul className="list-disc pl-5 font-mono text-[11px] bg-[#FAF8F5] p-3 border border-[#E3DBD0] space-y-1">
                  <li>Build command: <span className="text-[#141414] font-bold">npm run build</span></li>
                  <li>Publish directory: <span className="text-[#141414] font-bold">dist</span></li>
                </ul>
                <p>
                  <strong>4. Environment Variables on Netlify:</strong> In Site configuration &rarr; Environment variables, add:
                </p>
                <ul className="list-disc pl-5 font-mono text-[11px] bg-[#FAF8F5] p-3 border border-[#E3DBD0] space-y-1">
                  <li><span className="text-[#C89B4A] font-bold">VITE_SUPABASE_URL</span>: Your Supabase URL</li>
                  <li><span className="text-[#C89B4A] font-bold">VITE_SUPABASE_ANON_KEY</span>: Your Supabase Anon Key</li>
                  <li><span className="text-[#C89B4A] font-bold">VITE_WHATSAPP_NUMBER</span>: 8801895600794</li>
                  <li><span className="text-[#C89B4A] font-bold">VITE_PAYMENT_NUMBER_PRIMARY</span>: 01895600794</li>
                  <li><span className="text-[#C89B4A] font-bold">VITE_PAYMENT_NUMBER_BACKUP</span>: 01327240031</li>
                </ul>
                <p>
                  <strong>5. Zero Serverless Functions Needed:</strong> The client communicates directly with Supabase via `@supabase/supabase-js`, guaranteeing zero Netlify backend-hosting timeouts or cold-start issues.
                </p>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ========================================================
          MODAL: ORDER DETAILS
         ======================================================== */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5F1EA] w-full max-w-2xl border border-[#DCD3C4] shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E3DBD0] pb-3">
              <div>
                <span className="text-[10px] text-[#A87D33] uppercase tracking-wider font-bold">
                  ORDER SPECIFICATION
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#141414]">
                  Order #{selectedOrder.id}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteOrderId(selectedOrder.id)}
                  className="px-2.5 py-1 text-red-600 border border-red-200 bg-white hover:bg-red-600 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Delete this order"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Order</span>
                </button>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 text-[#7A746B] hover:text-black text-xl leading-none font-bold"
                  aria-label="Close"
                >
                  &times;
                </button>
              </div>
            </div>

            {/* Customer & Payment Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs bg-white border border-[#E3DBD0] p-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#7A746B] block">
                  Customer Details
                </span>
                <strong className="text-sm font-serif text-[#141414] block mt-0.5">
                  {selectedOrder.customer_name}
                </strong>
                <span className="font-mono text-xs text-[#524D44] block">
                  {selectedOrder.customer_phone}
                </span>
                <span className="text-[#6B655C] block mt-1">
                  {selectedOrder.customer_address}
                </span>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#FAF5EC] border border-[#EADFCF] text-[#141414] text-[11px] font-semibold">
                  <Truck className="w-3.5 h-3.5 text-[#C89B4A]" />
                  <span>
                    Location: <strong>{selectedOrder.delivery_location === 'outside_dhaka' ? 'Outside Dhaka (৳130)' : 'Inside Dhaka (৳100)'}</strong>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#7A746B] block">
                  Payment Method
                </span>
                <span className="font-mono font-bold uppercase text-xs text-[#141414] block mt-0.5">
                  {selectedOrder.payment_method}
                </span>
                {selectedOrder.transaction_id && (
                  <div className="mt-1 bg-[#FAF8F5] border border-[#E3DBD0] p-1.5">
                    <span className="text-[10px] text-[#7A746B] block">bKash/Nagad TrxID:</span>
                    <strong className="font-mono text-xs text-[#C89B4A]">
                      {selectedOrder.transaction_id}
                    </strong>
                  </div>
                )}
                {selectedOrder.notes && (
                  <div className="mt-2 text-[11px] text-[#595349]">
                    <em>Notes: {selectedOrder.notes}</em>
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase font-bold tracking-wider text-[#141414]">
                Purchased Items ({selectedOrder.items.length})
              </h4>
              <div className="divide-y divide-[#E3DBD0] bg-white border border-[#E3DBD0]">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {item.image_url && (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className="w-10 h-10 object-contain border border-[#E3DBD0] p-0.5"
                        />
                      )}
                      <div>
                        <strong className="text-[#141414] block">{item.product_name}</strong>
                        <span className="text-[#7A746B] text-[11px]">Quantity: {item.quantity}</span>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-[#141414]">
                      ৳{(item.unit_price * item.quantity).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Update & Total */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#EDE7DC] border border-[#DDD5C7] p-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#7A746B] block">
                  Change Order Status
                </span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)}
                  className="mt-1 bg-white border border-[#D5CEC2] px-3 py-1.5 text-xs font-bold uppercase cursor-pointer"
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="text-right space-y-1">
                <div className="text-[11px] text-[#7A746B] flex items-center justify-end gap-3">
                  <span>Items Subtotal:</span>
                  <strong className="font-mono text-[#141414]">
                    ৳{(selectedOrder.subtotal ?? (selectedOrder.total - (selectedOrder.delivery_charge || 0))).toLocaleString()}
                  </strong>
                </div>
                <div className="text-[11px] text-[#7A746B] flex items-center justify-end gap-3">
                  <span>Delivery ({selectedOrder.delivery_location === 'outside_dhaka' ? 'Outside Dhaka' : 'Inside Dhaka'}):</span>
                  <strong className="font-mono text-[#141414]">
                    ৳{(selectedOrder.delivery_charge || (selectedOrder.delivery_location === 'outside_dhaka' ? 130 : 100)).toLocaleString()}
                  </strong>
                </div>
                <div className="border-t border-[#DCD3C4] pt-1 flex items-baseline justify-end gap-2">
                  <span className="text-[10px] uppercase font-bold text-[#7A746B]">
                    Total Order Value:
                  </span>
                  <span className="font-serif text-2xl font-bold text-[#141414]">
                    ৳{selectedOrder.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD / EDIT PRODUCT
         ======================================================== */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5F1EA] w-full max-w-2xl border border-[#DCD3C4] shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E3DBD0] pb-3">
              <h3 className="font-serif text-2xl font-bold text-[#141414] uppercase">
                {isNewProduct ? 'Add New Eyewear Product' : `Edit: ${editingProduct.name}`}
              </h3>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-lg font-bold text-[#7A746B] hover:text-black"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#47423B] font-bold uppercase mb-1">
                    Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.name}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        name: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, '-')
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[#47423B] font-bold uppercase mb-1">
                    Slug
                  </label>
                  <input
                    type="text"
                    required
                    value={editingProduct.slug}
                    onChange={(e) => setEditingProduct({ ...editingProduct, slug: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#47423B] font-bold uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={editingProduct.category_id}
                    onChange={(e) => {
                      const cat = categories.find((c) => c.id === e.target.value);
                      setEditingProduct({
                        ...editingProduct,
                        category_id: e.target.value,
                        category_slug: cat?.slug
                      });
                    }}
                    className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#47423B] font-bold uppercase mb-1">
                    Regular Price (৳) *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingProduct.price}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[#47423B] font-bold uppercase mb-1">
                    Discount Price (৳)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder="Optional (e.g. 2500)"
                    value={editingProduct.discount_price || ''}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        discount_price: e.target.value ? Number(e.target.value) : null
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[#47423B] font-bold uppercase mb-1">
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={editingProduct.stock_quantity}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        stock_quantity: Number(e.target.value)
                      })
                    }
                    className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[#47423B] font-bold uppercase mb-1">
                    Frame Shape
                  </label>
                  <input
                    type="text"
                    value={editingProduct.frame_shape || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, frame_shape: e.target.value })
                    }
                    placeholder="e.g. Aviator, Round, Square"
                    className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[#47423B] font-bold uppercase mb-1">
                    Material
                  </label>
                  <input
                    type="text"
                    value={editingProduct.frame_material || ''}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, frame_material: e.target.value })
                    }
                    placeholder="e.g. Titanium, Bio-Acetate"
                    className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Product Images (Dual-Mode: URL or Upload, supporting multiple images) */}
              <div className="space-y-4 pt-1">
                <DualImageInput
                  id="product-primary-image"
                  label="Primary Product Image"
                  required
                  value={editingProduct.images[0] || ''}
                  onChange={(url) => {
                    const newImages = [...editingProduct.images];
                    newImages[0] = url;
                    setEditingProduct({ ...editingProduct, images: newImages });
                  }}
                  placeholder="https://images.unsplash.com/... or upload photo"
                  bucketName="product-images"
                  helperText="Primary photo shown on the catalog cards and as the main showcase image."
                />

                {/* Additional Images / Gallery */}
                <div className="space-y-3 pt-3 border-t border-[#E3DBD0]">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-bold uppercase text-[#47423B] tracking-wider">
                        Additional Product Images (Gallery)
                      </h5>
                      <p className="text-[11px] text-[#7A746B]">
                        Add alternate angles, side frame shots, or on-model photos.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = [...editingProduct.images, ''];
                        setEditingProduct({ ...editingProduct, images: newImages });
                      }}
                      className="px-2.5 py-1.5 bg-white border border-[#D5CEC2] hover:border-[#C89B4A] text-[11px] font-semibold text-[#141414] rounded inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#C89B4A]" /> Add Gallery Image
                    </button>
                  </div>

                  {editingProduct.images.slice(1).map((imgUrl, idx) => {
                    const actualIdx = idx + 1;
                    return (
                      <div key={actualIdx} className="relative p-3 bg-white border border-[#E3DBD0] rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-bold text-[#595349] uppercase tracking-wider">
                            Gallery Image #{actualIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newImages = editingProduct.images.filter((_, i) => i !== actualIdx);
                              setEditingProduct({ ...editingProduct, images: newImages });
                            }}
                            className="text-red-600 hover:text-red-800 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" /> Remove
                          </button>
                        </div>
                        <DualImageInput
                          value={imgUrl}
                          onChange={(url) => {
                            const newImages = [...editingProduct.images];
                            newImages[actualIdx] = url;
                            setEditingProduct({ ...editingProduct, images: newImages });
                          }}
                          placeholder="https://... or upload additional angle"
                          bucketName="product-images"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[#47423B] font-bold uppercase mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editingProduct.description}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, description: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_featured}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, is_featured: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#C89B4A]"
                  />
                  <span className="font-semibold text-[#141414]">Featured in Best Sellers</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingProduct.is_active}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, is_active: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#C89B4A]"
                  />
                  <span className="font-semibold text-[#141414]">Active on Storefront</span>
                </label>
              </div>

              <div className="pt-4 border-t border-[#E3DBD0] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  disabled={isSavingProduct}
                  className="px-4 py-2 border border-[#D5CEC2] text-[#595349] hover:text-black cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProduct}
                  className="px-6 py-2 bg-[#141414] text-white uppercase tracking-wider font-semibold hover:bg-[#C89B4A] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingProduct ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Product</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: ADD / EDIT CATEGORY (Future Expansion)
         ======================================================== */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#F5F1EA] w-full max-w-lg border border-[#DCD3C4] shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-[#E3DBD0] pb-3">
              <h3 className="font-serif text-2xl font-bold text-[#141414] uppercase">
                {isNewCategory ? 'Add New Category' : `Edit Category: ${editingCategory.name}`}
              </h3>
              <button
                onClick={() => setEditingCategory(null)}
                className="text-lg font-bold text-[#7A746B] hover:text-black"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#47423B] font-bold uppercase mb-1">
                  Category Name (e.g. Contact Lenses) *
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.name}
                  onChange={(e) =>
                    setEditingCategory({
                      ...editingCategory,
                      name: e.target.value,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, '-')
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[#47423B] font-bold uppercase mb-1">
                  Slug (e.g. contact-lenses)
                </label>
                <input
                  type="text"
                  required
                  value={editingCategory.slug}
                  onChange={(e) => setEditingCategory({ ...editingCategory, slug: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[#47423B] font-bold uppercase mb-1">
                  Tagline (e.g. All-day comfort & clarity)
                </label>
                <input
                  type="text"
                  value={editingCategory.tagline || ''}
                  onChange={(e) => setEditingCategory({ ...editingCategory, tagline: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                />
              </div>

              <div>
                <DualImageInput
                  id="category-image"
                  label="Category Showcase Image"
                  required
                  value={editingCategory.image_url}
                  onChange={(url) => setEditingCategory({ ...editingCategory, image_url: url })}
                  placeholder="https://images.unsplash.com/... or upload photo"
                  bucketName="product-images"
                  helperText="Displayed as the hero cover photo for this category on the storefront."
                />
              </div>

              <div>
                <label className="block text-[#47423B] font-bold uppercase mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  min={1}
                  value={editingCategory.sort_order}
                  onChange={(e) =>
                    setEditingCategory({ ...editingCategory, sort_order: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-white border border-[#D5CEC2] focus:border-[#C89B4A] focus:outline-hidden"
                />
              </div>

              <div className="pt-4 border-t border-[#E3DBD0] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  disabled={isSavingCategory}
                  className="px-4 py-2 border border-[#D5CEC2] text-[#595349] hover:text-black cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCategory}
                  className="px-6 py-2 bg-[#141414] text-white uppercase tracking-wider font-semibold hover:bg-[#C89B4A] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSavingCategory ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Category</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          CONFIRM DELETE PRODUCT MODAL
         ======================================================== */}
      {deleteProductId && (() => {
        const prodToDelete = products.find((p) => p.id === deleteProductId);
        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white p-6 max-w-sm w-full border border-[#DCD3C4] shadow-2xl space-y-4 text-center">
              <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
              <h4 className="font-serif font-bold text-lg text-[#141414]">
                Delete Product?
              </h4>
              <p className="text-xs text-[#6B655C]">
                Are you sure? This cannot be undone. Product &ldquo;<strong>{prodToDelete?.name || deleteProductId}</strong>&rdquo; will be permanently deleted.
              </p>
              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteProductId(null)}
                  disabled={isDeletingProduct}
                  className="px-4 py-2 border border-[#D5CEC2] text-xs font-semibold hover:bg-stone-50 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeletingProduct}
                  onClick={handleConfirmDeleteProduct}
                  className="px-4 py-2 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                >
                  {isDeletingProduct ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Product</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================
          CONFIRM DELETE CATEGORY MODAL
         ======================================================== */}
      {deleteCategoryId && (() => {
        const catToDelete = categories.find((c) => c.id === deleteCategoryId);
        const linkedProducts = (products || []).filter(
          (p) =>
            p &&
            (p.category_id === deleteCategoryId ||
              (catToDelete &&
                (p.category_id === catToDelete.slug ||
                  (p as any).category_slug === catToDelete.slug)))
        );
        const hasProducts = linkedProducts.length > 0;

        return (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white p-6 max-w-md w-full border border-[#DCD3C4] shadow-2xl space-y-4 text-center">
              <AlertCircle className={`w-10 h-10 mx-auto ${hasProducts ? 'text-amber-600' : 'text-red-600'}`} />
              <h4 className="font-serif font-bold text-lg text-[#141414]">
                {hasProducts ? 'Cannot Delete Category' : 'Delete Category?'}
              </h4>

              {hasProducts ? (
                <div className="text-left bg-amber-50 border border-amber-200 p-3.5 space-y-2">
                  <p className="text-xs font-semibold text-amber-900">
                    Cannot delete — this category still has {linkedProducts.length} product(s). Please move or delete those products first.
                  </p>
                  <p className="text-[11px] text-amber-700">
                    To protect catalog data integrity, categories with active products cannot be removed.
                  </p>
                  <div className="mt-2 pt-2 border-t border-amber-200 text-xs text-[#595349] max-h-32 overflow-y-auto space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 block">
                      Products assigned to {catToDelete?.name || 'this category'}:
                    </span>
                    {linkedProducts.map((p) => (
                      <div key={p.id} className="flex justify-between items-center py-0.5 text-[11px]">
                        <span className="truncate max-w-[220px] font-medium text-stone-800">{p.name}</span>
                        <span className="text-stone-500 font-mono text-[10px]">Stock: {p.stock_quantity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#6B655C]">
                  Are you sure? This cannot be undone. Category &ldquo;<strong>{catToDelete?.name}</strong>&rdquo; will be permanently deleted.
                </p>
              )}

              <div className="flex gap-3 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteCategoryId(null)}
                  className="px-4 py-2 border border-[#D5CEC2] text-xs font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  {hasProducts ? 'Understood (Close)' : 'Cancel'}
                </button>
                {!hasProducts && (
                  <button
                    type="button"
                    disabled={isDeletingCategory}
                    onClick={handleConfirmDeleteCategory}
                    className="px-4 py-2 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
                  >
                    {isDeletingCategory ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Category</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================
          CONFIRM DELETE ORDER MODAL
         ======================================================== */}
      {deleteOrderId && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 max-w-sm w-full border border-[#DCD3C4] shadow-2xl space-y-4 text-center">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
            <h4 className="font-serif font-bold text-lg text-[#141414]">
              Delete Order?
            </h4>
            <p className="text-xs text-[#6B655C]">
              Are you sure? This cannot be undone. Order #{deleteOrderId} will be permanently removed.
            </p>
            <div className="text-[11px] font-mono bg-[#FAF8F5] border border-[#E3DBD0] py-1.5 px-3 text-[#7A746B]">
              Order ID: <span className="font-bold text-[#141414]">{deleteOrderId}</span>
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setDeleteOrderId(null)}
                disabled={isDeletingOrder}
                className="px-4 py-2 border border-[#D5CEC2] text-xs font-semibold hover:bg-[#F5F2EB] disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeleteOrder}
                disabled={isDeletingOrder}
                className="px-4 py-2 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingOrder ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CONFIRM BULK DELETE ORDERS MODAL
         ======================================================== */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 max-w-sm w-full border border-[#DCD3C4] shadow-2xl space-y-4 text-center">
            <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
            <h4 className="font-serif font-bold text-lg text-[#141414]">
              Delete Selected Orders?
            </h4>
            <p className="text-xs text-[#6B655C]">
              Are you sure? This cannot be undone. You are about to permanently delete <strong>{selectedOrderIds.length}</strong> selected orders.
            </p>
            <div className="text-[11px] font-mono bg-red-50 border border-red-200 py-1.5 px-3 text-red-800">
              <span className="font-bold">{selectedOrderIds.length}</span> orders selected for permanent removal
            </div>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={() => setIsBulkDeleteModalOpen(false)}
                disabled={isDeletingOrder}
                className="px-4 py-2 border border-[#D5CEC2] text-xs font-semibold hover:bg-[#F5F2EB] disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkDeleteOrders}
                disabled={isDeletingOrder}
                className="px-4 py-2 bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {isDeletingOrder ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Selected</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CONFIRM RESET DEMO SEEDS MODAL
         ======================================================== */}
      {isResetDemoModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white p-6 max-w-sm w-full border border-[#DCD3C4] shadow-2xl space-y-4 text-center">
            <AlertCircle className="w-10 h-10 text-amber-600 mx-auto" />
            <h4 className="font-serif font-bold text-lg text-[#141414]">
              Reset Demo Seeds?
            </h4>
            <p className="text-xs text-[#6B655C]">
              This will restore all default products, categories, orders, and site settings. Any custom changes in local state will be reset.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                type="button"
                onClick={() => setIsResetDemoModalOpen(false)}
                className="px-4 py-2 border border-[#D5CEC2] text-xs font-semibold hover:bg-[#F5F2EB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  resetAllDataToDefault();
                  refreshData();
                  setIsResetDemoModalOpen(false);
                  showAdminToast('Demo data successfully restored to initial seeds.', 'success');
                }}
                className="px-4 py-2 bg-[#141414] text-white text-xs font-semibold hover:bg-[#C89B4A] cursor-pointer"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
