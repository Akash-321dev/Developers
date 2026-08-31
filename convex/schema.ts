import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ============================================================
  // ORGANIZATIONS & RESTAURANTS
  // ============================================================
  organizations: defineTable({
    name: v.string(),
    slug: v.string(),
    plan: v.union(v.literal("free"), v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    maxBranches: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  restaurants: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    slug: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    gstin: v.optional(v.string()),
    currency: v.string(),
    currencySymbol: v.string(),
    taxRate: v.number(),
    taxName: v.string(),
    invoicePrefix: v.string(),
    invoiceCounter: v.number(),
    logo: v.optional(v.string()),
    businessHours: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_slug", ["slug"]),

  branches: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_restaurant", ["restaurantId"]),

  // ============================================================
  // USERS & AUTH
  // ============================================================
  users: defineTable({
    authId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_authId", ["authId"])
    .index("by_email", ["email"]),

  // Link users to restaurants with roles
  restaurantUsers: defineTable({
    userId: v.id("users"),
    restaurantId: v.id("restaurants"),
    branchId: v.optional(v.id("branches")),
    role: v.union(
      v.literal("SUPER_ADMIN"),
      v.literal("RESTAURANT_OWNER"),
      v.literal("MANAGER"),
      v.literal("CASHIER"),
      v.literal("KITCHEN"),
      v.literal("WAITER")
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_restaurant_user", ["restaurantId", "userId"])
    .index("by_branch", ["branchId"]),

  // ============================================================
  // CATEGORIES & PRODUCTS
  // ============================================================
  categories: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"]),

  products: defineTable({
    restaurantId: v.id("restaurants"),
    categoryId: v.id("categories"),
    name: v.string(),
    description: v.optional(v.string()),
    sku: v.optional(v.string()),
    barcode: v.optional(v.string()),
    price: v.number(),
    costPrice: v.number(),
    taxRate: v.number(),
    image: v.optional(v.string()),
    preparationTime: v.optional(v.number()),
    isAvailable: v.boolean(),
    trackStock: v.boolean(),
    stock: v.number(),
    minStock: v.number(),
    unit: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_category", ["categoryId"])
    .index("by_restaurant_active", ["restaurantId", "isAvailable"])
    .index("by_barcode", ["restaurantId", "barcode"])
    .index("by_sku", ["restaurantId", "sku"]),

  // ============================================================
  // RECIPES (ingredients per product)
  // ============================================================
  recipes: defineTable({
    productId: v.id("products"),
    ingredientId: v.id("products"),
    quantity: v.number(),
    unit: v.string(),
  })
    .index("by_product", ["productId"])
    .index("by_ingredient", ["ingredientId"]),

  // ============================================================
  // INVENTORY
  // ============================================================
  inventory: defineTable({
    restaurantId: v.id("restaurants"),
    productId: v.id("products"),
    currentStock: v.number(),
    minStock: v.number(),
    maxStock: v.number(),
    unit: v.string(),
    purchaseCost: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_product", ["productId"]),

  inventoryTransactions: defineTable({
    restaurantId: v.id("restaurants"),
    productId: v.id("products"),
    type: v.union(
      v.literal("STOCK_IN"),
      v.literal("STOCK_OUT"),
      v.literal("ADJUSTMENT"),
      v.literal("DAMAGED"),
      v.literal("SALE"),
      v.literal("RETURN"),
      v.literal("RECIPE_DEDUCTION")
    ),
    quantity: v.number(),
    previousStock: v.number(),
    newStock: v.number(),
    reason: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_product", ["productId"])
    .index("by_type", ["restaurantId", "type"])
    .index("by_created", ["restaurantId", "createdAt"]),

  suppliers: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"]),

  purchaseOrders: defineTable({
    restaurantId: v.id("restaurants"),
    supplierId: v.id("suppliers"),
    status: v.union(
      v.literal("PENDING"),
      v.literal("CONFIRMED"),
      v.literal("RECEIVED"),
      v.literal("CANCELLED")
    ),
    totalAmount: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    receivedAt: v.optional(v.number()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_supplier", ["supplierId"]),

  purchaseOrderItems: defineTable({
    purchaseOrderId: v.id("purchaseOrders"),
    productId: v.id("products"),
    quantity: v.number(),
    unitCost: v.number(),
    totalCost: v.number(),
  }).index("by_purchase_order", ["purchaseOrderId"]),

  // ============================================================
  // TABLES
  // ============================================================
  tables: defineTable({
    restaurantId: v.id("restaurants"),
    branchId: v.optional(v.id("branches")),
    number: v.string(),
    name: v.optional(v.string()),
    capacity: v.number(),
    status: v.union(
      v.literal("AVAILABLE"),
      v.literal("OCCUPIED"),
      v.literal("RESERVED"),
      v.literal("CLEANING")
    ),
    currentOrderId: v.optional(v.id("orders")),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_branch", ["branchId"])
    .index("by_status", ["restaurantId", "status"]),

  // ============================================================
  // CUSTOMERS
  // ============================================================
  customers: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    totalOrders: v.number(),
    totalSpending: v.number(),
    loyaltyPoints: v.number(),
    tier: v.union(v.literal("BRONZE"), v.literal("SILVER"), v.literal("GOLD"), v.literal("PLATINUM")),
    lastOrderAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_phone", ["restaurantId", "phone"]),

  // ============================================================
  // ORDERS
  // ============================================================
  orders: defineTable({
    restaurantId: v.id("restaurants"),
    branchId: v.optional(v.id("branches")),
    tableId: v.optional(v.id("tables")),
    customerId: v.optional(v.id("customers")),
    orderNumber: v.string(),
    orderType: v.union(v.literal("DINE_IN"), v.literal("TAKEAWAY"), v.literal("DELIVERY")),
    status: v.union(
      v.literal("NEW"),
      v.literal("CONFIRMED"),
      v.literal("PREPARING"),
      v.literal("READY"),
      v.literal("SERVED"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED"),
      v.literal("REFUNDED")
    ),
    subtotal: v.number(),
    taxAmount: v.number(),
    discountAmount: v.number(),
    tipAmount: v.number(),
    totalAmount: v.number(),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_status", ["restaurantId", "status"])
    .index("by_table", ["tableId"])
    .index("by_customer", ["customerId"])
    .index("by_created", ["restaurantId", "createdAt"])
    .index("by_branch", ["branchId"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    productName: v.string(),
    quantity: v.number(),
    unitPrice: v.number(),
    taxRate: v.number(),
    taxAmount: v.number(),
    discountAmount: v.number(),
    totalAmount: v.number(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("PREPARING"),
      v.literal("READY"),
      v.literal("SERVED"),
      v.literal("CANCELLED")
    ),
  })
    .index("by_order", ["orderId"])
    .index("by_product", ["productId"]),

  // ============================================================
  // KOT (Kitchen Order Tickets)
  // ============================================================
  kots: defineTable({
    restaurantId: v.id("restaurants"),
    orderId: v.id("orders"),
    kotNumber: v.string(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("ACCEPTED"),
      v.literal("PREPARING"),
      v.literal("READY"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED")
    ),
    priority: v.union(v.literal("NORMAL"), v.literal("HIGH"), v.literal("URGENT")),
    tableNumber: v.optional(v.string()),
    orderType: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_order", ["orderId"])
    .index("by_status", ["restaurantId", "status"]),

  kotItems: defineTable({
    kotId: v.id("kots"),
    productId: v.id("products"),
    productName: v.string(),
    quantity: v.number(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("PENDING"),
      v.literal("PREPARING"),
      v.literal("READY"),
      v.literal("CANCELLED")
    ),
  }).index("by_kot", ["kotId"]),

  // ============================================================
  // BILLS & PAYMENTS
  // ============================================================
  bills: defineTable({
    restaurantId: v.id("restaurants"),
    orderId: v.id("orders"),
    billNumber: v.string(),
    customerId: v.optional(v.id("customers")),
    subtotal: v.number(),
    taxAmount: v.number(),
    discountAmount: v.number(),
    tipAmount: v.number(),
    totalAmount: v.number(),
    paidAmount: v.number(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("PAID"),
      v.literal("PARTIALLY_PAID"),
      v.literal("REFUNDED"),
      v.literal("CANCELLED")
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_order", ["orderId"])
    .index("by_billNumber", ["restaurantId", "billNumber"])
    .index("by_customer", ["customerId"])
    .index("by_status", ["restaurantId", "status"]),

  payments: defineTable({
    billId: v.id("bills"),
    restaurantId: v.id("restaurants"),
    orderId: v.id("orders"),
    method: v.union(
      v.literal("CASH"),
      v.literal("UPI"),
      v.literal("CARD"),
      v.literal("SPLIT_PAYMENT")
    ),
    amount: v.number(),
    reference: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_bill", ["billId"])
    .index("by_restaurant", ["restaurantId"])
    .index("by_created", ["restaurantId", "createdAt"]),

  splitPayments: defineTable({
    paymentId: v.id("payments"),
    method: v.union(
      v.literal("CASH"),
      v.literal("UPI"),
      v.literal("CARD")
    ),
    amount: v.number(),
    reference: v.optional(v.string()),
  }).index("by_payment", ["paymentId"]),

  // ============================================================
  // REFUNDS
  // ============================================================
  refunds: defineTable({
    restaurantId: v.id("restaurants"),
    orderId: v.id("orders"),
    billId: v.id("bills"),
    refundNumber: v.string(),
    type: v.union(v.literal("FULL"), v.literal("PARTIAL")),
    amount: v.number(),
    reason: v.string(),
    authorizedBy: v.id("users"),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_order", ["orderId"])
    .index("by_bill", ["billId"]),

  // ============================================================
  // EXPENSES
  // ============================================================
  expenseCategories: defineTable({
    restaurantId: v.id("restaurants"),
    name: v.string(),
    description: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_restaurant", ["restaurantId"]),

  expenses: defineTable({
    restaurantId: v.id("restaurants"),
    branchId: v.optional(v.id("branches")),
    categoryId: v.id("expenseCategories"),
    description: v.string(),
    amount: v.number(),
    date: v.number(),
    isRecurring: v.boolean(),
    recurringFrequency: v.optional(v.union(
      v.literal("DAILY"),
      v.literal("WEEKLY"),
      v.literal("MONTHLY"),
      v.literal("YEARLY")
    )),
    receiptImage: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_category", ["categoryId"])
    .index("by_date", ["restaurantId", "date"])
    .index("by_branch", ["branchId"]),

  // ============================================================
  // LOYALTY
  // ============================================================
  loyaltyTransactions: defineTable({
    restaurantId: v.id("restaurants"),
    customerId: v.id("customers"),
    orderId: v.optional(v.id("orders")),
    type: v.union(v.literal("EARN"), v.literal("REDEEM"), v.literal("EXPIRE"), v.literal("ADJUSTMENT")),
    points: v.number(),
    balance: v.number(),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_customer", ["customerId"]),

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  notifications: defineTable({
    restaurantId: v.id("restaurants"),
    userId: v.id("users"),
    type: v.union(
      v.literal("LOW_STOCK"),
      v.literal("PENDING_KOT"),
      v.literal("LARGE_DISCOUNT"),
      v.literal("REFUND"),
      v.literal("NEW_ORDER"),
      v.literal("SYSTEM_ALERT"),
      v.literal("ORDER_READY"),
      v.literal("RESERVATION")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    referenceId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_restaurant_user", ["restaurantId", "userId"])
    .index("by_user_unread", ["restaurantId", "userId", "isRead"]),

  // ============================================================
  // AUDIT LOGS
  // ============================================================
  auditLogs: defineTable({
    restaurantId: v.id("restaurants"),
    userId: v.id("users"),
    action: v.string(),
    entity: v.string(),
    entityId: v.optional(v.string()),
    metadata: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_user", ["userId"])
    .index("by_entity", ["restaurantId", "entity"])
    .index("by_created", ["restaurantId", "createdAt"])
    .index("by_action", ["restaurantId", "action"]),

  // ============================================================
  // RESTAURANT SETTINGS
  // ============================================================
  restaurantSettings: defineTable({
    restaurantId: v.id("restaurants"),
    key: v.string(),
    value: v.string(),
    updatedAt: v.number(),
  }).index("by_restaurant_key", ["restaurantId", "key"]),

  // ============================================================
  // ACTIVITY LOGS (for staff tracking)
  // ============================================================
  activityLogs: defineTable({
    restaurantId: v.id("restaurants"),
    userId: v.id("users"),
    action: v.string(),
    description: v.string(),
    createdAt: v.number(),
  })
    .index("by_restaurant", ["restaurantId"])
    .index("by_user", ["userId"]),

  // ============================================================
  // PLATFORM SUBSCRIPTIONS (for SaaS)
  // ============================================================
  subscriptions: defineTable({
    organizationId: v.id("organizations"),
    plan: v.union(v.literal("free"), v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    status: v.union(v.literal("active"), v.literal("cancelled"), v.literal("past_due"), v.literal("trialing")),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    createdAt: v.number(),
  }).index("by_organization", ["organizationId"]),
});
