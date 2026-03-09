// ─────────────────────────────────────────────────────────────────────────────
// LaundryMate POS — Core Types
// ─────────────────────────────────────────────────────────────────────────────

// ─── Enums ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type DeliveryStatus =
  | 'pending'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'failed';

export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'bank_transfer';

export type ServiceCategory =
  | 'basic'
  | 'standard'
  | 'premium'
  | 'express'
  | 'bulky'
  | 'specialty';

export type ExpenseCategory =
  | 'utilities'
  | 'salaries'
  | 'supplies'
  | 'maintenance'
  | 'rent'
  | 'miscellaneous';

// ─── Service & Add-on ────────────────────────────────────────────────────────

export interface Service {
  id: string;
  name: string;
  category: ServiceCategory;
  unit: string; // 'kg' | 'pc' | 'pair'
  price: number;
  duration: string; // e.g. "2-3 days"
  description: string;
  isActive: boolean;
  createdAt: string;
}

export interface Addon {
  id: string;
  name: string;
  price: number;
  description: string;
  isActive: boolean;
}

// ─── Customer ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  loyaltyPoints: number;
  totalOrders: number;
  totalSpent: number;
  joinDate: string; // ISO date string
  createdAt: string;
  updatedAt: string;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export interface OrderAddon {
  addonId: string;
  addonName: string;
  price: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  serviceId: string;
  serviceName: string;
  qty: number;
  unit: string;
  pricePerUnit: number;
  subtotal: number;
  addons: OrderAddon[];
}

export interface Order {
  id: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;

  // Items
  items: OrderItem[];

  // Financials
  servicesSubtotal: number;
  addonsSubtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  amountPaid: number;
  change: number;

  // Payment
  paymentMethod: PaymentMethod | null;

  // Status
  status: OrderStatus;

  // Pickup & Delivery
  isPickup: boolean;
  pickupAddress: string | null;
  deliveryAddress: string | null;
  scheduledAt: string | null;
  driverName: string | null;
  deliveryStatus: DeliveryStatus | null;

  // Meta
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt: string | null;
  claimedAt: string | null;
}

// ─── Expense ─────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  category: ExpenseCategory;
  categoryLabel: string;
  description: string;
  amount: number;
  date: string; // ISO date string
  receipt: string | null; // file path or null
  createdAt: string;
}

// ─── Settings ────────────────────────────────────────────────────────────────

export interface ShopSettings {
  shopName: string;
  address: string;
  phone: string;
  email: string;
  tin: string;
  currency: string;
  loyaltyEnabled: boolean;
  pickupEnabled: boolean;
  expressMultiplier: number;
  receiptFooter: string;
}

// ─── Reports / Stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  todayRevenue: number;
  todayOrderCount: number;
  pendingCount: number;
  processingCount: number;
  readyCount: number;
  pickupPendingCount: number;
  weekRevenue: number;
  monthRevenue: number;
  totalCustomers: number;
  totalExpenses: number;
  netProfit: number;
}

export interface DailyReportPoint {
  date: string;
  revenue: number;
  expenses: number;
  orderCount: number;
}

export interface ServiceReportItem {
  serviceId: string;
  serviceName: string;
  totalRevenue: number;
  addonRevenue: number;
  unitsSold: number;
}

export interface ExpenseReportItem {
  category: ExpenseCategory;
  categoryLabel: string;
  total: number;
  count: number;
  percentage: number;
}