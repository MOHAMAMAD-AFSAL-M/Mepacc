import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getInitials } from "./workers";

async function requireAdminAuth(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

// ── Queries ─────────────────────────────────────────────────────

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("projectAssignments")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const workers = await Promise.all(
      assignments.map(async (a) => {
        const worker = await ctx.db.get(a.workerId);
        if (!worker) return null;
        return {
          _id: worker._id,
          workerCode: worker.workerCode,
          firstName: worker.firstName,
          lastName: worker.lastName,
          role: worker.role,
          isActive: worker.isActive,
          adminPin: worker.adminPin,
          pinIsDefault: worker.pinIsDefault,
          assignmentId: a._id,
          initials: getInitials(worker.firstName, worker.lastName),
          name: `${worker.firstName} ${worker.lastName}`,
        };
      })
    );

    return workers.filter(Boolean);
  },
});

export const getByWorker = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("projectAssignments")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .collect();

    const projects = await Promise.all(
      assignments.map(async (a) => await ctx.db.get(a.projectId))
    );

    return projects.filter(Boolean);
  },
});

// ── Mutations (Admin-protected) ──────────────────────────────────

export const assign = mutation({
  args: {
    projectId: v.id("projects"),
    workerId: v.id("workers"),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("projectAssignments")
      .withIndex("by_project_and_worker", (q) =>
        q.eq("projectId", args.projectId).eq("workerId", args.workerId)
      )
      .first();

    if (existing) throw new Error("Worker is already assigned to this project");

    const assignId = await ctx.db.insert("projectAssignments", {
      projectId: args.projectId,
      workerId: args.workerId,
    });

    try {
      const project = await ctx.db.get(args.projectId);
      if (project) {
        await ctx.db.insert("notifications", {
          title: `Project Assigned: ${project.name}`,
          desc: `You have been assigned to ${project.name} (${project.location || 'Site'}).`,
          recipientWorkerId: args.workerId,
          createdAt: Date.now(),
          isRead: false,
          type: "assignment",
        });
      }
    } catch (_) {}

    return assignId;
  },
});

export const remove = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    workerId: v.optional(v.id("workers")),
    assignmentId: v.optional(v.id("projectAssignments")),
  },
  handler: async (ctx, args) => {
    if (args.assignmentId) {
      const existing = await ctx.db.get(args.assignmentId);
      if (existing) {
        await ctx.db.delete(args.assignmentId);
      }
      return;
    }
    if (args.projectId && args.workerId) {
      const assignments = await ctx.db
        .query("projectAssignments")
        .withIndex("by_project_and_worker", (q) =>
          q.eq("projectId", args.projectId).eq("workerId", args.workerId)
        )
        .collect();

      for (const a of assignments) {
        await ctx.db.delete(a._id);
      }
    }
  },
});
