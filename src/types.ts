export type PaymentMethod = 'cod' | 'bkash' | 'nagad' | 'whatsapp';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  tagline?: string;
  sort_order: number;
  description?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  category_slug?: string;
  description: string;
  price: number;
  discount_price?: number | null;
  stock_quantity: number;
  images: string[];
  is_featured: boolean;
  is_active: boolean;
  frame_shape?: string;
  frame_material?: string;
  gender?: 'Unisex' | 'Men' | 'Women';
  frame_width?: string;
  lens_height?: string;
  bridge?: string;
  temple?: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id?: string;
  order_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  image_url?: string;
}

export type DeliveryLocation = 'inside_dhaka' | 'outside_dhaka';

export interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  delivery_location?: DeliveryLocation;
  delivery_charge?: number;
  payment_method: PaymentMethod;
  transaction_id?: string | null;
  status: OrderStatus;
  subtotal: number;
  total: number;
  notes?: string;
  created_at: string;
  items: OrderItem[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface PromoCode {
  code: string;
  discount_percentage: number;
  description: string;
}

export type TrustIconName =
  | 'Truck'
  | 'ShieldCheck'
  | 'RefreshCw'
  | 'Award'
  | 'CheckCircle2'
  | 'Clock'
  | 'MapPin'
  | 'Sparkles'
  | 'Heart'
  | 'RotateCcw'
  | 'Zap';

export interface TrustBadge {
  id: string;
  icon_name: TrustIconName;
  label: string;
  description?: string;
}

export interface SiteSettings {
  trust_badges: TrustBadge[];
  store_name: string;
  tagline: string;
  phone: string;
  whatsapp: string; // stored and displayed in Bangladesh local format: "01895600794"
  email: string;
  showroom: string;
  map_url?: string;
  hours: string;
  payment_number_primary: string; // Primary personal number (01895600794) for bKash & Nagad
  payment_number_backup: string;  // Backup personal number (01327240031) for bKash & Nagad
  bkash_personal?: string;
  nagad_personal?: string;
  delivery_charge_inside_dhaka: number;
  delivery_charge_outside_dhaka: number;
}
