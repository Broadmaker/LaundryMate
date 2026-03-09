// ─────────────────────────────────────────────────────────────────────────────
// LaundryMate POS — Constants
// ─────────────────────────────────────────────────────────────────────────────

import type {
  OrderStatus,
  DeliveryStatus,
  PaymentMethod,
  ServiceCategory,
  ExpenseCategory,
} from '../types';

// ─── Order Status ─────────────────────────────────────────────────────────────

export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bgClass: string; textClass: string; dotColor: string }
> = {
  pending: {
    label: 'Pending',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-800',
    dotColor: '#F59E0B',
  },
  processing: {
    label: 'Processing',
    bgClass: 'bg-violet-50',
    textClass: 'text-violet-800',
    dotColor: '#8B5CF6',
  },
  ready: {
    label: 'Ready',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-800',
    dotColor: '#10B981',
  },
  completed: {
    label: 'Completed',
    bgClass: 'bg-sky-50',
    textClass: 'text-sky-700',
    dotColor: '#0EA5E9',
  },
  cancelled: {
    label: 'Cancelled',
    bgClass: 'bg-red-50',
    textClass: 'text-red-800',
    dotColor: '#EF4444',
  },
};

// Next status flow for order progression
export const ORDER_STATUS_FLOW: Partial<
  Record<OrderStatus, { next: OrderStatus; label: string }>
> = {
  pending:    { next: 'processing', label: 'Start Processing' },
  processing: { next: 'ready',      label: 'Mark as Ready'    },
  ready:      { next: 'completed',  label: 'Mark as Claimed'  },
};

// ─── Delivery Status ──────────────────────────────────────────────────────────

export const DELIVERY_STATUS_CONFIG: Record<
  DeliveryStatus,
  { label: string; color: string }
> = {
  pending:          { label: 'Awaiting Pickup',   color: '#F59E0B' },
  picked_up:        { label: 'Picked Up',         color: '#8B5CF6' },
  out_for_delivery: { label: 'Out for Delivery',  color: '#0EA5E9' },
  delivered:        { label: 'Delivered',         color: '#10B981' },
  failed:           { label: 'Failed',            color: '#EF4444' },
};

// ─── Payment Methods ──────────────────────────────────────────────────────────

export const PAYMENT_METHODS: { id: PaymentMethod; label: string }[] = [
  { id: 'cash',          label: 'Cash'          },
  { id: 'gcash',         label: 'GCash'         },
  { id: 'maya',          label: 'Maya'          },
  { id: 'bank_transfer', label: 'Bank Transfer' },
];

// ─── Service Categories ───────────────────────────────────────────────────────

export const SERVICE_CATEGORIES: { id: ServiceCategory; label: string }[] = [
  { id: 'basic',     label: 'Basic'     },
  { id: 'standard',  label: 'Standard'  },
  { id: 'premium',   label: 'Premium'   },
  { id: 'express',   label: 'Express'   },
  { id: 'bulky',     label: 'Bulky'     },
  { id: 'specialty', label: 'Specialty' },
];

// ─── Expense Categories ───────────────────────────────────────────────────────

export const EXPENSE_CATEGORIES: {
  id: ExpenseCategory;
  label: string;
  color: string;
}[] = [
  { id: 'utilities',    label: 'Utilities',    color: '#F59E0B' },
  { id: 'salaries',     label: 'Salaries',     color: '#8B5CF6' },
  { id: 'supplies',     label: 'Supplies',     color: '#10B981' },
  { id: 'maintenance',  label: 'Maintenance',  color: '#EF4444' },
  { id: 'rent',         label: 'Rent',         color: '#0EA5E9' },
  { id: 'miscellaneous',label: 'Miscellaneous',color: '#64748B' },
];

// ─── App Config ───────────────────────────────────────────────────────────────

export const APP_CONFIG = {
  name:    'LaundryMate POS',
  version: '1.0.0',
  currency: '₱',
  loyaltyRatio: 100,   // ₱100 spent = 1 loyalty point
  defaultExpressMultiplier: 2,
  maxDiscountPercent: 50,
};

// ─── DB Table Names ───────────────────────────────────────────────────────────

export const TABLES = {
  services:     'services',
  addons:       'addons',
  customers:    'customers',
  orders:       'orders',
  order_items:  'order_items',
  order_addons: 'order_addons',
  expenses:     'expenses',
  settings:     'settings',
} as const;