import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get all products for a restaurant
export const getProducts = query({
  args: { restaurantId: v.id("restaurants"), categoryId: v.optional(v.id("categories")) },
  handler: async (ctx, args) => {
    let q = ctx.db.query("products").withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId));
    if (args.categoryId) {
      const catId = args.categoryId;
      q = ctx.db.query("products").withIndex("by_category", (q) => q.eq("categoryId", catId));
    }
    return await q.collect();
  },
});

// Get active products only (for POS)
export const getActiveProducts = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_restaurant_active", (q) => q.eq("restaurantId", args.restaurantId).eq("isAvailable", true))
      .collect();
  },
});

// Get product by ID
export const getProduct = query({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.productId);
  },
});

// Search products
export const searchProducts = query({
  args: { restaurantId: v.id("restaurants"), query: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("products")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const q = args.query.toLowerCase();
    return all.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
    );
  },
});

// Get product by barcode
export const getProductByBarcode = query({
  args: { restaurantId: v.id("restaurants"), barcode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("products")
      .withIndex("by_barcode", (q) => q.eq("restaurantId", args.restaurantId).eq("barcode", args.barcode))
      .unique();
  },
});

// Create product
export const createProduct = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const productId = await ctx.db.insert("products", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create inventory record if tracking stock
    if (args.trackStock) {
      await ctx.db.insert("inventory", {
        restaurantId: args.restaurantId,
        productId,
        currentStock: args.stock,
        minStock: args.minStock,
        maxStock: args.stock * 10,
        unit: args.unit,
        purchaseCost: args.costPrice,
        updatedAt: Date.now(),
      });
    }

    return productId;
  },
});

// Update product
export const updateProduct = mutation({
  args: {
    productId: v.id("products"),
    categoryId: v.optional(v.id("categories")),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    sku: v.optional(v.string()),
    barcode: v.optional(v.string()),
    price: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    taxRate: v.optional(v.number()),
    image: v.optional(v.string()),
    preparationTime: v.optional(v.number()),
    isAvailable: v.optional(v.boolean()),
    trackStock: v.optional(v.boolean()),
    minStock: v.optional(v.number()),
    unit: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { productId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filteredUpdates[key] = value;
    }
    filteredUpdates.updatedAt = Date.now();
    await ctx.db.patch(productId, filteredUpdates);
  },
});

// Delete product (soft delete - deactivate)
export const deleteProduct = mutation({
  args: { productId: v.id("products") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.productId, { isActive: false, isAvailable: false });
  },
});

// Get categories for a restaurant
export const getCategories = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("categories")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

// Create category
export const createCategory = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    description: v.optional(v.string()),
    displayOrder: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("categories", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Update category
export const updateCategory = mutation({
  args: {
    categoryId: v.id("categories"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    displayOrder: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { categoryId, ...updates } = args;
    const filteredUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) filteredUpdates[key] = value;
    }
    await ctx.db.patch(categoryId, filteredUpdates);
  },
});

// Delete category
export const deleteCategory = mutation({
  args: { categoryId: v.id("categories") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.categoryId, { isActive: false });
  },
});
