/// <reference types="vite/client" />
import { Category, Product, Order, OrderStatus, SiteSettings } from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_ORDERS,
  INITIAL_SITE_SETTINGS,
  formatLocalPhoneNumber
} from '../data/initialData';
import {
  initSupabase,
  saveSupabaseConfig,
  getSupabaseCredentials,
  cleanSupabaseUrl,
  supabase
} from './supabase';

export {
  initSupabase,
  saveSupabaseConfig,
  cleanSupabaseUrl,
  supabase
};

export function getSupabaseConfig() {
  return getSupabaseCredentials();
}

const STORAGE_KEYS = {
  CATEGORIES: 'defence_optics_categories',
  DELETED_CATEGORIES: 'defence_deleted_categories',
  PRODUCTS: 'defence_optics_products',
  ORDERS: 'defence_optics_orders',
  SITE_SETTINGS: 'defence_optics_site_settings',
};

// Immediate self-healing: purge any legacy client-side cached categories and products from localStorage
try {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.DELETED_CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
  }
} catch {
  // Ignore in sandboxed environments
}

// Local Storage helpers
function getLocal<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return defaultValue;
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error reading ${key} from localStorage:`, e);
    return defaultValue;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage:`, e);
  }
}

// Ensure seed data exists locally and sanitize legacy broken image URLs
export function ensureInitialData(): void {
  // Purge any legacy category and product caching
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
      localStorage.removeItem(STORAGE_KEYS.DELETED_CATEGORIES);
      localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    }
  } catch {
    // Ignore
  }

  // Purge any legacy hardcoded mock orders (ORD-9824, ORD-9825, ORD-9826) from localStorage
  try {
    const rawOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
    if (rawOrders) {
      const storedOrders = JSON.parse(rawOrders);
      if (Array.isArray(storedOrders)) {
        const cleaned = storedOrders.filter(
          (o: any) =>
            !['ORD-9824', 'ORD-9825', 'ORD-9826'].includes(o?.id) &&
            !['Tanvir Ahmed', 'Farhana Rahman', 'Sabbir Hossain'].includes(o?.customer_name)
        );
        if (cleaned.length !== storedOrders.length) {
          setLocal(STORAGE_KEYS.ORDERS, cleaned);
        }
      }
    } else {
      setLocal(STORAGE_KEYS.ORDERS, []);
    }
  } catch {
    setLocal(STORAGE_KEYS.ORDERS, []);
  }
  // Ensure site settings exist
  if (!localStorage.getItem(STORAGE_KEYS.SITE_SETTINGS)) {
    setLocal(STORAGE_KEYS.SITE_SETTINGS, INITIAL_SITE_SETTINGS);
  } else {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SITE_SETTINGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed) {
          // Upgrade legacy default WhatsApp number to the new correct 01895600794
          const rawWhatsApp = parsed.whatsapp === '01327240031' ? '01895600794' : (parsed.whatsapp || INITIAL_SITE_SETTINGS.whatsapp);
          const formattedWhatsApp = formatLocalPhoneNumber(rawWhatsApp);
          const rawEmail = (!parsed.email || parsed.email === 'concierge@defenceoptics.com')
            ? INITIAL_SITE_SETTINGS.email
            : parsed.email;
          const rawMapUrl = parsed.map_url || INITIAL_SITE_SETTINGS.map_url;
          const primaryPayment = parsed.payment_number_primary || INITIAL_SITE_SETTINGS.payment_number_primary;
          const backupPayment = parsed.payment_number_backup || INITIAL_SITE_SETTINGS.payment_number_backup;
          const validBadges = (parsed.trust_badges && Array.isArray(parsed.trust_badges) && parsed.trust_badges.length > 0)
            ? parsed.trust_badges
            : INITIAL_SITE_SETTINGS.trust_badges;
          setLocal(STORAGE_KEYS.SITE_SETTINGS, {
            ...INITIAL_SITE_SETTINGS,
            ...parsed,
            whatsapp: formattedWhatsApp,
            email: rawEmail,
            map_url: rawMapUrl,
            payment_number_primary: primaryPayment,
            payment_number_backup: backupPayment,
            trust_badges: validBadges,
            delivery_charge_inside_dhaka: Number(parsed.delivery_charge_inside_dhaka ?? INITIAL_SITE_SETTINGS.delivery_charge_inside_dhaka),
            delivery_charge_outside_dhaka: Number(parsed.delivery_charge_outside_dhaka ?? INITIAL_SITE_SETTINGS.delivery_charge_outside_dhaka)
          });
        }
      }
    } catch {
      setLocal(STORAGE_KEYS.SITE_SETTINGS, INITIAL_SITE_SETTINGS);
    }
  }
}

export function resetAllDataToDefault(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DELETED_CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
  } catch {
    // Ignore
  }
  setLocal(STORAGE_KEYS.PRODUCTS, []);
  setLocal(STORAGE_KEYS.ORDERS, []);
  setLocal(STORAGE_KEYS.SITE_SETTINGS, INITIAL_SITE_SETTINGS);
}

// =======================
// CATEGORIES CRUD (LIVE SUPABASE - NO CLIENT-SIDE CACHE OR FALLBACK)
// =======================
export async function getCategories(): Promise<Category[]> {
  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true });
      if (!error && Array.isArray(data)) {
        return data as Category[];
      }
      if (error) {
        console.warn('Supabase fetch categories error:', error);
      }
    } catch (err) {
      console.warn('Supabase fetch categories failed:', err);
    }
  }
  return [];
}

export async function saveCategory(cat: Category): Promise<{ success: boolean; error?: string }> {
  const client = initSupabase();
  if (!client) {
    return { success: false, error: 'Database is not connected. Please verify your Supabase credentials in Settings.' };
  }

  // Explicitly map only valid columns in the public.categories table
  const categoryToSave = {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    tagline: cat.tagline || null,
    description: cat.description || null,
    image_url: cat.image_url,
    sort_order: Number(cat.sort_order ?? 0),
    created_at: cat.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  try {
    const { error } = await client.from('categories').upsert(categoryToSave);
    if (error) {
      console.error('Supabase upsert category error:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Supabase upsert category exception:', err);
    return { success: false, error: err?.message || 'Unknown error' };
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  const client = initSupabase();
  if (!client) {
    return {
      success: false,
      error: 'Supabase client is not connected. Please verify your Supabase credentials in Settings.'
    };
  }

  try {
    // Check if any products reference this category in Supabase
    const { data: remoteProducts, error: countErr } = await client
      .from('products')
      .select('id')
      .eq('category_id', id);

    if (!countErr && remoteProducts && remoteProducts.length > 0) {
      return {
        success: false,
        error: `Cannot delete — this category still has ${remoteProducts.length} product(s) linked to it in the database. Please move or delete those products first.`
      };
    }

    const { error } = await client.from('categories').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete category error:', error);
      if (
        error.code === '23503' ||
        error.message?.toLowerCase().includes('violates foreign key constraint') ||
        error.message?.toLowerCase().includes('referenced from table')
      ) {
        return {
          success: false,
          error: 'Cannot delete — this category still has product(s) linked to it in Supabase. Please move or delete those products first.'
        };
      }
      if (
        error.code === '42501' ||
        error.message?.toLowerCase().includes('policy') ||
        error.message?.toLowerCase().includes('row-level security')
      ) {
        return {
          success: false,
          error: 'Supabase RLS Error: Row-Level Security policy does not permit deleting from categories. Please check your RLS policies.'
        };
      }
      return {
        success: false,
        error: error.message || 'Failed to delete category in Supabase.'
      };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase delete category exception:', err);
    return {
      success: false,
      error: err?.message || 'Failed to delete category in Supabase.'
    };
  }
}

// =======================
// PRODUCTS CRUD (LIVE SUPABASE - NO CLIENT-SIDE CACHE OR FALLBACK)
// =======================
export async function getProducts(): Promise<Product[]> {
  const client = initSupabase();
  if (client) {
    try {
      const [{ data: prodData, error: prodErr }, { data: catData }] = await Promise.all([
        client.from('products').select('*').order('created_at', { ascending: false }),
        client.from('categories').select('id, slug')
      ]);

      if (!prodErr && prodData) {
        const catMap = new Map((catData || []).map((c: any) => [c.id, c.slug]));
        const enriched: Product[] = prodData.map((p: any) => ({
          ...p,
          price: Number(p.price || 0),
          discount_price: p.discount_price ? Number(p.discount_price) : null,
          stock_quantity: Number(p.stock_quantity ?? 0),
          images: Array.isArray(p.images) ? p.images : [],
          category_slug: catMap.get(p.category_id) || p.category_slug || ''
        }));
        return enriched;
      }
      if (prodErr) {
        console.error('Supabase fetch products error:', prodErr);
      }
    } catch (err) {
      console.error('Supabase fetch products failed:', err);
    }
  }
  return [];
}

export async function saveProduct(product: Product): Promise<{ success: boolean; error?: string }> {
  const client = initSupabase();
  if (!client) {
    return {
      success: false,
      error: 'Database is not connected. Please configure your Supabase URL and Key in the Settings tab.'
    };
  }

  const now = new Date().toISOString();

  // Explicitly map only columns that exist in the public.products table.
  // Note: category_slug is intentionally omitted because it does NOT exist as a column in products.
  const dbPayload = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category_id: product.category_id,
    description: product.description || '',
    price: Number(product.price || 0),
    discount_price: product.discount_price ? Number(product.discount_price) : null,
    stock_quantity: Number(product.stock_quantity ?? 0),
    images: Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : ['https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80'],
    is_featured: Boolean(product.is_featured),
    is_active: product.is_active !== undefined ? Boolean(product.is_active) : true,
    frame_shape: product.frame_shape || null,
    frame_material: product.frame_material || null,
    gender: product.gender || 'Unisex',
    frame_width: product.frame_width || null,
    lens_height: product.lens_height || null,
    bridge: product.bridge || null,
    temple: product.temple || null,
    created_at: product.created_at || now,
    updated_at: now
  };

  try {
    const { error } = await client.from('products').upsert(dbPayload);
    if (error) {
      console.error('Supabase upsert product error:', error);
      return { success: false, error: error.message || 'Failed to save product to database.' };
    }
    return { success: true };
  } catch (err: any) {
    console.error('Supabase upsert product exception:', err);
    return { success: false, error: err?.message || 'Failed to save product to database.' };
  }
}

export async function deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
  const client = initSupabase();
  if (!client) {
    return {
      success: false,
      error: 'Database is not connected. Please verify your Supabase credentials in Settings.'
    };
  }

  try {
    const { error } = await client.from('products').delete().eq('id', id);
    if (error) {
      console.error('Supabase delete product error:', error);
      return { success: false, error: error.message || 'Failed to delete product from database.' };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Supabase delete product failed:', err);
    return { success: false, error: err?.message || 'Failed to delete product from database.' };
  }
}

// =======================
// ORDERS CRUD
// =======================
export async function getOrders(): Promise<Order[]> {
  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('orders')
        .select('*, order_items(*)')
        .order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map((d: any) => ({
          ...d,
          delivery_location: d.delivery_location || 'inside_dhaka',
          delivery_charge: Number(d.delivery_charge || 0),
          subtotal: Number(d.subtotal || (Number(d.total || 0) - Number(d.delivery_charge || 0))),
          items: d.order_items || []
        })) as Order[];
        setLocal(STORAGE_KEYS.ORDERS, mapped);
        return mapped;
      }
      if (error) {
        console.warn('Supabase fetch orders error:', error);
      }
    } catch (err) {
      console.warn('Supabase fetch orders failed, using local store:', err);
    }
  }
  ensureInitialData();
  const orders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  const seenIds = new Set<string>();
  const uniqueOrders = orders.filter((o) => {
    if (!o?.id || seenIds.has(o.id)) return false;
    seenIds.add(o.id);
    return true;
  });

  return uniqueOrders
    .filter(
      (o) =>
        !['ORD-9824', 'ORD-9825', 'ORD-9826'].includes(o?.id) &&
        !['Tanvir Ahmed', 'Farhana Rahman', 'Sabbir Hossain'].includes(o?.customer_name)
    )
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Guard against rapid duplicate order creations
let lastCreatedOrderRecord: { signature: string; timestamp: number; order: Order } | null = null;

export async function createOrder(orderInput: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
  const signature = `${orderInput.customer_phone}_${orderInput.total}_${orderInput.payment_method}_${(orderInput.items || []).map((i) => `${i.product_id}:${i.quantity}`).join(',')}`;
  const now = Date.now();

  // Deduplication guard: if an identical order is submitted within 4 seconds, prevent multiple rows
  if (
    lastCreatedOrderRecord &&
    lastCreatedOrderRecord.signature === signature &&
    now - lastCreatedOrderRecord.timestamp < 4000
  ) {
    console.warn('Duplicate order creation detected and prevented. Returning existing order:', lastCreatedOrderRecord.order.id);
    return lastCreatedOrderRecord.order;
  }

  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newOrder: Order = {
    ...orderInput,
    id: `ORD-${randomSuffix}`,
    created_at: new Date().toISOString()
  };

  const client = initSupabase();
  if (client) {
    try {
      const { items, ...orderHeader } = newOrder;
      const { error: headerErr } = await client.from('orders').insert([orderHeader]);
      if (headerErr) {
        console.warn('Supabase insert order error:', headerErr);
      } else if (items && items.length > 0) {
        const orderItemsPayload = items.map((item) => ({
          order_id: newOrder.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          image_url: item.image_url
        }));
        const { error: itemsErr } = await client.from('order_items').insert(orderItemsPayload);
        if (itemsErr) {
          console.warn('Supabase insert order_items error:', itemsErr);
        }
      }
    } catch (err) {
      console.warn('Supabase insert order failed, saving locally:', err);
    }
  }

  // Update local store safely with deduplication check
  ensureInitialData();
  const currentOrders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  if (!currentOrders.some((o) => o.id === newOrder.id)) {
    currentOrders.unshift(newOrder);
    setLocal(STORAGE_KEYS.ORDERS, currentOrders);
  }

  // Reduce product stock
  const products = await getProducts();
  newOrder.items.forEach((item) => {
    const prod = products.find((p) => p.id === item.product_id);
    if (prod) {
      prod.stock_quantity = Math.max(0, prod.stock_quantity - item.quantity);
    }
  });
  setLocal(STORAGE_KEYS.PRODUCTS, products);

  lastCreatedOrderRecord = {
    signature,
    timestamp: now,
    order: newOrder
  };

  return newOrder;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<{ success: boolean; error?: string }> {
  const client = initSupabase();
  let supabaseError: string | undefined;

  if (client) {
    try {
      const { error } = await client
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', orderId);
      if (error) {
        console.warn('Supabase update order status error:', error);
        supabaseError = error.message;
      }
    } catch (err: any) {
      console.warn('Supabase update order status failed:', err);
      supabaseError = err?.message;
    }
  }

  const orders = await getOrders();
  const order = orders.find((o) => o.id === orderId);
  if (order) {
    order.status = status;
    setLocal(STORAGE_KEYS.ORDERS, orders);
  }

  return { success: !supabaseError, error: supabaseError };
}

export async function deleteOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  const client = initSupabase();
  let supabaseError: string | undefined;

  if (client) {
    try {
      const { error: itemsErr } = await client
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      if (itemsErr) {
        console.warn('Supabase delete order_items error:', itemsErr);
        supabaseError = itemsErr.message;
      }
      const { error: orderErr } = await client
        .from('orders')
        .delete()
        .eq('id', orderId);
      if (orderErr) {
        console.warn('Supabase delete order error:', orderErr);
        supabaseError = orderErr.message;
      }
    } catch (err: any) {
      console.warn('Supabase delete order failed:', err);
      supabaseError = err?.message;
    }
  }

  ensureInitialData();
  const orders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  const updatedOrders = orders.filter((o) => o && o.id !== orderId);
  setLocal(STORAGE_KEYS.ORDERS, updatedOrders);
  return { success: !supabaseError, error: supabaseError };
}

export async function deleteMultipleOrders(orderIds: string[]): Promise<{ success: boolean; error?: string }> {
  if (!orderIds || orderIds.length === 0) return { success: true };
  const client = initSupabase();
  let supabaseError: string | undefined;

  if (client) {
    try {
      const { error: itemsErr } = await client
        .from('order_items')
        .delete()
        .in('order_id', orderIds);
      if (itemsErr) {
        console.warn('Supabase bulk delete order_items error:', itemsErr);
        supabaseError = itemsErr.message;
      }
      const { error: ordersErr } = await client
        .from('orders')
        .delete()
        .in('id', orderIds);
      if (ordersErr) {
        console.warn('Supabase bulk delete orders error:', ordersErr);
        supabaseError = ordersErr.message;
      }
    } catch (err: any) {
      console.warn('Supabase bulk delete orders failed:', err);
      supabaseError = err?.message;
    }
  }

  ensureInitialData();
  const idSet = new Set(orderIds);
  const orders = getLocal<Order[]>(STORAGE_KEYS.ORDERS, []);
  const updatedOrders = orders.filter((o) => o && !idSet.has(o.id));
  setLocal(STORAGE_KEYS.ORDERS, updatedOrders);
  return { success: !supabaseError, error: supabaseError };
}

// =======================
// SITE SETTINGS CRUD
// =======================
export async function getSiteSettings(): Promise<SiteSettings> {
  const client = initSupabase();
  if (client) {
    try {
      const { data, error } = await client
        .from('site_settings')
        .select('*')
        .eq('id', 'default')
        .maybeSingle();

      if (!error && data && data.settings) {
        const parsed = data.settings;
        const rawEmail = (!parsed.email || parsed.email === 'concierge@defenceoptics.com')
          ? INITIAL_SITE_SETTINGS.email
          : parsed.email;
        const rawMapUrl = parsed.map_url || INITIAL_SITE_SETTINGS.map_url;
        const merged: SiteSettings = {
          ...INITIAL_SITE_SETTINGS,
          ...parsed,
          email: rawEmail,
          map_url: rawMapUrl,
          whatsapp: formatLocalPhoneNumber(parsed.whatsapp || INITIAL_SITE_SETTINGS.whatsapp),
          payment_number_primary: parsed.payment_number_primary || INITIAL_SITE_SETTINGS.payment_number_primary,
          payment_number_backup: parsed.payment_number_backup || INITIAL_SITE_SETTINGS.payment_number_backup,
          trust_badges:
            parsed.trust_badges && Array.isArray(parsed.trust_badges) && parsed.trust_badges.length > 0
              ? parsed.trust_badges
              : INITIAL_SITE_SETTINGS.trust_badges
        };
        setLocal(STORAGE_KEYS.SITE_SETTINGS, merged);
        return merged;
      }
      if (error && error.code !== 'PGRST116') {
        console.info('Supabase site_settings notice:', error.message);
      }
    } catch (err) {
      console.info('Supabase fetch site_settings notice:', err);
    }
  }

  ensureInitialData();
  const local = getLocal<SiteSettings>(STORAGE_KEYS.SITE_SETTINGS, INITIAL_SITE_SETTINGS);
  const rawEmail = (!local.email || local.email === 'concierge@defenceoptics.com')
    ? INITIAL_SITE_SETTINGS.email
    : local.email;
  const rawMapUrl = local.map_url || INITIAL_SITE_SETTINGS.map_url;
  return {
    ...INITIAL_SITE_SETTINGS,
    ...local,
    email: rawEmail,
    map_url: rawMapUrl,
    whatsapp: formatLocalPhoneNumber(local.whatsapp || INITIAL_SITE_SETTINGS.whatsapp),
    payment_number_primary: local.payment_number_primary || INITIAL_SITE_SETTINGS.payment_number_primary,
    payment_number_backup: local.payment_number_backup || INITIAL_SITE_SETTINGS.payment_number_backup,
    trust_badges:
      local.trust_badges && Array.isArray(local.trust_badges) && local.trust_badges.length > 0
        ? local.trust_badges
        : INITIAL_SITE_SETTINGS.trust_badges
  };
}

export async function saveSiteSettings(newSettings: Partial<SiteSettings>): Promise<{ success: boolean; error?: string }> {
  const current = await getSiteSettings();
  const updated: SiteSettings = {
    ...current,
    ...newSettings,
    email: (newSettings.email ?? current.email ?? INITIAL_SITE_SETTINGS.email).trim(),
    map_url: (newSettings.map_url ?? current.map_url ?? INITIAL_SITE_SETTINGS.map_url).trim(),
    whatsapp: formatLocalPhoneNumber(newSettings.whatsapp || current.whatsapp),
    payment_number_primary: (newSettings.payment_number_primary ?? current.payment_number_primary ?? INITIAL_SITE_SETTINGS.payment_number_primary).trim(),
    payment_number_backup: (newSettings.payment_number_backup ?? current.payment_number_backup ?? INITIAL_SITE_SETTINGS.payment_number_backup).trim(),
    trust_badges:
      newSettings.trust_badges && newSettings.trust_badges.length > 0
        ? newSettings.trust_badges
        : current.trust_badges,
    delivery_charge_inside_dhaka: Number(newSettings.delivery_charge_inside_dhaka ?? current.delivery_charge_inside_dhaka ?? 100),
    delivery_charge_outside_dhaka: Number(newSettings.delivery_charge_outside_dhaka ?? current.delivery_charge_outside_dhaka ?? 130)
  };

  const client = initSupabase();
  let supabaseError: string | undefined;

  if (client) {
    try {
      const { error } = await client.from('site_settings').upsert({
        id: 'default',
        settings: updated,
        updated_at: new Date().toISOString()
      });
      if (error) {
        console.warn('Supabase save site_settings:', error.message);
        supabaseError = error.message;
      }
    } catch (err: any) {
      console.warn('Supabase save site_settings exception:', err);
      supabaseError = err?.message;
    }
  }

  setLocal(STORAGE_KEYS.SITE_SETTINGS, updated);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('defence_optics_settings_updated', { detail: updated }));
  }

  return { success: !supabaseError, error: supabaseError };
}

