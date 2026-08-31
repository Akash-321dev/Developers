import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create restaurant and organization
export const createRestaurant = mutation({
  args: {
    name: v.string(),
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
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Find or create user
    let user = await ctx.db
      .query("users")
      .withIndex("by_authId", (q) => q.eq("authId", identity.subject))
      .unique();
    if (!user) {
      const userId = await ctx.db.insert("users", {
        authId: identity.subject,
        email: identity.email ?? "",
        name: identity.name ?? "User",
        phone: undefined,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      user = await ctx.db.get(userId);
    }
    if (!user) throw new Error("Could not create user");

    // Create organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name + " Organization",
      slug: args.name.toLowerCase().replace(/\s+/g, "-"),
      plan: "free",
      maxBranches: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create restaurant
    const slug = args.name.toLowerCase().replace(/\s+/g, "-");
    const restaurantId = await ctx.db.insert("restaurants", {
      organizationId: orgId,
      name: args.name,
      slug,
      address: args.address,
      city: args.city,
      state: args.state,
      country: args.country || "India",
      phone: args.phone,
      email: args.email,
      gstin: args.gstin,
      currency: args.currency,
      currencySymbol: args.currencySymbol,
      taxRate: args.taxRate,
      taxName: args.taxName,
      invoicePrefix: args.invoicePrefix,
      invoiceCounter: 0,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create first branch
    const branchId = await ctx.db.insert("branches", {
      restaurantId,
      name: "Main Branch",
      address: args.address,
      phone: args.phone,
      isActive: true,
      createdAt: Date.now(),
    });

    // Add owner
    await ctx.db.insert("restaurantUsers", {
      userId: user._id,
      restaurantId,
      branchId,
      role: "RESTAURANT_OWNER",
      isActive: true,
      createdAt: Date.now(),
    });

    // Create default expense categories
    const expenseCategories = [
      "Rent", "Salary", "Electricity", "Gas", "Raw Materials",
      "Maintenance", "Transportation", "Marketing", "Other"
    ];
    for (const cat of expenseCategories) {
      await ctx.db.insert("expenseCategories", {
        restaurantId,
        name: cat,
        isActive: true,
        createdAt: Date.now(),
      });
    }

    return restaurantId;
  },
});

// Get restaurant by ID
export const getRestaurant = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.restaurantId);
  },
});

// Get restaurant by slug
export const getRestaurantBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("restaurants")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

// Update restaurant
export const updateRestaurant = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    gstin: v.optional(v.string()),
    taxRate: v.optional(v.number()),
    taxName: v.optional(v.string()),
    invoicePrefix: v.optional(v.string()),
    logo: v.optional(v.string()),
    businessHours: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { restaurantId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filteredUpdates[key] = value;
    }
    filteredUpdates.updatedAt = Date.now();
    await ctx.db.patch(restaurantId, filteredUpdates);
  },
});

// Get branches for a restaurant
export const getBranches = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("branches")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

// Create branch
export const createBranch = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    address: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("branches", {
      restaurantId: args.restaurantId,
      name: args.name,
      address: args.address,
      phone: args.phone,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});
