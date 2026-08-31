import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Get pending KOTs
export const getPendingKots = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const kots = await ctx.db
      .query("kots")
      .withIndex("by_status", (q) => q.eq("restaurantId", args.restaurantId).eq("status", "PENDING"))
      .collect();
    const result: any[] = [];
    for (const kot of kots) {
      const items = await ctx.db
        .query("kotItems")
        .withIndex("by_kot", (q) => q.eq("kotId", kot._id))
        .collect();
      result.push({ ...kot, items });
    }
    return result.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Get all active KOTs (for kitchen display)
export const getKitchenOrders = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const activeStatuses = ["PENDING", "ACCEPTED", "PREPARING", "READY"];
    const allKots = await ctx.db
      .query("kots")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const activeKots = allKots.filter((k) => activeStatuses.includes(k.status));
    const result: any[] = [];
    for (const kot of activeKots) {
      const items = await ctx.db
        .query("kotItems")
        .withIndex("by_kot", (q) => q.eq("kotId", kot._id))
        .collect();
      result.push({ ...kot, items });
    }
    return result.sort((a, b) => a.createdAt - b.createdAt);
  },
});

// Update KOT status
export const updateKotStatus = mutation({
  args: {
    kotId: v.id("kots"),
    status: v.union(
      v.literal("ACCEPTED"),
      v.literal("PREPARING"),
      v.literal("READY"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED")
    ),
  },
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.status === "COMPLETED") {
      updates.completedAt = Date.now();
    }
    await ctx.db.patch(args.kotId, updates);

    // Also update order status based on KOT
    const kot = await ctx.db.get(args.kotId);
    if (kot) {
      if (args.status === "ACCEPTED" || args.status === "PREPARING") {
        await ctx.db.patch(kot.orderId, { status: "PREPARING", updatedAt: Date.now() });
      } else if (args.status === "READY") {
        await ctx.db.patch(kot.orderId, { status: "READY", updatedAt: Date.now() });
      } else if (args.status === "COMPLETED") {
        await ctx.db.patch(kot.orderId, { status: "SERVED", updatedAt: Date.now() });
      }
    }

    // Create notification for ready orders
    if (args.status === "READY" && kot) {
      const members = await ctx.db
        .query("restaurantUsers")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", kot.restaurantId))
        .collect();
      for (const member of members) {
        if (["WAITER", "MANAGER", "RESTAURANT_OWNER"].includes(member.role)) {
          await ctx.db.insert("notifications", {
            restaurantId: kot.restaurantId,
            userId: member.userId,
            type: "ORDER_READY",
            title: "Order Ready",
            message: `KOT ${kot.kotNumber} is ready for ${kot.tableNumber || "takeaway"}`,
            isRead: false,
            referenceId: kot._id,
            createdAt: Date.now(),
          });
        }
      }
    }
  },
});

// Update individual KOT item status
export const updateKotItemStatus = mutation({
  args: {
    kotItemId: v.id("kotItems"),
    status: v.union(
      v.literal("PREPARING"),
      v.literal("READY"),
      v.literal("CANCELLED")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.kotItemId, { status: args.status });
  },
});

// Get KOT count by status
export const getKotCounts = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const kots = await ctx.db
      .query("kots")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const counts = {
      PENDING: 0,
      ACCEPTED: 0,
      PREPARING: 0,
      READY: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      total: 0,
    };
    for (const kot of kots) {
      counts[kot.status as keyof typeof counts]++;
      counts.total++;
    }
    return counts;
  },
});
