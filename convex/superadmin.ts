import { query } from "./_generated/server";
import { v } from "convex/values";

// Platform stats for super admin
export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurants").collect();
    const activeRestaurants = restaurants.filter((r) => r.isActive);
    const users = await ctx.db.query("users").collect();
    const restaurantUsers = await ctx.db.query("restaurantUsers").collect();

    // Total revenue across all restaurants
    let totalRevenue = 0;
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 86400000;
    for (const restaurant of restaurants) {
      const bills = await ctx.db
        .query("bills")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
        .collect();
      const recentBills = bills.filter(
        (b) => b.createdAt >= thirtyDaysAgo && b.status === "PAID"
      );
      totalRevenue += recentBills.reduce((sum, b) => sum + b.totalAmount, 0);
    }

    // Subscriptions
    const subscriptions = await ctx.db.query("subscriptions").collect();
    const activeSubscriptions = subscriptions.filter((s) => s.status === "active");

    return {
      totalRestaurants: restaurants.length,
      activeRestaurants: activeRestaurants.length,
      totalUsers: users.length,
      totalRestaurantUsers: restaurantUsers.length,
      monthlyRevenue: totalRevenue,
      activeSubscriptions: activeSubscriptions.length,
      totalSubscriptions: subscriptions.length,
    };
  },
});

// All restaurants for super admin
export const getAllRestaurants = query({
  args: {},
  handler: async (ctx) => {
    const restaurants = await ctx.db.query("restaurants").collect();
    const result: any[] = [];
    for (const r of restaurants) {
      const org = await ctx.db.get(r.organizationId);
      const userCountDocs = await ctx.db
        .query("restaurantUsers")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", r._id))
        .collect();
      const userCount = userCountDocs.length;
      const billCountDocs = await ctx.db
        .query("bills")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", r._id))
        .collect();
      const billCount = billCountDocs.length;
      result.push({ ...r, organization: org, userCount, billCount });
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Recent activity for super admin
export const getRecentActivity = query({
  args: {},
  handler: async (ctx) => {
    const logs = await ctx.db.query("auditLogs").collect();
    const sorted = logs.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50);
    const result: any[] = [];
    for (const log of sorted) {
      const user = await ctx.db.get(log.userId);
      const restaurant = await ctx.db.get(log.restaurantId);
      result.push({ ...log, user, restaurant });
    }
    return result;
  },
});
