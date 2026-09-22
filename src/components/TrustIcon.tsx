import React from 'react';
import {
  Truck,
  ShieldCheck,
  RefreshCw,
  Award,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Heart,
  RotateCcw,
  Zap,
  Package
} from 'lucide-react';
import { TrustIconName } from '../types';

export const TRUST_ICON_MAP: Record<string, React.ElementType> = {
  Truck,
  ShieldCheck,
  RefreshCw,
  Award,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Heart,
  RotateCcw,
  Zap,
  Package
};

export const AVAILABLE_TRUST_ICONS: { name: TrustIconName; label: string }[] = [
  { name: 'Truck', label: 'Truck (Shipping / Delivery)' },
  { name: 'ShieldCheck', label: 'Shield Check (Warranty / Authentic)' },
  { name: 'RefreshCw', label: 'Refresh (Returns / Exchange)' },
  { name: 'Award', label: 'Award (Quality / Premium)' },
  { name: 'CheckCircle2', label: 'Check Circle (Guarantee)' },
  { name: 'Clock', label: 'Clock (Fast 48h / Express)' },
  { name: 'Sparkles', label: 'Sparkles (Handcrafted / Luxury)' },
  { name: 'Heart', label: 'Heart (Customer Love)' },
  { name: 'MapPin', label: 'Map Pin (Nationwide / Showroom)' },
  { name: 'RotateCcw', label: 'Rotate Arrow (Easy Replacement)' },
  { name: 'Zap', label: 'Lightning (Instant / Speed)' }
];

interface RenderTrustIconProps {
  name: string;
  className?: string;
}

export const RenderTrustIcon: React.FC<RenderTrustIconProps> = ({ name, className = 'w-4 h-4' }) => {
  const IconComponent = TRUST_ICON_MAP[name] || ShieldCheck;
  return <IconComponent className={className} />;
};
