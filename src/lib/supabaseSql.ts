export const SUPABASE_SCHEMA_SQL = `-- ==========================================================
-- DEFENCE OPTICS: Complete Supabase PostgreSQL Database Schema
-- Run this entire script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ==========================================================

-- Enable standard UUID generator extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================================
-- 1. CATEGORIES TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    tagline TEXT,
    description TEXT,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 2. PRODUCTS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category_id TEXT NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    discount_price NUMERIC(10,2) CHECK (discount_price IS NULL OR discount_price < price),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    images TEXT[] NOT NULL DEFAULT '{}',
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    frame_shape TEXT,
    frame_material TEXT,
    gender TEXT DEFAULT 'Unisex',
    frame_width TEXT,
    lens_height TEXT,
    bridge TEXT,
    temple TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 3. ORDERS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    delivery_location TEXT DEFAULT 'inside_dhaka',
    delivery_charge NUMERIC(10,2) DEFAULT 0,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cod', 'bkash', 'nagad', 'whatsapp')),
    transaction_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
    total NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 4. ORDER_ITEMS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 5. SITE_SETTINGS TABLE
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    settings JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================================
-- 6. PERFORMANCE INDEXES
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ==========================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================================
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- CATEGORIES POLICIES
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
DROP POLICY IF EXISTS "Public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admin manage categories" ON public.categories;
DROP POLICY IF EXISTS "Allow delete categories" ON public.categories;
DROP POLICY IF EXISTS "Admins have full access to categories" ON public.categories;

-- Public / anonymous SELECT access (so storefront works)
CREATE POLICY "Public read categories"
ON public.categories FOR SELECT
TO anon, authenticated
USING (true);

-- Full SELECT/INSERT/UPDATE/DELETE access for authenticated users (admin)
CREATE POLICY "Authenticated full access to categories"
ON public.categories FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- PRODUCTS POLICIES
DROP POLICY IF EXISTS "Public read active products" ON public.products;
DROP POLICY IF EXISTS "Public read access" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Authenticated full access to products" ON public.products;
DROP POLICY IF EXISTS "Allow admin manage products" ON public.products;
DROP POLICY IF EXISTS "Allow delete products" ON public.products;
DROP POLICY IF EXISTS "Admins have full access to products" ON public.products;

-- Public / anonymous SELECT access (active products on storefront)
CREATE POLICY "Public read active products"
ON public.products FOR SELECT
TO anon
USING (is_active = true);

-- Full SELECT/INSERT/UPDATE/DELETE access for authenticated users (admin sees all)
CREATE POLICY "Authenticated full access to products"
ON public.products FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ORDERS POLICIES
DROP POLICY IF EXISTS "Public insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public read orders" ON public.orders;
DROP POLICY IF EXISTS "Public can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view own order by id" ON public.orders;
DROP POLICY IF EXISTS "Authenticated full access to orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view and update all orders" ON public.orders;
DROP POLICY IF EXISTS "Allow delete orders" ON public.orders;

-- Public checkout: anyone can insert orders
CREATE POLICY "Public insert orders"
ON public.orders FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Public read for customer order confirmation
CREATE POLICY "Public read orders"
ON public.orders FOR SELECT
TO anon, authenticated
USING (true);

-- Full access for authenticated admin
CREATE POLICY "Authenticated full access to orders"
ON public.orders FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ORDER_ITEMS POLICIES
DROP POLICY IF EXISTS "Public insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Public read order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Public can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Authenticated full access to order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins have full access to order items" ON public.order_items;
DROP POLICY IF EXISTS "Allow delete order_items" ON public.order_items;

-- Public checkout: anyone can insert order items
CREATE POLICY "Public insert order items"
ON public.order_items FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Public read order items
CREATE POLICY "Public read order items"
ON public.order_items FOR SELECT
TO anon, authenticated
USING (true);

-- Full access for authenticated admin
CREATE POLICY "Authenticated full access to order items"
ON public.order_items FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- SITE_SETTINGS POLICIES
DROP POLICY IF EXISTS "Public read site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Authenticated full access to site_settings" ON public.site_settings;
DROP POLICY IF EXISTS "Public write site_settings" ON public.site_settings;

-- Public read site settings (so storefront displays phone, badges, charges)
CREATE POLICY "Public read site_settings"
ON public.site_settings FOR SELECT
TO anon, authenticated
USING (true);

-- Full access for authenticated admin
CREATE POLICY "Authenticated full access to site_settings"
ON public.site_settings FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ==========================================================
-- 8. DEFAULT SITE SETTINGS ROW
-- ==========================================================
INSERT INTO public.site_settings (id, settings)
VALUES (
    'default',
    jsonb_build_object(
        'store_name', 'Defence Optics',
        'tagline', 'See Better. Look Better.',
        'phone', '+880 1327-240031',
        'whatsapp', '01895600794',
        'email', 'defenceopticsinfo@gmail.com',
        'showroom', 'Shop 104, Ground Floor, Police Plaza Concord, Gulshan 1, Dhaka 1212',
        'map_url', 'https://www.google.com/maps/place/Defence+Optics/@23.8177363,90.3974833,779m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3755c7000f2fa3a3:0xe9dd6dc4e36dca23!8m2!3d23.8177363!4d90.3974833!16s%2Fg%2F11y4rg4y7l!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDkxNi4wIKXMDSoASAFQAw%3D%3D',
        'hours', 'Sat - Thu: 10:00 AM - 9:00 PM | Friday: 3:00 PM - 9:00 PM',
        'payment_number_primary', '01895600794',
        'payment_number_backup', '01327240031',
        'bkash_personal', '01895600794',
        'nagad_personal', '01895600794',
        'delivery_charge_inside_dhaka', 100,
        'delivery_charge_outside_dhaka', 130,
        'trust_badges', jsonb_build_array(
            jsonb_build_object(
                'id', 'badge-1',
                'icon_name', 'Truck',
                'label', 'Nationwide 48H',
                'description', 'Fast, secure delivery across all 64 districts in Bangladesh'
            ),
            jsonb_build_object(
                'id', 'badge-2',
                'icon_name', 'ShieldCheck',
                'label', '1-Yr Warranty',
                'description', 'Guaranteed optical precision and manufacturer warranty'
            ),
            jsonb_build_object(
                'id', 'badge-3',
                'icon_name', 'RefreshCw',
                'label', '7-Day Returns',
                'description', 'Hassle-free exchanges if the frame fit is not perfect'
            )
        )
    )
)
ON CONFLICT (id) DO UPDATE SET
    settings = EXCLUDED.settings,
    updated_at = NOW();

-- ==========================================================
-- 9. STORAGE BUCKET FOR PRODUCT & CATEGORY IMAGES
-- ==========================================================
-- Ensure the bucket exists and is marked as public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Clean up existing storage policies on objects
DROP POLICY IF EXISTS "Public read product-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated insert product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Uploads to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Updates to product-images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete product-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow Deletes to product-images" ON storage.objects;

-- 1) Public-read SELECT policy
CREATE POLICY "Public read product-images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'product-images');

-- 2) Authenticated-only INSERT policy
CREATE POLICY "Authenticated insert product-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- 3) Authenticated UPDATE policy
CREATE POLICY "Authenticated update product-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images');

-- 4) Authenticated DELETE policy
CREATE POLICY "Authenticated delete product-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'product-images');
`;
