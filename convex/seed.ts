import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedDemoData = mutation({
  args: { restaurantId: v.id("restaurants") },
  handler: async (ctx, args) => {
    const restaurant = await ctx.db.get(args.restaurantId);
    if (!restaurant) throw new Error("Restaurant not found");

    // Create categories
    const categories = [
      { name: "Burgers", displayOrder: 1 },
      { name: "Pizza", displayOrder: 2 },
      { name: "Biryani & Rice", displayOrder: 3 },
      { name: "Curry", displayOrder: 4 },
      { name: "Sides & Snacks", displayOrder: 5 },
      { name: "Beverages", displayOrder: 6 },
      { name: "Desserts", displayOrder: 7 },
    ];

    const categoryIds: Record<string, any> = {};
    for (const cat of categories) {
      const id = await ctx.db.insert("categories", {
        restaurantId: args.restaurantId,
        name: cat.name,
        displayOrder: cat.displayOrder,
        isActive: true,
        createdAt: Date.now(),
      });
      categoryIds[cat.name] = id;
    }

    // Create products
    const products = [
      { name: "Chicken Burger", categoryId: categoryIds["Burgers"], price: 149, costPrice: 60, taxRate: 5, stock: 100, preparationTime: 12, description: "Juicy chicken burger with fresh lettuce and special sauce" },
      { name: "Veg Burger", categoryId: categoryIds["Burgers"], price: 99, costPrice: 35, taxRate: 5, stock: 100, preparationTime: 10, description: "Crispy veggie patty with fresh vegetables" },
      { name: "Margherita Pizza", categoryId: categoryIds["Pizza"], price: 199, costPrice: 70, taxRate: 5, stock: 50, preparationTime: 15, description: "Classic cheese pizza with fresh tomato sauce" },
      { name: "Chicken Pizza", categoryId: categoryIds["Pizza"], price: 299, costPrice: 110, taxRate: 5, stock: 50, preparationTime: 18, description: "Loaded chicken pizza with peppers and onions" },
      { name: "Chicken Biryani", categoryId: categoryIds["Biryani & Rice"], price: 180, costPrice: 80, taxRate: 5, stock: 40, preparationTime: 20, description: "Aromatic biryani with tender chicken pieces" },
      { name: "Paneer Butter Masala", categoryId: categoryIds["Curry"], price: 220, costPrice: 90, taxRate: 5, stock: 30, preparationTime: 15, description: "Rich creamy paneer curry" },
      { name: "French Fries", categoryId: categoryIds["Sides & Snacks"], price: 100, costPrice: 30, taxRate: 5, stock: 200, preparationTime: 5, description: "Golden crispy french fries" },
      { name: "Coke", categoryId: categoryIds["Beverages"], price: 50, costPrice: 15, taxRate: 5, stock: 100, preparationTime: 1, description: "Chilled Coca-Cola" },
      { name: "Cold Coffee", categoryId: categoryIds["Beverages"], price: 80, costPrice: 25, taxRate: 5, stock: 80, preparationTime: 5, description: "Creamy iced coffee" },
      { name: "Gulab Jamun", categoryId: categoryIds["Desserts"], price: 70, costPrice: 25, taxRate: 5, stock: 60, preparationTime: 3, description: "Warm gulab jamun in sugar syrup" },
      { name: "Tandoori Chicken", categoryId: categoryIds["Sides & Snacks"], price: 250, costPrice: 100, taxRate: 5, stock: 30, preparationTime: 25, description: "Smoky tandoori chicken legs" },
      { name: "Naan", categoryId: categoryIds["Sides & Snacks"], price: 40, costPrice: 10, taxRate: 5, stock: 150, preparationTime: 8, description: "Freshly baked naan bread" },
      { name: "Masala Chai", categoryId: categoryIds["Beverages"], price: 30, costPrice: 8, taxRate: 5, stock: 200, preparationTime: 5, description: "Traditional Indian masala tea" },
      { name: "Raita", categoryId: categoryIds["Sides & Snacks"], price: 40, costPrice: 12, taxRate: 5, stock: 100, preparationTime: 2, description: "Cool yogurt raita" },
      { name: "Butter Chicken", categoryId: categoryIds["Curry"], price: 280, costPrice: 110, taxRate: 5, stock: 25, preparationTime: 20, description: "Creamy butter chicken curry" },
    ];

    const productIds: any[] = [];
    for (const p of products) {
      const id = await ctx.db.insert("products", {
        restaurantId: args.restaurantId,
        ...p,
        trackStock: true,
        minStock: 10,
        unit: "pcs",
        isActive: true,
        isAvailable: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      productIds.push(id);
      await ctx.db.insert("inventory", {
        restaurantId: args.restaurantId,
        productId: id,
        currentStock: p.stock,
        minStock: 10,
        maxStock: p.stock * 5,
        unit: "pcs",
        purchaseCost: p.costPrice,
        updatedAt: Date.now(),
      });
    }

    // Create tables
    const tables = [
      { number: "1", capacity: 2 },
      { number: "2", capacity: 2 },
      { number: "3", capacity: 4 },
      { number: "4", capacity: 4 },
      { number: "5", capacity: 6 },
      { number: "6", capacity: 6 },
      { number: "7", capacity: 8 },
      { number: "8", capacity: 8 },
      { number: "P1", name: "Patio 1", capacity: 4 },
      { number: "P2", name: "Patio 2", capacity: 6 },
      { number: "V1", name: "VIP 1", capacity: 10 },
      { number: "V2", name: "VIP 2", capacity: 12 },
    ];

    for (const table of tables) {
      await ctx.db.insert("tables", {
        restaurantId: args.restaurantId,
        number: table.number,
        name: table.name,
        capacity: table.capacity,
        status: "AVAILABLE",
        isActive: true,
        createdAt: Date.now(),
      });
    }

    // Create demo customers
    const customers = [
      { name: "Rahul Sharma", phone: "9876543210", email: "rahul@example.com" },
      { name: "Priya Patel", phone: "9876543211", email: "priya@example.com" },
      { name: "Amit Singh", phone: "9876543212" },
      { name: "Neha Gupta", phone: "9876543213", email: "neha@example.com" },
      { name: "Vikram Kumar", phone: "9876543214" },
    ];

    for (const c of customers) {
      await ctx.db.insert("customers", {
        restaurantId: args.restaurantId,
        ...c,
        totalOrders: 0,
        totalSpending: 0,
        loyaltyPoints: 0,
        tier: "BRONZE",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }

    // Create suppliers
    const suppliers = [
      { name: "Fresh Vegetables Co.", phone: "9111222333", contactPerson: "Ramesh" },
      { name: "Meat & Poultry Hub", phone: "9111222334", contactPerson: "Suresh" },
      { name: "Spice Traders", phone: "9111222335", contactPerson: "Anil" },
    ];

    for (const s of suppliers) {
      await ctx.db.insert("suppliers", {
        restaurantId: args.restaurantId,
        ...s,
        isActive: true,
        createdAt: Date.now(),
      });
    }

    return {
      categories: categories.length,
      products: products.length,
      tables: tables.length,
      customers: customers.length,
      suppliers: suppliers.length,
    };
  },
});
