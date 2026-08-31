import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get customers for restaurant
export const getCustomers = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect()
      .then((c) => c.sort((a, b) => b.totalSpending - a.totalSpending));
  },
});

// Search customers by phone
export const searchCustomers = query({
  args: { restaurantId: v.id("restaurants"), query: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("customers")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const q = args.query.toLowerCase();
    return all.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  },
});

// Get customer by phone
export const getCustomerByPhone = query({
  args: { restaurantId: v.id("restaurants"), phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("customers")
      .withIndex("by_phone", (q) => q.eq("restaurantId", args.restaurantId).eq("phone", args.phone))
      .unique();
  },
});

// Get customer with order history
export const getCustomerWithHistory = query({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) return null;
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();
    const loyalty = await ctx.db
      .query("loyaltyTransactions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .collect();
    return {
      ...customer,
      orders: orders.sort((a, b) => b.createdAt - a.createdAt),
      loyaltyTransactions: loyalty.sort((a, b) => b.createdAt - a.createdAt),
    };
  },
});

// Create customer
export const createCustomer = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("customers", {
      ...args,
      totalOrders: 0,
      totalSpending: 0,
      loyaltyPoints: 0,
      tier: "BRONZE",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update customer
export const updateCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { customerId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filteredUpdates[key] = value;
    }
    filteredUpdates.updatedAt = Date.now();
    await ctx.db.patch(customerId, filteredUpdates);
  },
});

// Redeem loyalty points
export const redeemLoyaltyPoints = mutation({
  args: {
    customerId: v.id("customers"),
    restaurantId: v.id("restaurants"),
    orderId: v.optional(v.id("orders")),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new Error("Customer not found");
    if (customer.loyaltyPoints < args.points) throw new Error("Insufficient points");

    const newBalance = customer.loyaltyPoints - args.points;
    await ctx.db.patch(args.customerId, { loyaltyPoints: newBalance, updatedAt: Date.now() });

    await ctx.db.insert("loyaltyTransactions", {
      restaurantId: args.restaurantId,
      customerId: args.customerId,
      orderId: args.orderId,
      type: "REDEEM",
      points: args.points,
      balance: newBalance,
      description: `Redeemed ${args.points} points`,
      createdAt: Date.now(),
    });

    return newBalance;
  },
});
