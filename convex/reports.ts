import { query } from "./_generated/server";
import { v } from "convex/values";

// Sales summary
export const getSalesSummary = query({
  args: {
    restaurantId: v.id("restaurants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const filtered = bills.filter(
      (b) => b.createdAt >= args.startDate && b.createdAt <= args.endDate && b.status === "PAID"
    );

    const totalRevenue = filtered.reduce((sum, b) => sum + b.totalAmount, 0);
    const totalTax = filtered.reduce((sum, b) => sum + b.taxAmount, 0);
    const totalDiscount = filtered.reduce((sum, b) => sum + b.discountAmount, 0);
    const totalTips = filtered.reduce((sum, b) => sum + b.tipAmount, 0);
    const totalBills = filtered.length;
    const avgOrderValue = totalBills > 0 ? totalRevenue / totalBills : 0;

    // Payment breakdown
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_created", (q) =>
        q.eq("restaurantId", args.restaurantId)
          .gte("createdAt", args.startDate)
          .lte("createdAt", args.endDate)
      )
      .collect();

    const paymentBreakdown = {
      CASH: 0,
      UPI: 0,
      CARD: 0,
      SPLIT_PAYMENT: 0,
    };
    for (const p of payments) {
      paymentBreakdown[p.method] += p.amount;
    }

    return {
      totalRevenue,
      totalTax,
      totalDiscount,
      totalTips,
      totalBills,
      avgOrderValue,
      paymentBreakdown,
    };
  },
});

// Today's dashboard stats
export const getDashboardStats = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayMs = todayStart.getTime();

    // Today's bills
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const todayBills = bills.filter((b) => b.createdAt >= todayMs && b.status === "PAID");

    const todaySales = todayBills.reduce((sum, b) => sum + b.totalAmount, 0);
    const todayOrders = todayBills.length;
    const avgOrderValue = todayOrders > 0 ? todaySales / todayOrders : 0;

    // Pending KOTs
    const pendingKots = await ctx.db
      .query("kots")
      .withIndex("by_status", (q) => q.eq("restaurantId", args.restaurantId).eq("status", "PENDING"))
      .collect();
    const kots = pendingKots.length;

    // Occupied tables
    const occupiedTableDocs = await ctx.db
      .query("tables")
      .withIndex("by_status", (q) => q.eq("restaurantId", args.restaurantId).eq("status", "OCCUPIED"))
      .collect();
    const occupiedTables = occupiedTableDocs.length;

    // Total tables
    const totalTableDocs = await ctx.db
      .query("tables")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const totalTables = totalTableDocs.length;

    // Today's expenses
    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_date", (q) => q.eq("restaurantId", args.restaurantId).gte("date", todayMs))
      .collect();
    const todayExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // Low stock items
    const inventory = await ctx.db
      .query("inventory")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const lowStock = inventory.filter((i) => i.currentStock <= i.minStock).length;

    // Total customers
    const customerDocs = await ctx.db
      .query("customers")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const totalCustomers = customerDocs.length;

    // Payment breakdown today
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_created", (q) =>
        q.eq("restaurantId", args.restaurantId).gte("createdAt", todayMs)
      )
      .collect();
    const paymentBreakdown = { CASH: 0, UPI: 0, CARD: 0, SPLIT_PAYMENT: 0 };
    for (const p of payments) {
      paymentBreakdown[p.method] += p.amount;
    }

    // Hourly sales today
    const hourlySales: number[] = new Array(24).fill(0);
    for (const bill of todayBills) {
      const hour = new Date(bill.createdAt).getHours();
      hourlySales[hour] += bill.totalAmount;
    }

    // Top selling products today
    const todayOrders2 = await ctx.db
      .query("orders")
      .withIndex("by_created", (q) => q.eq("restaurantId", args.restaurantId).gte("createdAt", todayMs))
      .collect();
    const productSales: Record<string, { name: string; count: number; revenue: number }> = {};
    for (const order of todayOrders2) {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();
      for (const item of items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, count: 0, revenue: 0 };
        }
        productSales[item.productId].count += item.quantity;
        productSales[item.productId].revenue += item.totalAmount;
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Estimated profit
    const estimatedProfit = todaySales - todayExpenses;

    return {
      todaySales,
      todayOrders,
      avgOrderValue,
      totalCustomers,
      pendingKots: kots,
      occupiedTables,
      totalTables,
      lowStockItems: lowStock,
      todayExpenses,
      estimatedProfit,
      paymentBreakdown,
      hourlySales,
      topProducts,
    };
  },
});

// Product sales report
export const getProductSalesReport = query({
  args: {
    restaurantId: v.id("restaurants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_created", (q) =>
        q.eq("restaurantId", args.restaurantId)
          .gte("createdAt", args.startDate)
          .lte("createdAt", args.endDate)
      )
      .collect();

    const productSales: Record<string, { name: string; count: number; revenue: number; cost: number }> = {};
    for (const order of orders) {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();
      for (const item of items) {
        if (!productSales[item.productId]) {
          productSales[item.productId] = { name: item.productName, count: 0, revenue: 0, cost: 0 };
        }
        productSales[item.productId].count += item.quantity;
        productSales[item.productId].revenue += item.totalAmount;
        const product = await ctx.db.get(item.productId);
        if (product) {
          productSales[item.productId].cost += product.costPrice * item.quantity;
        }
      }
    }
    return Object.entries(productSales)
      .map(([id, data]) => ({ productId: id, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  },
});

// Category sales report
export const getCategorySalesReport = query({
  args: {
    restaurantId: v.id("restaurants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const products = await ctx.db
      .query("products")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    const categoryMap: Record<string, { name: string; revenue: number; count: number }> = {};
    for (const cat of categories) {
      categoryMap[cat._id] = { name: cat.name, revenue: 0, count: 0 };
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_created", (q) =>
        q.eq("restaurantId", args.restaurantId)
          .gte("createdAt", args.startDate)
          .lte("createdAt", args.endDate)
      )
      .collect();

    for (const order of orders) {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (q) => q.eq("orderId", order._id))
        .collect();
      for (const item of items) {
        const product = products.find((p) => p._id === item.productId);
        if (product && categoryMap[product.categoryId]) {
          categoryMap[product.categoryId].revenue += item.totalAmount;
          categoryMap[product.categoryId].count += item.quantity;
        }
      }
    }

    return Object.entries(categoryMap)
      .map(([id, data]) => ({ categoryId: id, ...data }))
      .filter((c) => c.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue);
  },
});

// Daily sales trend
export const getDailySalesTrend = query({
  args: {
    restaurantId: v.id("restaurants"),
    days: v.number(),
  },
  handler: async (ctx, args) => {
    const bills = await ctx.db
      .query("bills")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    const trend: { date: string; sales: number; orders: number }[] = [];
    for (let i = args.days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dayStart = date.getTime();
      const dayEnd = dayStart + 86400000;
      const dayBills = bills.filter(
        (b) => b.createdAt >= dayStart && b.createdAt < dayEnd && b.status === "PAID"
      );
      trend.push({
        date: date.toISOString().split("T")[0],
        sales: dayBills.reduce((sum, b) => sum + b.totalAmount, 0),
        orders: dayBills.length,
      });
    }
    return trend;
  },
});

// Get all refunds
export const getRefundReport = query({
  args: {
    restaurantId: v.id("restaurants"),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    const refunds = await ctx.db
      .query("refunds")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();
    return refunds
      .filter((r) => r.createdAt >= args.startDate && r.createdAt <= args.endDate)
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});
