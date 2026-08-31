import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Get orders for a restaurant
export const getOrders = query({
  args: {
    restaurantId: v.id("restaurants"),
    status: v.optional(v.string()),
    branchId: v.optional(v.id("branches")),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("orders").withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId));
    if (args.status) {
      q = ctx.db.query("orders").withIndex("by_status", (q) => q.eq("restaurantId", args.restaurantId).eq("status", args.status as any));
    }
    if (args.branchId) {
      q = ctx.db.query("orders").withIndex("by_branch", (q) => q.eq("branchId", args.branchId));
    }
    const orders = await q.collect();
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get order with items
export const getOrderWithItems = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) return null;
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
    const table = order.tableId ? await ctx.db.get(order.tableId) : null;
    const customer = order.customerId ? await ctx.db.get(order.customerId) : null;
    const creator = await ctx.db.get(order.createdBy);
    return { ...order, items, table, customer, creator };
  },
});

// Get today's orders
export const getTodayOrders = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_created", (q) =>
        q.eq("restaurantId", args.restaurantId).gte("createdAt", todayStart.getTime())
      )
      .collect();
    return orders.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Create order
export const createOrder = mutation({
  args: {
    restaurantId: v.id("restaurants"),
    userId: v.id("users"),
    branchId: v.optional(v.id("branches")),
    tableId: v.optional(v.id("tables")),
    customerId: v.optional(v.id("customers")),
    orderType: v.union(v.literal("DINE_IN"), v.literal("TAKEAWAY"), v.literal("DELIVERY")),
    items: v.array(
      v.object({
        productId: v.id("products"),
        productName: v.string(),
        quantity: v.number(),
        unitPrice: v.number(),
        taxRate: v.number(),
        discountAmount: v.number(),
        notes: v.optional(v.string()),
      })
    ),
    discountAmount: v.number(),
    tipAmount: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");

    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new ConvexError("Restaurant not found");

    // Calculate totals
    let subtotal = 0;
    let totalTax = 0;
    const processedItems = args.items.map((item) => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemTax = itemSubtotal * (item.taxRate / 100);
      subtotal += itemSubtotal;
      totalTax += itemTax;
      return {
        ...item,
        taxAmount: itemTax,
        totalAmount: itemSubtotal + itemTax - item.discountAmount,
      };
    });
    const totalAmount = subtotal + totalTax - args.discountAmount + args.tipAmount;

    // Generate order number
    const counter = restaurant.invoiceCounter + 1;
    await ctx.db.patch(args.restaurantId, { invoiceCounter: counter });
    const orderNumber = `${restaurant.invoicePrefix}${String(counter).padStart(6, "0")}`;

    // Create order
    const orderId = await ctx.db.insert("orders", {
      restaurantId: args.restaurantId,
      branchId: args.branchId,
      tableId: args.tableId,
      customerId: args.customerId,
      orderNumber,
      orderType: args.orderType,
      status: "NEW",
      subtotal,
      taxAmount: totalTax,
      discountAmount: args.discountAmount,
      tipAmount: args.tipAmount,
      totalAmount,
      notes: args.notes,
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create order items
    for (const item of processedItems) {
      await ctx.db.insert("orderItems", {
        orderId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        discountAmount: item.discountAmount,
        totalAmount: item.totalAmount,
        notes: item.notes,
        status: "PENDING",
      });
    }

    // Create KOT
    const kotNumber = `KOT-${String(counter).padStart(6, "0")}`;
    const tableDoc = args.tableId ? await ctx.db.get(args.tableId) : null;
    const kotId = await ctx.db.insert("kots", {
      restaurantId: args.restaurantId,
      orderId,
      kotNumber,
      status: "PENDING",
      priority: "NORMAL",
      tableNumber: tableDoc?.number,
      orderType: args.orderType,
      notes: args.notes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create KOT items
    for (const item of args.items) {
      await ctx.db.insert("kotItems", {
        kotId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        notes: item.notes,
        status: "PENDING",
      });
    }

    // Update table status if dine-in
    if (args.tableId && args.orderType === "DINE_IN") {
      await ctx.db.patch(args.tableId, { status: "OCCUPIED", currentOrderId: orderId });
    }

    // Audit log
    await ctx.db.insert("auditLogs", {
      restaurantId: args.restaurantId,
      userId: args.userId,
      action: "CREATE_ORDER",
      entity: "ORDER",
      entityId: orderId,
      metadata: JSON.stringify({ orderNumber, totalAmount, orderType: args.orderType }),
      createdAt: Date.now(),
    });

    return orderId;
  },
});

// Update order status
export const updateOrderStatus = mutation({
  args: {
    orderId: v.id("orders"),
    userId: v.id("users"),
    status: v.union(
      v.literal("CONFIRMED"),
      v.literal("PREPARING"),
      v.literal("READY"),
      v.literal("SERVED"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED")
    ),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");

    const updates: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };

    if (args.status === "COMPLETED") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.orderId, updates);

    // Release table if completed or cancelled
    if ((args.status === "COMPLETED" || args.status === "CANCELLED") && order.tableId) {
      await ctx.db.patch(order.tableId, {
        status: "AVAILABLE",
        currentOrderId: undefined,
      });
    }

    // Audit log
    await ctx.db.insert("auditLogs", {
      restaurantId: order.restaurantId,
      userId: args.userId,
      action: `UPDATE_ORDER_${args.status}`,
      entity: "ORDER",
      entityId: args.orderId,
      metadata: JSON.stringify({ orderNumber: order.orderNumber, newStatus: args.status }),
      createdAt: Date.now(),
    });
  },
});
