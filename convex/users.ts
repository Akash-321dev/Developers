import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Get user by ID (for auth context validation)
export const getCurrentUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get current user (for auth context validation)
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .unique();
    return user;
  },
});

// Get user's restaurants and roles
export const getUserRestaurants = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    let userId = args.userId;
    if (!userId) {
      return [];
    }
    const memberships = await ctx.db
      .query("restaurantUsers")
      .withIndex("by_user", (q) => q.eq("userId", userId!))
      .collect();
    const results: any[] = [];
    for (const membership of memberships) {
      const restaurant = await ctx.db.get(membership.restaurantId);
      results.push({ membership, restaurant });
    }
    return results;
  },
});

// Get all users for a restaurant
export const getRestaurantUsers = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const memberships = await ctx.db
      .query("restaurantUsers")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    const users: any[] = [];
    for (const m of memberships) {
      const user = await ctx.db.get(m.userId);
      if (user) users.push({ ...user, role: m.role, isActive: m.isActive });
    }
    return users;
  },
});

// Create a new user (used during onboarding and staff creation)
export const createUser = mutation({
  args: {
    authId: v.string(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", args.authId))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("users", {
      authId: args.authId,
      email: args.email,
      name: args.name,
      phone: args.phone,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update user
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    avatar: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) filteredUpdates.name = updates.name;
    if (updates.phone !== undefined) filteredUpdates.phone = updates.phone;
    if (updates.avatar !== undefined) filteredUpdates.avatar = updates.avatar;
    if (updates.isActive !== undefined) filteredUpdates.isActive = updates.isActive;
    filteredUpdates.updatedAt = Date.now();
    await ctx.db.patch(userId, filteredUpdates);
  },
});

// Add user to restaurant
export const addRestaurantUser = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("restaurantUsers")
      .withIndex("by_restaurant_user", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("userId", args.userId)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role, branchId: args.branchId });
      return existing._id;
    }
    return await ctx.db.insert("restaurantUsers", {
      userId: args.userId,
      restaurantId: args.restaurantId,
      branchId: args.branchId,
      role: args.role,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Update user role in restaurant
export const updateUserRole = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    userId: v.id("users"),
    role: v.union(
      v.literal("RESTAURANT_OWNER"),
      v.literal("MANAGER"),
      v.literal("CASHIER"),
      v.literal("KITCHEN"),
      v.literal("WAITER")
    ),
  },
  handler: async (ctx, args) => {
    const targetMembership = await ctx.db
      .query("restaurantUsers")
      .withIndex("by_restaurant_user", (q) =>
        q.eq("restaurantId", args.restaurantId).eq("userId", args.userId)
      )
      .unique();
    if (!targetMembership) throw new ConvexError("User not found in this restaurant");
    await ctx.db.patch(targetMembership._id, { role: args.role });
  },
});
