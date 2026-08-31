import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, symbol: string = "₹"): string {
  return `${symbol}${amount.toFixed(2)}`;
}

export function formatDate(date: number): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(date: number): string {
  return new Date(date).toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(date: number): string {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function generateOrderNumber(prefix: string, counter: number): string {
  return `${prefix}${String(counter).padStart(6, "0")}`;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getElapsedMinutes(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / 60000);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800",
    OCCUPIED: "bg-red-100 text-red-800",
    RESERVED: "bg-yellow-100 text-yellow-800",
    CLEANING: "bg-blue-100 text-blue-800",
    NEW: "bg-blue-100 text-blue-800",
    CONFIRMED: "bg-indigo-100 text-indigo-800",
    PREPARING: "bg-orange-100 text-orange-800",
    READY: "bg-green-100 text-green-800",
    SERVED: "bg-purple-100 text-purple-800",
    COMPLETED: "bg-green-100 text-green-800",
    CANCELLED: "bg-red-100 text-red-800",
    REFUNDED: "bg-gray-100 text-gray-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    PAID: "bg-green-100 text-green-800",
    ACCEPTED: "bg-blue-100 text-blue-800",
    RECEIVED: "bg-green-100 text-green-800",
    STOCK_IN: "bg-green-100 text-green-800",
    STOCK_OUT: "bg-red-100 text-red-800",
    ADJUSTMENT: "bg-yellow-100 text-yellow-800",
    DAMAGED: "bg-red-100 text-red-800",
    SALE: "bg-blue-100 text-blue-800",
    CASH: "bg-green-100 text-green-800",
    UPI: "bg-purple-100 text-purple-800",
    CARD: "bg-blue-100 text-blue-800",
    SPLIT_PAYMENT: "bg-orange-100 text-orange-800",
  };
  return colors[status] || "bg-gray-100 text-gray-800";
}

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  SUPER_ADMIN: [
    "manage_platform", "manage_restaurants", "manage_users", "view_reports",
    "manage_settings", "manage_billing", "manage_inventory", "manage_orders",
    "manage_kitchen", "manage_tables", "manage_menu", "manage_customers",
    "manage_expenses", "manage_refunds", "manage_staff", "manage_audit",
    "manage_loyalty", "manage_notifications",
  ],
  RESTAURANT_OWNER: [
    "manage_restaurant", "manage_users", "view_reports", "manage_settings",
    "manage_billing", "manage_inventory", "manage_orders", "manage_kitchen",
    "manage_tables", "manage_menu", "manage_customers", "manage_expenses",
    "manage_refunds", "manage_staff", "manage_audit", "manage_loyalty",
    "manage_notifications",
  ],
  MANAGER: [
    "view_reports", "manage_orders", "manage_kitchen", "manage_tables",
    "manage_menu", "manage_customers", "manage_expenses", "manage_refunds",
    "manage_staff", "manage_loyalty",
  ],
  CASHIER: [
    "manage_billing", "manage_orders", "manage_customers", "view_reports",
  ],
  KITCHEN: [
    "manage_kitchen", "view_orders",
  ],
  WAITER: [
    "manage_tables", "view_orders", "create_orders",
  ],
};

export function hasPermission(role: string, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
