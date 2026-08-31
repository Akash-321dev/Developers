import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Get inventory for restaurant
export const getInventory = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const result: any[] = [];
    for (const inv of inventory) {
      const product = await ctx.db.get(inv.productId);
      result.push({ ...inv, product });
    }
    return result;
  },
});

// Get low stock items
export const getLowStockItems = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const lowStock: any[] = [];
    for (const inv of inventory) {
      if (inv.currentStock <= inv.minStock) {
        const product = await ctx.db.get(inv.productId);
        lowStock.push({ ...inv, product });
      }
    }
    return lowStock;
  },
});

// Adjust inventory
export const adjustInventory = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    productId: v.id("products"),
    userId: v.id("users"),
    type: v.union(
      v.literal("STOCK_IN"),
      v.literal("STOCK_OUT"),
      v.literal("ADJUSTMENT"),
      v.literal("DAMAGED")
    ),
    quantity: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .unique();
    if (!inventory) throw new ConvexError("Inventory record not found");

    let newStock = inventory.currentStock;
    if (args.type === "STOCK_IN" || args.type === "ADJUSTMENT") {
      newStock = args.type === "ADJUSTMENT" ? args.quantity : inventory.currentStock + args.quantity;
    } else {
      newStock = Math.max(0, inventory.currentStock - args.quantity);
    }

    await ctx.db.patch(inventory._id, { currentStock: newStock, updatedAt: Date.now() });
    await ctx.db.insert("inventoryTransactions", {
      restaurantId: args.restaurantId,
      productId: args.productId,
      type: args.type,
      quantity: args.quantity,
      previousStock: inventory.currentStock,
      newStock,
      reason: args.reason,
      userId: args.userId,
      createdAt: Date.now(),
    });

    // Audit log
    await ctx.db.insert("auditLogs", {
      restaurantId: args.restaurantId,
      userId: args.userId,
      action: "STOCK_ADJUSTMENT",
      entity: "INVENTORY",
      entityId: inventory._id,
      metadata: JSON.stringify({
        type: args.type,
        quantity: args.quantity,
        previousStock: inventory.currentStock,
        newStock,
        reason: args.reason,
      }),
      createdAt: Date.now(),
    });

    return newStock;
  },
});

// Get inventory history
export const getInventoryHistory = query({
  args: { restaurantId: v.id("restaurants"), productId: v.optional(v.id("products")) },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("inventoryTransactions")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId));
    if (args.productId) {
      const prodId = args.productId;
      q = ctx.db
        .query("inventoryTransactions")
        .withIndex("by_product", (q) => q.eq("productId", prodId));
    }
    const transactions = await q.collect();
    const result: any[] = [];
    for (const t of transactions) {
      const product = await ctx.db.get(t.productId);
      const user = await ctx.db.get(t.userId);
      result.push({ ...t, product, user });
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get suppliers
export const getSuppliers = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("suppliers")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

// Create supplier
export const createSupplier = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    contactPerson: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("suppliers", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});
