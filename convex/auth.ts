import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Simple hash function for demo (production should use bcrypt via action)
function simpleHash(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `hashed_${Math.abs(hash).toString(36)}_${password.length}`;
}

export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (existing) throw new ConvexError("Email already registered");

    const authId = `auth_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const userId = await ctx.db.insert("users", {
      authId,
      email: args.email,
      name: args.name,
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { userId, authId, name: args.name, email: args.email };
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) throw new ConvexError("Invalid email or password");

    return { userId: user._id, authId: user.authId, name: user.name, email: user.email };
  },
});
