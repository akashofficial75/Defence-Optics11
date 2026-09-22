import { Category, Product, Order, TrustBadge, SiteSettings } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  {
    id: 'cat-eyeglasses',
    name: 'Eyeglasses',
    slug: 'eyeglasses',
    tagline: 'Clear vision. Better you.',
    description: 'Precision prescription-ready eyeglasses engineered with premium acetate and lightweight titanium.',
    image_url: 'https://images.unsplash.com/photo-1591076482161-42ce6da69f67?auto=format&fit=crop&w=800&q=80',
    sort_order: 1
  },
  {
    id: 'cat-sunglasses',
    name: 'Sunglasses',
    slug: 'sunglasses',
    tagline: 'Style in every sunlight.',
    description: 'Polarized and 100% UV400 protected shades that command attention while safeguarding your eyes.',
    image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=800&q=80',
    sort_order: 2
  },
  {
    id: 'cat-frames',
    name: 'Frames',
    slug: 'frames',
    tagline: 'Your style. Your frame.',
    description: 'Architectural frames and transparent crystal silhouettes designed to fit custom lenses seamlessly.',
    image_url: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=800&q=80',
    sort_order: 3
  },
  {
    id: 'cat-female-glass',
    name: 'Female Glass',
    slug: 'female-glass',
    tagline: 'Elegance crafted for her silhouette.',
    description: 'Bespoke feminine silhouettes, cat-eye designs, and gentle pastel tones crafted for everyday grace.',
    image_url: 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=800&q=80',
    sort_order: 4
  },
  {
    id: 'cat-akash-glass',
    name: 'Akash Glass',
    slug: 'akash-glass',
    tagline: 'Signature Luxury Curation.',
    description: 'Exclusive artisanal eyewear and limited-edition frames curated by AkashProg for discerning connoisseurs.',
    image_url: 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=800&q=80',
    sort_order: 5
  }
];

export const INITIAL_PRODUCTS: Product[] = [];

export const INITIAL_ORDERS: Order[] = [];

export const PROMO_CODES = [
  { code: 'DEFENCE10', discount_percentage: 10, description: '10% off on your entire purchase' },
  { code: 'OPTICS20', discount_percentage: 20, description: '20% special launch discount' }
];

export const INITIAL_TRUST_BADGES: TrustBadge[] = [
  {
    id: 'badge-1',
    icon_name: 'Truck',
    label: 'Nationwide 48H',
    description: 'Fast, secure delivery across all 64 districts in Bangladesh'
  },
  {
    id: 'badge-2',
    icon_name: 'ShieldCheck',
    label: '1-Yr Warranty',
    description: 'Guaranteed optical precision and manufacturer warranty'
  },
  {
    id: 'badge-3',
    icon_name: 'RefreshCw',
    label: '7-Day Returns',
    description: 'Hassle-free exchanges if the frame fit is not perfect'
  }
];

/**
 * Normalizes any Bangladesh phone input to local format e.g. "01895600794".
 * If input is "8801895600794", converts to "01895600794".
 * If input is "+880 1895-600794", converts to "01895600794".
 */
export function formatLocalPhoneNumber(rawPhone: string = '01895600794'): string {
  if (!rawPhone) return '01895600794';
  let digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('880')) {
    digits = '0' + digits.slice(3);
  }
  return digits || '01895600794';
}

/**
 * Automatically converts a local format number (e.g. "01895600794")
 * to international wa.me format by replacing the leading 0 with 880 -> "8801895600794".
 */
export function formatWhatsAppInternational(rawPhone: string = '01895600794'): string {
  if (!rawPhone) return '8801895600794';
  const digits = rawPhone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '880' + digits.slice(1);
  }
  if (digits.startsWith('880')) {
    return digits;
  }
  return digits ? `880${digits}` : '8801895600794';
}

/**
 * Generates an actual wa.me link with the international converted number and optional pre-filled text.
 * E.g. buildWhatsAppLink('01895600794') -> "https://wa.me/8801895600794"
 */
export function buildWhatsAppLink(rawPhone: string = '01895600794', message?: string): string {
  const intl = formatWhatsAppInternational(rawPhone);
  const base = `https://wa.me/${intl}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

const getEnvVar = (key: string, fallback: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
      return (import.meta.env[key] as string).trim() || fallback;
    }
  } catch (e) {
    // fallback
  }
  return fallback;
};

export const GOOGLE_MAPS_URL =
  'https://www.google.com/maps/place/Defence+Optics/@23.8177363,90.3974833,779m/data=!3m2!1e3!4b1!4m6!3m5!1s0x3755c7000f2fa3a3:0xe9dd6dc4e36dca23!8m2!3d23.8177363!4d90.3974833!16s%2Fg%2F11y4rg4y7l!18m1!1e1?entry=ttu&g_ep=EgoyMDI2MDkxNi4wIKXMDSoASAFQAw%3D%3D';

export const INITIAL_SITE_SETTINGS: SiteSettings = {
  trust_badges: INITIAL_TRUST_BADGES,
  store_name: 'Defence Optics',
  tagline: 'See Better. Look Better.',
  phone: '+880 1327-240031',
  whatsapp: '01895600794',
  email: 'defenceopticsinfo@gmail.com',
  showroom: 'Shop 104, Ground Floor, Police Plaza Concord, Gulshan 1, Dhaka 1212',
  map_url: GOOGLE_MAPS_URL,
  hours: 'Sat - Thu: 10:00 AM - 9:00 PM | Friday: 3:00 PM - 9:00 PM',
  payment_number_primary: '01895600794',
  payment_number_backup: '01327240031',
  bkash_personal: '01895600794',
  nagad_personal: '01895600794',
  delivery_charge_inside_dhaka: 100,
  delivery_charge_outside_dhaka: 130
};

export const STORE_CONTACTS = {
  name: INITIAL_SITE_SETTINGS.store_name,
  tagline: INITIAL_SITE_SETTINGS.tagline,
  phone: INITIAL_SITE_SETTINGS.phone,
  whatsapp: INITIAL_SITE_SETTINGS.whatsapp,
  email: INITIAL_SITE_SETTINGS.email,
  showroom: INITIAL_SITE_SETTINGS.showroom,
  mapUrl: GOOGLE_MAPS_URL,
  hours: INITIAL_SITE_SETTINGS.hours,
  paymentNumberPrimary: INITIAL_SITE_SETTINGS.payment_number_primary,
  paymentNumberBackup: INITIAL_SITE_SETTINGS.payment_number_backup,
  bkashPersonal: INITIAL_SITE_SETTINGS.payment_number_primary,
  nagadPersonal: INITIAL_SITE_SETTINGS.payment_number_primary
};

