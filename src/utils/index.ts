// ─────────────────────────────────────────────────────────────────────────────
// LaundryMate POS — Utilities
// ─────────────────────────────────────────────────────────────────────────────

import { APP_CONFIG } from '../constants';

// ─── Currency ─────────────────────────────────────────────────────────────────

/**
 * Format a number as Philippine Peso.
 * e.g. 1234.5 → "₱1,234.50"
 */
export function formatPeso(amount: number): string {
  return (
    APP_CONFIG.currency +
    Number(amount).toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

/**
 * Compact peso for small spaces.
 * e.g. 12500 → "₱12.5k"
 */
export function formatPesoCompact(amount: number): string {
  if (amount >= 1_000_000) return `${APP_CONFIG.currency}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000)     return `${APP_CONFIG.currency}${(amount / 1_000).toFixed(1)}k`;
  return formatPeso(amount);
}

// ─── Dates ────────────────────────────────────────────────────────────────────

/**
 * Format ISO string → "Mar 9, 2:30 PM"
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format ISO string → "Mar 9, 2026"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format ISO string → "2:30 PM"
 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-PH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Relative time: "2 hrs ago", "just now", etc.
 */
export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return formatDate(iso);
}

/**
 * Today's greeting based on hour.
 */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Full date string for headers.
 * e.g. "Monday, March 9, 2026"
 */
export function formatFullDate(date = new Date()): string {
  return date.toLocaleDateString('en-PH', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// ─── ID Generation ────────────────────────────────────────────────────────────

/**
 * Generate a new Order ID.
 * Uses timestamp suffix to ensure uniqueness.
 * e.g. "ORD-00042"
 */
export function generateOrderId(lastId?: string): string {
  if (!lastId) {
    return `ORD-${String(Date.now()).slice(-5)}`;
  }
  // Increment numeric suffix if present
  const match = lastId.match(/^ORD-(\d+)$/);
  if (match) {
    const next = parseInt(match[1], 10) + 1;
    return `ORD-${String(next).padStart(match[1].length, '0')}`;
  }
  return `ORD-${String(Date.now()).slice(-5)}`;
}

/** UUID-like ID for items, expenses, customers */
export function generateId(prefix = ''): string {
  const ts  = Date.now().toString(36);
  const rnd = Math.random().toString(36).slice(2, 7);
  return prefix ? `${prefix}-${ts}${rnd}` : `${ts}${rnd}`;
}

// ─── Order Calculations ───────────────────────────────────────────────────────

export interface OrderTotals {
  servicesSubtotal: number;
  addonsSubtotal: number;
  deliveryFee: number;
  discount: number;
  subtotalBeforeDiscount: number;
  total: number;
  change: number;
}

export function calculateOrderTotals(params: {
  items: Array<{ subtotal: number; addons: Array<{ price: number }> }>;
  deliveryFee: number;
  discount: number;
  amountTendered: number;
}): OrderTotals {
  const servicesSubtotal = params.items.reduce((s, i) => s + i.subtotal, 0);
  const addonsSubtotal   = params.items.reduce(
    (s, i) => s + i.addons.reduce((a, addon) => a + addon.price, 0), 0
  );
  const subtotalBeforeDiscount = servicesSubtotal + addonsSubtotal + params.deliveryFee;
  const total   = Math.max(0, subtotalBeforeDiscount - params.discount);
  const change  = Math.max(0, params.amountTendered - total);

  return {
    servicesSubtotal,
    addonsSubtotal,
    deliveryFee: params.deliveryFee,
    discount: params.discount,
    subtotalBeforeDiscount,
    total,
    change,
  };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#0EA5E9', '#10B981', '#8B5CF6',
  '#F59E0B', '#EF4444', '#06B6D4',
  '#F97316', '#EC4899',
];

export function getAvatarColor(name: string): string {
  return AVATAR_COLORS[(name?.charCodeAt(0) ?? 0) % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// ─── Phone ────────────────────────────────────────────────────────────────────

export function isValidPhilippinePhone(phone: string): boolean {
  return /^09\d{9}$/.test(phone.replace(/\s|-/g, ''));
}

// ─── Number ───────────────────────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}