import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get notifications for current user
export const getNotifications = query({
  args: { restaurantId: v.id("restaurants"), userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_restaurant_user", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("userId", args.userId)
      )
      .collect()
      .then((n) => n.sort((a, b) => b.createdAt - a.createdAt).slice(0, 50));
  },
});

// Get unread count
export const getUnreadCount = query({
  args: { restaurantId: v.id("restaurants"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("userId", args.userId).eq("isRead", false)
      )
      .collect();
    return unread.length;
  },
});

// Mark as read
export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

// Mark all as read
export const markAllAsRead = mutation({
  args: { restaurantId: v.id("restaurants"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_unread", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("userId", args.userId).eq("isRead", false)
      )
      .collect();
    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true });
    }
  },
});
