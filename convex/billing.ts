import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Complete billing for an order
export const completeBilling = mutation({
  args: {
    orderId: v.id("orders"),
    userId: v.id("users"),
    customerId: v.optional(v.id("customers")),
    discountAmount: v.number(),
    tipAmount: v.number(),
    paymentMethod: v.union(v.literal("CASH"), v.literal("UPI"), v.literal("CARD"), v.literal("SPLIT_PAYMENT")),
    paidAmount: v.number(),
    splitPayments: v.optional(
      v.array(
        v.object({
          method: v.union(v.literal("CASH"), v.literal("UPI"), v.literal("CARD")),
          amount: v.number(),
          reference: v.optional(v.string()),
        })
      )
    ),
    reference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");
    if (order.status === "COMPLETED" || order.status === "CANCELLED") {
      throw new ConvexError("Order is already finalized");
    }

    const restaurant = await ctx.db.get(order.restaurantId);
    if (!restaurant) throw new ConvexError("Restaurant not found");

    // Calculate final totals
    const totalAmount = order.subtotal + order.taxAmount - args.discountAmount + args.tipAmount;

    // Update order
    await ctx.db.patch(args.orderId, {
      discountAmount: args.discountAmount,
      tipAmount: args.tipAmount,
      totalAmount,
      customerId: args.customerId,
      status: "COMPLETED",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Generate bill number
    const billNumber = `${restaurant.invoicePrefix}B${String(restaurant.invoiceCounter + 1).padStart(6, "0")}`;
    await ctx.db.patch(order.restaurantId, { invoiceCounter: restaurant.invoiceCounter + 1 });

    // Create bill
    const billId = await ctx.db.insert("bills", {
      restaurantId: order.restaurantId,
      orderId: args.orderId,
      billNumber,
      customerId: args.customerId,
      subtotal: order.subtotal,
      taxAmount: order.taxAmount,
      discountAmount: args.discountAmount,
      tipAmount: args.tipAmount,
      totalAmount,
      paidAmount: args.paidAmount,
      status: args.paidAmount >= totalAmount ? "PAID" : "PARTIALLY_PAID",
      createdBy: args.userId,
      createdAt: Date.now(),
      paidAt: args.paidAmount >= totalAmount ? Date.now() : undefined,
    });

    // Create payment
    const paymentId = await ctx.db.insert("payments", {
      billId,
      restaurantId: order.restaurantId,
      orderId: args.orderId,
      method: args.paymentMethod,
      amount: args.paidAmount,
      reference: args.reference,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    // Create split payments if applicable
    if (args.paymentMethod === "SPLIT_PAYMENT" && args.splitPayments) {
      for (const sp of args.splitPayments) {
        await ctx.db.insert("splitPayments", {
          paymentId,
          method: sp.method,
          amount: sp.amount,
          reference: sp.reference,
        });
      }
    }

    // Deduct inventory for products
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();

    for (const item of orderItems) {
      const product = await ctx.db.get(item.productId);
      if (product?.trackStock) {
        const inventory = await ctx.db
          .query("inventory")
          .withIndex("by_product", (q) => q.eq("productId", item.productId))
          .unique();
        if (inventory) {
          const newStock = Math.max(0, inventory.currentStock - item.quantity);
          await ctx.db.patch(inventory._id, { currentStock: newStock, updatedAt: Date.now() });
          await ctx.db.insert("inventoryTransactions", {
            restaurantId: order.restaurantId,
            productId: item.productId,
            type: "SALE",
            quantity: item.quantity,
            previousStock: inventory.currentStock,
            newStock,
            referenceId: order.orderNumber,
            userId: args.userId,
            createdAt: Date.now(),
          });

          // Check low stock
          if (newStock <= inventory.minStock && inventory.minStock > 0) {
            const members = await ctx.db
              .query("restaurantUsers")
              .withIndex("by_restaurant", (q) => q.eq("restaurantId", order.restaurantId))
              .collect();
            for (const member of members) {
              if (["RESTAURANT_OWNER", "MANAGER"].includes(member.role)) {
                await ctx.db.insert("notifications", {
                  restaurantId: order.restaurantId,
                  userId: member.userId,
                  type: "LOW_STOCK",
                  title: "Low Stock Alert",
                  message: `${product.name} is running low (${newStock} ${inventory.unit} remaining)`,
                  isRead: false,
                  createdAt: Date.now(),
                });
              }
            }
          }
        }
      }

      // Deduct recipe ingredients
      const recipes = await ctx.db
        .query("recipes")
        .withIndex("by_product", (q) => q.eq("productId", item.productId))
        .collect();
      for (const recipe of recipes) {
        const ingredientInventory = await ctx.db
          .query("inventory")
          .withIndex("by_product", (q) => q.eq("productId", recipe.ingredientId))
          .unique();
        if (ingredientInventory) {
          const deductionAmount = recipe.quantity * item.quantity;
          const newStock = Math.max(0, ingredientInventory.currentStock - deductionAmount);
          await ctx.db.patch(ingredientInventory._id, { currentStock: newStock, updatedAt: Date.now() });
          await ctx.db.insert("inventoryTransactions", {
            restaurantId: order.restaurantId,
            productId: recipe.ingredientId,
            type: "RECIPE_DEDUCTION",
            quantity: deductionAmount,
            previousStock: ingredientInventory.currentStock,
            newStock,
            referenceId: order.orderNumber,
            userId: args.userId,
            createdAt: Date.now(),
          });
        }
      }
    }

    // Update customer statistics
    if (args.customerId) {
      const customer = await ctx.db.get(args.customerId);
      if (customer) {
        await ctx.db.patch(args.customerId, {
          totalOrders: customer.totalOrders + 1,
          totalSpending: customer.totalSpending + totalAmount,
          lastOrderAt: Date.now(),
          updatedAt: Date.now(),
        });

        // Award loyalty points
        const points = Math.floor(totalAmount / 10);
        await ctx.db.patch(args.customerId, {
          loyaltyPoints: customer.loyaltyPoints + points,
        });
        await ctx.db.insert("loyaltyTransactions", {
          restaurantId: order.restaurantId,
          customerId: args.customerId,
          orderId: args.orderId,
          type: "EARN",
          points,
          balance: customer.loyaltyPoints + points,
          description: `Earned ${points} points for order ${order.orderNumber}`,
          createdAt: Date.now(),
        });
      }
    }

    // Release table
    if (order.tableId) {
      await ctx.db.patch(order.tableId, {
        status: "CLEANING",
        currentOrderId: undefined,
      });
    }

    // Audit log
    await ctx.db.insert("auditLogs", {
      restaurantId: order.restaurantId,
      userId: args.userId,
      action: "CREATE_BILL",
      entity: "BILL",
      entityId: billId,
      metadata: JSON.stringify({
        billNumber,
        totalAmount,
        paymentMethod: args.paymentMethod,
        orderNumber: order.orderNumber,
      }),
      createdAt: Date.now(),
    });

    // Create notification for large discounts (>20%)
    if (args.discountAmount > totalAmount * 0.2) {
      const members = await ctx.db
        .query("restaurantUsers")
        .withIndex("by_restaurant", (q) => q.eq("restaurantId", order.restaurantId))
        .collect();
      for (const member of members) {
        if (["RESTAURANT_OWNER", "MANAGER"].includes(member.role)) {
          await ctx.db.insert("notifications", {
            restaurantId: order.restaurantId,
            userId: member.userId,
            type: "LARGE_DISCOUNT",
            title: "Large Discount Applied",
            message: `A discount of ₹${args.discountAmount.toFixed(2)} was applied to order ${order.orderNumber}`,
            isRead: false,
            createdAt: Date.now(),
          });
        }
      }
    }

    return billId;
  },
});

// Get bills
export const getBills = query({
  args: {
    restaurantId: v.id("restaurants"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let bills = await ctx.db
      .query("bills")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect();

    if (args.startDate) bills = bills.filter((b) => b.createdAt >= args.startDate!);
    if (args.endDate) bills = bills.filter((b) => b.createdAt <= args.endDate!);

    return bills.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get bill with details
export const getBillWithDetails = query({
  args: { billId: v.id("bills") },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.billId);
    if (!bill) return null;
    const order = await ctx.db.get(bill.orderId);
    const items = order
      ? await ctx.db
          .query("orderItems")
          .withIndex("by_order", (q) => q.eq("orderId", bill.orderId))
          .collect()
      : [];
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_bill", (q) => q.eq("billId", args.billId))
      .collect();
    const restaurant = await ctx.db.get(bill.restaurantId);
    const customer = bill.customerId ? await ctx.db.get(bill.customerId) : null;
    const creator = await ctx.db.get(bill.createdBy);
    return { ...bill, order, items, payments, restaurant, customer, creator };
  },
});

// Process refund
export const processRefund = mutation({
  args: {
    orderId: v.id("orders"),
    billId: v.id("bills"),
    userId: v.id("users"),
    type: v.union(v.literal("FULL"), v.literal("PARTIAL")),
    amount: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError("User not found");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new ConvexError("Order not found");
    const bill = await ctx.db.get(args.billId);
    if (!bill) throw new ConvexError("Bill not found");

    const refundNumber = `REF-${String(Date.now()).slice(-8)}`;

    const refundId = await ctx.db.insert("refunds", {
      restaurantId: order.restaurantId,
      orderId: args.orderId,
      billId: args.billId,
      refundNumber,
      type: args.type,
      amount: args.amount,
      reason: args.reason,
      authorizedBy: args.userId,
      createdBy: args.userId,
      createdAt: Date.now(),
    });

    if (args.type === "FULL") {
      await ctx.db.patch(args.billId, {
        status: "REFUNDED",
        paidAmount: 0,
      });
      await ctx.db.patch(args.orderId, {
        status: "REFUNDED",
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(args.billId, {
        paidAmount: Math.max(0, bill.paidAmount - args.amount),
        status: bill.paidAmount - args.amount <= 0 ? "REFUNDED" : "PARTIALLY_PAID",
      });
    }

    // Restore inventory
    const orderItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (q) => q.eq("orderId", args.orderId))
      .collect();
    for (const item of orderItems) {
      const inventory = await ctx.db
        .query("inventory")
        .withIndex("by_product", (q) => q.eq("productId", item.productId))
        .unique();
      if (inventory) {
        const restoreQty = args.type === "FULL" ? item.quantity : Math.min(item.quantity, Math.ceil(args.amount / item.unitPrice));
        await ctx.db.patch(inventory._id, {
          currentStock: inventory.currentStock + restoreQty,
          updatedAt: Date.now(),
        });
        await ctx.db.insert("inventoryTransactions", {
          restaurantId: order.restaurantId,
          productId: item.productId,
          type: "RETURN",
          quantity: restoreQty,
          previousStock: inventory.currentStock,
          newStock: inventory.currentStock + restoreQty,
          referenceId: refundNumber,
          userId: args.userId,
          createdAt: Date.now(),
        });
      }
    }

    // Audit log
    await ctx.db.insert("auditLogs", {
      restaurantId: order.restaurantId,
      userId: args.userId,
      action: "REFUND",
      entity: "REFUND",
      entityId: refundId,
      metadata: JSON.stringify({
        refundNumber,
        amount: args.amount,
        type: args.type,
        reason: args.reason,
      }),
      createdAt: Date.now(),
    });

    // Create refund notification
    const members = await ctx.db
      .query("restaurantUsers")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", order.restaurantId))
      .collect();
    for (const member of members) {
      if (["RESTAURANT_OWNER", "MANAGER"].includes(member.role)) {
        await ctx.db.insert("notifications", {
          restaurantId: order.restaurantId,
          userId: member.userId,
          type: "REFUND",
          title: "Refund Processed",
          message: `Refund of ₹${args.amount.toFixed(2)} processed for order ${order.orderNumber}`,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return refundId;
  },
});

// Get refunds
export const getRefunds = query({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("refunds")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", args.restaurantId))
      .collect()
      .then((r) => r.sort((a, b) => b.createdAt - a.createdAt));
  },
});
