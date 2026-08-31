import { query } from "./_generated/server";
import { v } from "convex/values";

// Get audit logs
export const getAuditLogs = query({
  args: {
    restaurantId: v.id("restaurants"),
    entity: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("auditLogs")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId));
    if (args.entity) {
      q = ctx.db
        .query("auditLogs")
        .withIndex("by_entity", (q) => q.eq("restaurantId", args.restaurantId).eq("entity", args.entity!));
    }
    const logs = await q.collect();
    const result: any[] = [];
    for (const log of logs) {
      const user = await ctx.db.get(log.userId);
      result.push({ ...log, user });
    }
    return result
      .filter((l) => {
        if (args.userId && l.userId !== args.userId) return false;
        if (args.startDate && l.createdAt < args.startDate) return false;
        if (args.endDate && l.createdAt > args.endDate) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 500);
  },
});
