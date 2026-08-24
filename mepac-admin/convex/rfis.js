import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ── Queries ─────────────────────────────────────────────────────

export const list = query({
  args: {
    type: v.optional(v.union(v.literal("rfi"), v.literal("dispute"))),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("rfis");

    if (args.type) {
      q = q.withIndex("by_type", (idx) => idx.eq("type", args.type));
    } else {
      q = q.withIndex("by_created");
    }

    const items = await q.order("desc").collect();

    if (args.projectId) {
      return items.filter((item) => item.projectId === args.projectId);
    }

    return items;
  },
});

// ── Mutations ───────────────────────────────────────────────────

export const createDispute = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    projectName: v.string(),
    workerId: v.optional(v.id("workers")),
    workerName: v.string(),
    workerRole: v.optional(v.string()),
    createdByWorkerId: v.optional(v.id("workers")),
    createdByName: v.string(),
    createdByRole: v.string(),
    reason: v.string(),
    priority: v.optional(
      v.union(v.literal("High"), v.literal("Medium"), v.literal("Low"))
    ),
  },
  handler: async (ctx, args) => {
    const randomCode = Math.floor(100 + Math.random() * 900);
    const rfiCode = `DSP-2026-${randomCode}`;
    const now = Date.now();

    const title = `Attendance Dispute: ${args.workerName}`;

    // 1. Insert into RFIs & Disputes table
    const disputeId = await ctx.db.insert("rfis", {
      type: "dispute",
      projectId: args.projectId,
      projectName: args.projectName,
      workerId: args.workerId,
      workerName: args.workerName,
      workerRole: args.workerRole || "Technician",
      createdByWorkerId: args.createdByWorkerId,
      createdByName: args.createdByName,
      createdByRole: args.createdByRole,
      title,
      details: args.reason,
      status: "FLAGGED FOR ADMIN REVIEW",
      priority: args.priority || "High",
      createdAt: now,
      updatedAt: now,
      rfiCode,
    });

    // 2. Insert into Notifications for Admin Console
    await ctx.db.insert("notifications", {
      title: `Attendance Dispute: ${args.workerName} (${args.projectName})`,
      desc: `${args.createdByName} (${args.createdByRole}): ${args.reason}`,
      createdAt: now,
      isRead: false,
    });

    return { success: true, disputeId, rfiCode };
  },
});

export const createRfi = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    projectName: v.string(),
    workerId: v.optional(v.id("workers")),
    workerName: v.optional(v.string()),
    workerRole: v.optional(v.string()),
    createdByWorkerId: v.optional(v.id("workers")),
    createdByName: v.string(),
    createdByRole: v.string(),
    title: v.string(),
    details: v.string(),
    priority: v.optional(
      v.union(v.literal("High"), v.literal("Medium"), v.literal("Low"))
    ),
  },
  handler: async (ctx, args) => {
    const randomCode = Math.floor(100 + Math.random() * 900);
    const rfiCode = `RFI-2026-${randomCode}`;
    const now = Date.now();

    // 1. Insert into RFIs & Disputes table
    const rfiId = await ctx.db.insert("rfis", {
      type: "rfi",
      projectId: args.projectId,
      projectName: args.projectName,
      workerId: args.workerId,
      workerName: args.workerName,
      workerRole: args.workerRole,
      createdByWorkerId: args.createdByWorkerId,
      createdByName: args.createdByName,
      createdByRole: args.createdByRole,
      title: args.title,
      details: args.details,
      status: "OPEN",
      priority: args.priority || "High",
      createdAt: now,
      updatedAt: now,
      rfiCode,
    });

    // 2. Insert into Notifications for targeted worker
    if (args.workerId && args.workerId !== args.createdByWorkerId) {
      await ctx.db.insert("notifications", {
        title: `RFI Assigned to You: ${args.title}`,
        desc: `${args.createdByName} assigned ${rfiCode} on ${args.projectName}.`,
        recipientWorkerId: args.workerId,
        createdAt: now,
        isRead: false,
        type: "rfi",
      });
    }

    // 3. Insert notification for project supervisors
    if (args.projectId) {
      const assignments = await ctx.db
        .query("projectAssignments")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect();

      for (const a of assignments) {
        if (a.workerId !== args.createdByWorkerId && a.workerId !== args.workerId) {
          const worker = await ctx.db.get(a.workerId);
          if (worker?.role === "Supervisor" || worker?.role === "Foreman") {
            await ctx.db.insert("notifications", {
              title: `RFI Raised: ${args.title} (${args.projectName})`,
              desc: `${args.createdByName} (${args.createdByRole}): ${args.details}`,
              recipientWorkerId: a.workerId,
              createdAt: now,
              isRead: false,
              type: "rfi",
            });
          }
        }
      }
    }

    // 4. Global admin notification
    await ctx.db.insert("notifications", {
      title: `New RFI: ${args.title} (${args.projectName})`,
      desc: `${args.createdByName}: ${args.details}`,
      createdAt: now,
      isRead: false,
      type: "rfi",
    });

    return { success: true, rfiId, rfiCode };
  },
});

export const updateStatus = mutation({
  args: {
    rfiId: v.id("rfis"),
    status: v.union(
      v.literal("OPEN"),
      v.literal("IN PROGRESS"),
      v.literal("FLAGGED FOR ADMIN REVIEW"),
      v.literal("RESOLVED")
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.rfiId);
    if (!existing) throw new Error("RFI or Dispute not found");

    await ctx.db.patch(args.rfiId, {
      status: args.status,
      updatedAt: Date.now(),
    });

    // Notify creator of status change
    if (existing.createdByWorkerId) {
      await ctx.db.insert("notifications", {
        title: `RFI Status Updated: ${existing.title}`,
        desc: `Status changed to "${args.status}" for ${existing.rfiCode} on ${existing.projectName}.`,
        recipientWorkerId: existing.createdByWorkerId,
        createdAt: Date.now(),
        isRead: false,
        type: "rfi",
      });
    }

    // Notify assigned worker if different from creator
    if (existing.workerId && existing.workerId !== existing.createdByWorkerId) {
      await ctx.db.insert("notifications", {
        title: `RFI Status Updated: ${existing.title}`,
        desc: `Status changed to "${args.status}" for ${existing.rfiCode} on ${existing.projectName}.`,
        recipientWorkerId: existing.workerId,
        createdAt: Date.now(),
        isRead: false,
        type: "rfi",
      });
    }

    return { success: true };
  },
});

export const remove = mutation({
  args: {
    rfiId: v.id("rfis"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.rfiId);
    return { success: true };
  },
});
