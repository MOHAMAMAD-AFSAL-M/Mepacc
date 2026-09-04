import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdminAuth(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

// ── Queries ─────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("notifications")
      .withIndex("by_created")
      .order("desc")
      .take(50);
  },
});

export const getWorkerNotifications = query({
  args: { workerId: v.optional(v.id("workers")) },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("notifications")
      .withIndex("by_created")
      .order("desc")
      .take(40);

    if (!args.workerId) return all;

    const worker = await ctx.db.get(args.workerId);
    const workerRole = worker?.role;

    return all.filter((n) => {
      if (!n.recipientWorkerId && !n.role) return true; // global
      if (n.recipientWorkerId === args.workerId) return true;
      if (n.role && workerRole && n.role.toLowerCase() === workerRole.toLowerCase()) return true;
      return false;
    });
  },
});

// ── Mutations ───────────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    desc: v.string(),
    recipientWorkerId: v.optional(v.id("workers")),
    role: v.optional(v.string()),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notifications", {
      title: args.title,
      desc: args.desc,
      recipientWorkerId: args.recipientWorkerId,
      role: args.role,
      type: args.type,
      createdAt: Date.now(),
      isRead: false,
    });
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
    return { success: true };
  },
});

export const markAllRead = mutation({
  args: { workerId: v.optional(v.id("workers")) },
  handler: async (ctx) => {
    const unread = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { isRead: true });
    }
    return { count: unread.length };
  },
});

export const remove = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId);
    return { success: true };
  },
});
