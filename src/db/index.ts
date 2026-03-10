// src/db/index.ts
// LaundryMate POS — SQLite database (expo-sqlite v14)
// No seed data — fresh install starts completely empty.

import * as SQLite from 'expo-sqlite';
import { TABLES } from '../constants';
import type {
  Service, Addon, Customer, Order,
  OrderItem, OrderAddon, Expense, ShopSettings,
} from '../types';

// ─── Connection ───────────────────────────────────────────────────────────────

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) _db = await SQLite.openDatabaseAsync('laundrymate.db');
  return _db;
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS ${TABLES.services} (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    category     TEXT NOT NULL,
    unit         TEXT NOT NULL,
    price        REAL NOT NULL,
    duration     TEXT NOT NULL DEFAULT '',
    description  TEXT NOT NULL DEFAULT '',
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ${TABLES.addons} (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    price       REAL NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active   INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS ${TABLES.customers} (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    phone          TEXT NOT NULL,
    email          TEXT,
    address        TEXT,
    loyalty_points INTEGER NOT NULL DEFAULT 0,
    total_orders   INTEGER NOT NULL DEFAULT 0,
    total_spent    REAL    NOT NULL DEFAULT 0,
    join_date      TEXT    NOT NULL,
    created_at     TEXT    NOT NULL,
    updated_at     TEXT    NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ${TABLES.orders} (
    id                TEXT PRIMARY KEY,
    customer_id       TEXT,
    customer_name     TEXT NOT NULL,
    customer_phone    TEXT,
    services_subtotal REAL NOT NULL DEFAULT 0,
    addons_subtotal   REAL NOT NULL DEFAULT 0,
    delivery_fee      REAL NOT NULL DEFAULT 0,
    discount          REAL NOT NULL DEFAULT 0,
    total             REAL NOT NULL DEFAULT 0,
    amount_paid       REAL NOT NULL DEFAULT 0,
    change_amount     REAL NOT NULL DEFAULT 0,
    payment_method    TEXT,
    status            TEXT NOT NULL DEFAULT 'pending',
    is_pickup         INTEGER NOT NULL DEFAULT 0,
    pickup_address    TEXT,
    delivery_address  TEXT,
    scheduled_at      TEXT,
    driver_name       TEXT,
    delivery_status   TEXT,
    notes             TEXT,
    created_at        TEXT NOT NULL,
    updated_at        TEXT NOT NULL,
    ready_at          TEXT,
    claimed_at        TEXT,
    FOREIGN KEY (customer_id) REFERENCES ${TABLES.customers}(id)
  );
  CREATE TABLE IF NOT EXISTS ${TABLES.order_items} (
    id             TEXT PRIMARY KEY,
    order_id       TEXT NOT NULL,
    service_id     TEXT NOT NULL,
    service_name   TEXT NOT NULL,
    qty            REAL NOT NULL,
    unit           TEXT NOT NULL,
    price_per_unit REAL NOT NULL,
    subtotal       REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES ${TABLES.orders}(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS ${TABLES.order_addons} (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id TEXT NOT NULL,
    order_id      TEXT NOT NULL,
    addon_id      TEXT NOT NULL,
    addon_name    TEXT NOT NULL,
    price         REAL NOT NULL,
    FOREIGN KEY (order_item_id) REFERENCES ${TABLES.order_items}(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS ${TABLES.expenses} (
    id             TEXT PRIMARY KEY,
    category       TEXT NOT NULL,
    category_label TEXT NOT NULL,
    description    TEXT NOT NULL,
    amount         REAL NOT NULL,
    date           TEXT NOT NULL,
    receipt        TEXT,
    created_at     TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ${TABLES.settings} (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_orders_status     ON ${TABLES.orders}(status);
  CREATE INDEX IF NOT EXISTS idx_orders_created    ON ${TABLES.orders}(created_at);
  CREATE INDEX IF NOT EXISTS idx_orders_customer   ON ${TABLES.orders}(customer_id);
  CREATE INDEX IF NOT EXISTS idx_order_items_order ON ${TABLES.order_items}(order_id);
  CREATE INDEX IF NOT EXISTS idx_order_addons_item ON ${TABLES.order_addons}(order_item_id);
  CREATE INDEX IF NOT EXISTS idx_expenses_date     ON ${TABLES.expenses}(date);
  CREATE INDEX IF NOT EXISTS idx_customers_phone   ON ${TABLES.customers}(phone);
`;

// ─── Initialize ───────────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  const db = await getDb();
  await db.execAsync(CREATE_TABLES_SQL);
  console.log('[DB] Initialized ✓');
}

// ─── Row Mappers ──────────────────────────────────────────────────────────────

function mapService(row: any): Service {
  return {
    id: row.id, name: row.name, category: row.category,
    unit: row.unit, price: row.price, duration: row.duration,
    description: row.description, isActive: row.is_active === 1,
    createdAt: row.created_at,
  };
}

function mapAddon(row: any): Addon {
  return {
    id: row.id, name: row.name, price: row.price,
    description: row.description, isActive: row.is_active === 1,
  };
}

function mapCustomer(row: any): Customer {
  return {
    id: row.id, name: row.name, phone: row.phone,
    email: row.email, address: row.address,
    loyaltyPoints: row.loyalty_points, totalOrders: row.total_orders,
    totalSpent: row.total_spent, joinDate: row.join_date,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapExpense(row: any): Expense {
  return {
    id: row.id, category: row.category, categoryLabel: row.category_label,
    description: row.description, amount: row.amount,
    date: row.date, receipt: row.receipt, createdAt: row.created_at,
  };
}

async function buildOrder(db: SQLite.SQLiteDatabase, row: any): Promise<Order> {
  const itemRows = await db.getAllAsync<any>(
    `SELECT * FROM ${TABLES.order_items} WHERE order_id = ? ORDER BY rowid`, [row.id]
  );
  const items: OrderItem[] = await Promise.all(
    itemRows.map(async (ir) => {
      const addonRows = await db.getAllAsync<any>(
        `SELECT * FROM ${TABLES.order_addons} WHERE order_item_id = ?`, [ir.id]
      );
      return {
        id: ir.id, orderId: ir.order_id, serviceId: ir.service_id,
        serviceName: ir.service_name, qty: ir.qty, unit: ir.unit,
        pricePerUnit: ir.price_per_unit, subtotal: ir.subtotal,
        addons: addonRows.map((ar) => ({
          addonId: ar.addon_id, addonName: ar.addon_name, price: ar.price,
        })),
      };
    })
  );
  return {
    id: row.id, customerId: row.customer_id, customerName: row.customer_name,
    customerPhone: row.customer_phone, items,
    servicesSubtotal: row.services_subtotal, addonsSubtotal: row.addons_subtotal,
    deliveryFee: row.delivery_fee, discount: row.discount, total: row.total,
    amountPaid: row.amount_paid, change: row.change_amount,
    paymentMethod: row.payment_method, status: row.status,
    isPickup: row.is_pickup === 1, pickupAddress: row.pickup_address,
    deliveryAddress: row.delivery_address, scheduledAt: row.scheduled_at,
    driverName: row.driver_name, deliveryStatus: row.delivery_status,
    notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
    readyAt: row.ready_at, claimedAt: row.claimed_at,
  };
}

// ─── Services ─────────────────────────────────────────────────────────────────

export async function dbGetServices(activeOnly = true): Promise<Service[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM ${TABLES.services}${activeOnly ? ' WHERE is_active = 1' : ''} ORDER BY category, name`
  );
  return rows.map(mapService);
}

export async function dbGetServiceById(id: string): Promise<Service | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM ${TABLES.services} WHERE id = ?`, [id]);
  return row ? mapService(row) : null;
}

export async function dbInsertService(s: Omit<Service, 'createdAt'>): Promise<Service> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO ${TABLES.services}
     (id, name, category, unit, price, duration, description, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [s.id, s.name, s.category, s.unit, s.price, s.duration ?? '', s.description ?? '', s.isActive ? 1 : 0, now]
  );
  return (await dbGetServiceById(s.id))!;
}

export async function dbUpdateService(
  id: string,
  updates: Partial<Pick<Service, 'name' | 'category' | 'unit' | 'price' | 'duration' | 'description' | 'isActive'>>
): Promise<Service | null> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.name        !== undefined) { fields.push('name = ?');        values.push(updates.name); }
  if (updates.category    !== undefined) { fields.push('category = ?');    values.push(updates.category); }
  if (updates.unit        !== undefined) { fields.push('unit = ?');        values.push(updates.unit); }
  if (updates.price       !== undefined) { fields.push('price = ?');       values.push(updates.price); }
  if (updates.duration    !== undefined) { fields.push('duration = ?');    values.push(updates.duration); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.isActive    !== undefined) { fields.push('is_active = ?');   values.push(updates.isActive ? 1 : 0); }
  if (fields.length === 0) return dbGetServiceById(id);
  values.push(id);
  await db.runAsync(`UPDATE ${TABLES.services} SET ${fields.join(', ')} WHERE id = ?`, values);
  return dbGetServiceById(id);
}

export async function dbDeleteService(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${TABLES.services} WHERE id = ?`, [id]);
}

// ─── Add-ons ──────────────────────────────────────────────────────────────────

export async function dbGetAddons(activeOnly = true): Promise<Addon[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM ${TABLES.addons}${activeOnly ? ' WHERE is_active = 1' : ''} ORDER BY name`
  );
  return rows.map(mapAddon);
}

export async function dbGetAddonById(id: string): Promise<Addon | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM ${TABLES.addons} WHERE id = ?`, [id]);
  return row ? mapAddon(row) : null;
}

export async function dbInsertAddon(a: Omit<Addon, 'isActive'>): Promise<Addon> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO ${TABLES.addons} (id, name, price, description, is_active) VALUES (?, ?, ?, ?, 1)`,
    [a.id, a.name, a.price, a.description ?? '']
  );
  return (await dbGetAddonById(a.id))!;
}

export async function dbUpdateAddon(
  id: string,
  updates: Partial<Pick<Addon, 'name' | 'price' | 'description' | 'isActive'>>
): Promise<Addon | null> {
  const db = await getDb();
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.name        !== undefined) { fields.push('name = ?');        values.push(updates.name); }
  if (updates.price       !== undefined) { fields.push('price = ?');       values.push(updates.price); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.isActive    !== undefined) { fields.push('is_active = ?');   values.push(updates.isActive ? 1 : 0); }
  if (fields.length === 0) return dbGetAddonById(id);
  values.push(id);
  await db.runAsync(`UPDATE ${TABLES.addons} SET ${fields.join(', ')} WHERE id = ?`, values);
  return dbGetAddonById(id);
}

export async function dbDeleteAddon(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${TABLES.addons} WHERE id = ?`, [id]);
}

// ─── Customers ────────────────────────────────────────────────────────────────

export async function dbGetCustomers(): Promise<Customer[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM ${TABLES.customers} ORDER BY name`);
  return rows.map(mapCustomer);
}

export async function dbGetCustomerById(id: string): Promise<Customer | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM ${TABLES.customers} WHERE id = ?`, [id]);
  return row ? mapCustomer(row) : null;
}

export async function dbSearchCustomers(query: string): Promise<Customer[]> {
  const db = await getDb();
  const q = `%${query}%`;
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM ${TABLES.customers} WHERE name LIKE ? OR phone LIKE ? OR email LIKE ? ORDER BY name LIMIT 20`,
    [q, q, q]
  );
  return rows.map(mapCustomer);
}

export async function dbInsertCustomer(
  data: Omit<Customer, 'totalOrders' | 'totalSpent' | 'loyaltyPoints' | 'createdAt' | 'updatedAt'>
): Promise<Customer> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO ${TABLES.customers}
     (id, name, phone, email, address, loyalty_points, total_orders, total_spent, join_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?, ?)`,
    [data.id, data.name, data.phone, data.email ?? null, data.address ?? null, data.joinDate, now, now]
  );
  return (await dbGetCustomerById(data.id))!;
}

export async function dbUpdateCustomerStats(id: string, amountPaid: number): Promise<void> {
  const db = await getDb();
  const loyaltyEarned = Math.floor(amountPaid / 100);
  await db.runAsync(
    `UPDATE ${TABLES.customers}
     SET total_orders = total_orders + 1, total_spent = total_spent + ?,
         loyalty_points = loyalty_points + ?, updated_at = ?
     WHERE id = ?`,
    [amountPaid, loyaltyEarned, new Date().toISOString(), id]
  );
}

// ─── Orders ───────────────────────────────────────────────────────────────────

export async function dbGetOrders(): Promise<Order[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM ${TABLES.orders} ORDER BY created_at DESC`);
  return Promise.all(rows.map((r) => buildOrder(db, r)));
}

export async function dbGetOrderById(id: string): Promise<Order | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<any>(`SELECT * FROM ${TABLES.orders} WHERE id = ?`, [id]);
  return row ? buildOrder(db, row) : null;
}

export async function dbGetOrdersByCustomer(customerId: string): Promise<Order[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT * FROM ${TABLES.orders} WHERE customer_id = ? ORDER BY created_at DESC`, [customerId]
  );
  return Promise.all(rows.map((r) => buildOrder(db, r)));
}

export async function dbInsertOrder(order: Order): Promise<Order> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO ${TABLES.orders}
     (id, customer_id, customer_name, customer_phone,
      services_subtotal, addons_subtotal, delivery_fee, discount,
      total, amount_paid, change_amount, payment_method, status,
      is_pickup, pickup_address, delivery_address, scheduled_at,
      driver_name, delivery_status, notes,
      created_at, updated_at, ready_at, claimed_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      order.id, order.customerId, order.customerName, order.customerPhone,
      order.servicesSubtotal, order.addonsSubtotal, order.deliveryFee, order.discount,
      order.total, order.amountPaid, order.change, order.paymentMethod, order.status,
      order.isPickup ? 1 : 0, order.pickupAddress, order.deliveryAddress, order.scheduledAt,
      order.driverName, order.deliveryStatus, order.notes,
      order.createdAt, order.updatedAt, order.readyAt, order.claimedAt,
    ]
  );
  for (const item of order.items) {
    await db.runAsync(
      `INSERT INTO ${TABLES.order_items}
       (id, order_id, service_id, service_name, qty, unit, price_per_unit, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [item.id, item.orderId, item.serviceId, item.serviceName, item.qty, item.unit, item.pricePerUnit, item.subtotal]
    );
    for (const addon of item.addons) {
      await db.runAsync(
        `INSERT INTO ${TABLES.order_addons} (order_item_id, order_id, addon_id, addon_name, price) VALUES (?, ?, ?, ?, ?)`,
        [item.id, order.id, addon.addonId, addon.addonName, addon.price]
      );
    }
  }
  if (order.customerId && order.amountPaid > 0) {
    await dbUpdateCustomerStats(order.customerId, order.amountPaid);
  }
  return (await dbGetOrderById(order.id))!;
}

export async function dbUpdateOrderStatus(id: string, status: Order['status']): Promise<Order | null> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE ${TABLES.orders}
     SET status = ?, updated_at = ?,
         ready_at   = CASE WHEN ? = 'ready'     THEN ? ELSE ready_at   END,
         claimed_at = CASE WHEN ? = 'completed'  THEN ? ELSE claimed_at END
     WHERE id = ?`,
    [status, now, status, now, status, now, id]
  );
  return dbGetOrderById(id);
}

export async function dbUpdateDeliveryStatus(
  id: string, deliveryStatus: Order['deliveryStatus'], driverName?: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE ${TABLES.orders}
     SET delivery_status = ?, driver_name = COALESCE(?, driver_name), updated_at = ?
     WHERE id = ?`,
    [deliveryStatus, driverName ?? null, new Date().toISOString(), id]
  );
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export async function dbGetExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`SELECT * FROM ${TABLES.expenses} ORDER BY date DESC`);
  return rows.map(mapExpense);
}

export async function dbInsertExpense(expense: Omit<Expense, 'createdAt'>): Promise<Expense> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO ${TABLES.expenses}
     (id, category, category_label, description, amount, date, receipt, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [expense.id, expense.category, expense.categoryLabel, expense.description,
     expense.amount, expense.date, expense.receipt ?? null, now]
  );
  const row = await db.getFirstAsync<any>(`SELECT * FROM ${TABLES.expenses} WHERE id = ?`, [expense.id]);
  return mapExpense(row);
}

export async function dbDeleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM ${TABLES.expenses} WHERE id = ?`, [id]);
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export async function dbGetSettings(): Promise<Partial<ShopSettings>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM ${TABLES.settings}`
  );
  const result: Record<string, any> = {};
  for (const row of rows) {
    const v = row.value;
    result[row.key] =
      v === 'true'  ? true  :
      v === 'false' ? false :
      !isNaN(Number(v)) && v !== '' ? Number(v) : v;
  }
  return result as Partial<ShopSettings>;
}

export async function dbSetSetting(key: keyof ShopSettings, value: any): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO ${TABLES.settings} (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    [key, String(value), new Date().toISOString()]
  );
}

// ─── Dashboard Stats ──────────────────────────────────────────────────────────

export async function dbGetDashboardStats() {
  const db    = await getDb();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const todayRow = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as order_count, COALESCE(SUM(amount_paid), 0) as revenue
     FROM ${TABLES.orders} WHERE created_at >= ? AND amount_paid > 0`,
    [today.toISOString()]
  );
  const pendingRow = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as cnt FROM ${TABLES.orders} WHERE status IN ('pending','processing')`
  );
  const readyRow = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as cnt FROM ${TABLES.orders} WHERE status = 'ready'`
  );
  const pickupRow = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as cnt FROM ${TABLES.orders}
     WHERE is_pickup = 1 AND status IN ('pending','processing','ready')`
  );
  const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 7); weekStart.setHours(0, 0, 0, 0);
  const weekRow = await db.getFirstAsync<any>(
    `SELECT COALESCE(SUM(amount_paid), 0) as revenue
     FROM ${TABLES.orders} WHERE created_at >= ? AND amount_paid > 0`,
    [weekStart.toISOString()]
  );
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const monthRow = await db.getFirstAsync<any>(
    `SELECT COALESCE(SUM(amount_paid), 0) as revenue
     FROM ${TABLES.orders} WHERE created_at >= ? AND amount_paid > 0`,
    [monthStart.toISOString()]
  );
  const customersRow = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as cnt FROM ${TABLES.customers}`
  );
  const expensesRow = await db.getFirstAsync<any>(
    `SELECT COALESCE(SUM(amount), 0) as total FROM ${TABLES.expenses} WHERE date >= ?`,
    [monthStart.toISOString()]
  );

  const monthRevenue  = monthRow?.revenue ?? 0;
  const totalExpenses = expensesRow?.total ?? 0;

  return {
    todayRevenue:       todayRow?.revenue ?? 0,
    todayOrderCount:    todayRow?.order_count ?? 0,
    pendingCount:       pendingRow?.cnt ?? 0,
    readyCount:         readyRow?.cnt ?? 0,
    pickupPendingCount: pickupRow?.cnt ?? 0,
    weekRevenue:        weekRow?.revenue ?? 0,
    monthRevenue,
    totalCustomers:     customersRow?.cnt ?? 0,
    totalExpenses,
    netProfit:          monthRevenue - totalExpenses,
  };
}