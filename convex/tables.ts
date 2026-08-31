import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get tables for a restaurant
export const getTables = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tables")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

// Get tables with status
export const getTablesWithStatus = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const tables = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const result: any[] = [];
    for (const table of tables) {
      let currentOrder: any = null;
      if (table.currentOrderId) {
        currentOrder = await ctx.db.get(table.currentOrderId);
      }
      result.push({ ...table, currentOrder });
    }
    return result;
  },
});

// Create table
export const createTable = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    number: v.string(),
    name: v.optional(v.string()),
    capacity: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tables", {
      ...args,
      status: "AVAILABLE",
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Update table
export const updateTable = mutation({
  args: {
    tableId: v.id("tables"),
    number: v.optional(v.string()),
    name: v.optional(v.string()),
    capacity: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("AVAILABLE"),
      v.literal("OCCUPIED"),
      v.literal("RESERVED"),
      v.literal("CLEANING")
    )),
  },
  handler: async (ctx, args) => {
    const { tableId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filteredUpdates[key] = value;
    }
    await ctx.db.patch(tableId, filteredUpdates);
  },
});

// Transfer table
export const transferTable = mutation({
  args: {
    fromTableId: v.id("tables"),
    toTableId: v.id("tables"),
  },
  handler: async (ctx, args) => {
    const fromTable = await ctx.db.get(args.fromTableId);
    const toTable = await ctx.db.get(args.toTableId);
    if (!fromTable || !toTable) throw new Error("Table not found");
    if (toTable.status !== "AVAILABLE") throw new Error("Target table is not available");

    if (fromTable.currentOrderId) {
      await ctx.db.patch(fromTable.currentOrderId, { tableId: args.toTableId });
    }
    await ctx.db.patch(args.toTableId, {
      status: "OCCUPIED",
      currentOrderId: fromTable.currentOrderId,
    });
    await ctx.db.patch(args.fromTableId, {
      status: "AVAILABLE",
      currentOrderId: undefined,
    });
  },
});

// Delete table
export const deleteTable = mutation({
  args: { tableId: v.id("tables") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tableId, { isActive: false });
  },
});
