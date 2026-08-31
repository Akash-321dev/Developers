import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Get expenses
export const getExpenses = query({
  args: {
    restaurantId: v.id("restaurants"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    categoryId: v.optional(v.id("expenseCategories")),
  },
  handler: async (ctx, args) => {
    let q = ctx.db
      .query("expenses")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId));
    if (args.startDate) {
      q = ctx.db
        .query("expenses")
        .withIndex("by_date", (q) => q.eq("restaurantId", args.restaurantId).gte("date", args.startDate!));
    }
    const expenses = await q.collect();
    const result: any[] = [];
    for (const expense of expenses) {
      const category = await ctx.db.get(expense.categoryId);
      const creator = await ctx.db.get(expense.createdBy);
      result.push({ ...expense, category, creator });
    }
    return result.sort((a, b) => b.date - a.date);
  },
});

// Get today's expenses
export const getTodayExpenses = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) =>
        q.eq("restaurantId", args.restaurantId).gte("date", todayStart.getTime())
      )
      .collect();
    return expenses;
  },
});

// Create expense
export const createExpense = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    userId: v.id("users"),
    branchId: v.optional(v.id("branches")),
    categoryId: v.id("expenseCategories"),
    description: v.string(),
    amount: v.number(),
    date: v.number(),
    isRecurring: v.boolean(),
    recurringFrequency: v.optional(v.union(
      v.literal("DAILY"),
      v.literal("WEEKLY"),
      v.literal("MONTHLY"),
      v.literal("YEARLY")
    )),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expenseId = await ctx.db.insert("expenses", {
      ...args,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    await ctx.db.insert("auditLogs", {
      restaurantId: args.restaurantId,
      userId: args.userId,
      action: "CREATE_EXPENSE",
      entity: "EXPENSE",
      entityId: expenseId,
      metadata: JSON.stringify({ description: args.description, amount: args.amount }),
      createdAt: Date.now(),
    });

    return expenseId;
  },
});

// Get expense categories
export const getExpenseCategories = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("expenseCategories")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
  },
});

// Create expense category
export const createExpenseCategory = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("expenseCategories", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Get total expenses for date range
export const getTotalExpenses = query({
  args: {
    restaurantId: v.id("restaurants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) =>
        q.eq("restaurantId", args.restaurantId)
          .gte("date", args.startDate)
          .lte("date", args.endDate)
      )
      .collect();
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  },
});
