import { z } from "zod";

// Auth
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Restaurant
export const restaurantSchema = z.object({
  name: z.string().min(2, "Restaurant name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional().default("India"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gstin: z.string().optional(),
  currency: z.string().default("INR"),
  currencySymbol: z.string().default("₹"),
  taxRate: z.number().min(0).max(100).default(0),
  taxName: z.string().default("GST"),
  invoicePrefix: z.string().default("INV-"),
});

// Branch
export const branchSchema = z.object({
  name: z.string().min(2, "Branch name is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
});

// Category
export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
  displayOrder: z.number().default(0),
});

// Product
export const productSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  costPrice: z.number().min(0, "Cost price must be positive").default(0),
  taxRate: z.number().min(0).max(100).default(0),
  preparationTime: z.number().optional(),
  isAvailable: z.boolean().default(true),
  trackStock: z.boolean().default(false),
  stock: z.number().default(0),
  minStock: z.number().default(0),
  unit: z.string().default("pcs"),
});

// Table
export const tableSchema = z.object({
  number: z.string().min(1, "Table number is required"),
  name: z.string().optional(),
  capacity: z.number().min(1, "Capacity must be at least 1"),
});

// Customer
export const customerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
});

// Order
export const orderItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0),
  discountAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().optional(),
  customerId: z.string().optional(),
  orderType: z.enum(["DINE_IN", "TAKEAWAY", "DELIVERY"]),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  discountAmount: z.number().min(0).default(0),
  tipAmount: z.number().min(0).default(0),
  notes: z.string().optional(),
});

// Payment
export const paymentSchema = z.object({
  method: z.enum(["CASH", "UPI", "CARD", "SPLIT_PAYMENT"]),
  amount: z.number().min(0),
  reference: z.string().optional(),
  splitPayments: z.array(z.object({
    method: z.enum(["CASH", "UPI", "CARD"]),
    amount: z.number().min(0),
    reference: z.string().optional(),
  })).optional(),
});

// Expense
export const expenseSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.number().min(0.01, "Amount must be positive"),
  date: z.number(),
  isRecurring: z.boolean().default(false),
  recurringFrequency: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
  notes: z.string().optional(),
});

// Expense Category
export const expenseCategorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  description: z.string().optional(),
});

// Staff
export const staffSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  role: z.enum(["MANAGER", "CASHIER", "KITCHEN", "WAITER"]),
});

// Refund
export const refundSchema = z.object({
  orderId: z.string(),
  billId: z.string(),
  type: z.enum(["FULL", "PARTIAL"]),
  amount: z.number().min(0.01),
  reason: z.string().min(1, "Refund reason is required"),
  authorizedBy: z.string(),
});

// Inventory Adjustment
export const inventoryAdjustmentSchema = z.object({
  productId: z.string(),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "DAMAGED"]),
  quantity: z.number().min(0.01),
  reason: z.string().optional(),
});

// Settings
export const restaurantSettingsSchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  gstin: z.string().optional(),
  taxRate: z.number().min(0).max(100),
  taxName: z.string(),
  invoicePrefix: z.string(),
  currency: z.string(),
  currencySymbol: z.string(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RestaurantInput = z.infer<typeof restaurantSchema>;
export type BranchInput = z.infer<typeof branchSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type TableInput = z.infer<typeof tableSchema>;
export type CustomerInput = z.infer<typeof customerSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type StaffInput = z.infer<typeof staffSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
