// src/navigation/types.ts
// All stack and tab param lists in one place.
// Import from here in screens and stacks — never define them inline.

// ─── Stack Param Lists ────────────────────────────────────────────────────────

export type DashboardStackParams = {
  DashboardHome: undefined;
  OrderDetail:   { orderId: string };
  DBBrowser:     undefined;
};

export type OrdersStackParams = {
  OrdersList:  undefined;
  OrderDetail: { orderId: string };
};

export type NewOrderStackParams = {
  NewOrderMain: undefined;
};

export type CustomersStackParams = {
  CustomersList:  undefined;
  CustomerDetail: { customerId: string };
  OrderDetail:    { orderId: string };
};

export type ReportsStackParams = {
  ReportsMain:  undefined;
  ExpensesMain: undefined;
  Settings:     undefined;
};

// ─── Tab Param List ───────────────────────────────────────────────────────────

export type RootTabParams = {
  Dashboard: undefined;
  NewOrder:  undefined;
  Orders:    undefined;
  Customers: undefined;
  Reports:   undefined;
};