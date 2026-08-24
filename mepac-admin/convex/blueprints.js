import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdminAuth(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

// ── Helper: Prune older revisions to enforce Max 3 Versions FIFO Rule ──
async function pruneOldRevisions(ctx, blueprintId) {
  const revisions = await ctx.db
    .query("blueprintRevisions")
    .withIndex("by_blueprint", (q) => q.eq("blueprintId", blueprintId))
    .collect();

  // Sort by version ascending (oldest first)
  revisions.sort((a, b) => a.version - b.version);

  // If more than 3 revisions exist, delete the oldest excess revisions and their storage files
  if (revisions.length > 3) {
    const toDelete = revisions.slice(0, revisions.length - 3);
    for (const oldRev of toDelete) {
      if (oldRev.fileStorageId) {
        try {
          await ctx.storage.delete(oldRev.fileStorageId);
        } catch (_) {
          // File might already be purged
        }
      }
      await ctx.db.delete(oldRev._id);
    }
  }
}

// ── Queries ─────────────────────────────────────────────────────

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const blueprints = await ctx.db.query("blueprints").collect();

    const enriched = await Promise.all(
      blueprints.map(async (bp) => {
        const latestRevision = await ctx.db
          .query("blueprintRevisions")
          .withIndex("by_blueprint_and_version", (q) =>
            q.eq("blueprintId", bp._id).eq("version", bp.currentVersion)
          )
          .first();

        let fileUrl = null;
        if (latestRevision?.fileStorageId) {
          fileUrl = await ctx.storage.getUrl(latestRevision.fileStorageId);
        }

        const project = await ctx.db.get(bp.projectId);

        return {
          ...bp,
          projectName: project?.name || "Project",
          projectLocation: project?.location || "",
          fileUrl,
          latestRevision: latestRevision
            ? {
                ...latestRevision,
                fileUrl,
              }
            : null,
        };
      })
    );

    return enriched.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const blueprints = await ctx.db
      .query("blueprints")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const enriched = await Promise.all(
      blueprints.map(async (bp) => {
        const latestRevision = await ctx.db
          .query("blueprintRevisions")
          .withIndex("by_blueprint_and_version", (q) =>
            q.eq("blueprintId", bp._id).eq("version", bp.currentVersion)
          )
          .first();

        let fileUrl = null;
        if (latestRevision?.fileStorageId) {
          fileUrl = await ctx.storage.getUrl(latestRevision.fileStorageId);
        }

        // Also fetch all active revisions (max 3) for quick inline version history
        const allRevs = await ctx.db
          .query("blueprintRevisions")
          .withIndex("by_blueprint", (q) => q.eq("blueprintId", bp._id))
          .collect();

        const revisionsWithUrls = await Promise.all(
          allRevs.map(async (r) => {
            let rUrl = null;
            if (r.fileStorageId) {
              rUrl = await ctx.storage.getUrl(r.fileStorageId);
            }
            return {
              ...r,
              fileUrl: rUrl,
            };
          })
        );
        revisionsWithUrls.sort((a, b) => b.version - a.version);

        return {
          ...bp,
          fileUrl,
          latestRevision: latestRevision
            ? {
                ...latestRevision,
                fileUrl,
              }
            : null,
          revisions: revisionsWithUrls,
          totalRevisionsCount: revisionsWithUrls.length,
        };
      })
    );

    return enriched.sort((a, b) => b._creationTime - a._creationTime);
  },
});

export const getRevisions = query({
  args: { blueprintId: v.id("blueprints") },
  handler: async (ctx, args) => {
    const revisions = await ctx.db
      .query("blueprintRevisions")
      .withIndex("by_blueprint", (q) => q.eq("blueprintId", args.blueprintId))
      .collect();

    const enriched = await Promise.all(
      revisions.map(async (rev) => {
        let fileUrl = null;
        if (rev.fileStorageId) {
          fileUrl = await ctx.storage.getUrl(rev.fileStorageId);
        }
        return { ...rev, fileUrl };
      })
    );

    return enriched.sort((a, b) => b.version - a.version);
  },
});

// ── Mutations ───────────────────────────────────────────────────

// Generates upload URL for authenticated workers/designers
export const generateWorkerUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Admin upload URL generator
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// Create blueprint (Admin or Designer)
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    fileStorageId: v.id("_storage"),
    uploadedBy: v.optional(v.string()),
    category: v.optional(v.string()),
    notes: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.string()),
    uploadedByRole: v.optional(v.string()),
    workerId: v.optional(v.id("workers")),
  },
  handler: async (ctx, args) => {
    const blueprintId = await ctx.db.insert("blueprints", {
      projectId: args.projectId,
      name: args.name,
      currentVersion: 1,
      category: args.category || "Electrical",
      discipline: args.category || "Electrical",
    });

    await ctx.db.insert("blueprintRevisions", {
      blueprintId,
      version: 1,
      fileStorageId: args.fileStorageId,
      uploadedAt: Date.now(),
      uploadedBy: args.uploadedBy || "Designer",
      uploadedByRole: args.uploadedByRole || "Designer",
      workerId: args.workerId,
      notes: args.notes || "Initial release (v1)",
      fileName: args.fileName,
      fileSize: args.fileSize,
    });

    return blueprintId;
  },
});

// Upload revision with Max 3 Versions FIFO Queue rule
export const uploadRevision = mutation({
  args: {
    blueprintId: v.id("blueprints"),
    fileStorageId: v.id("_storage"),
    uploadedBy: v.optional(v.string()),
    uploadedByRole: v.optional(v.string()),
    workerId: v.optional(v.id("workers")),
    notes: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const blueprint = await ctx.db.get(args.blueprintId);
    if (!blueprint) throw new Error("Blueprint not found");

    const newVersion = blueprint.currentVersion + 1;
    await ctx.db.patch(args.blueprintId, { currentVersion: newVersion });

    await ctx.db.insert("blueprintRevisions", {
      blueprintId: args.blueprintId,
      version: newVersion,
      fileStorageId: args.fileStorageId,
      uploadedAt: Date.now(),
      uploadedBy: args.uploadedBy || "Designer",
      uploadedByRole: args.uploadedByRole || "Designer",
      workerId: args.workerId,
      notes: args.notes || `Updated revision (v${newVersion})`,
      fileName: args.fileName,
      fileSize: args.fileSize,
    });

    // Enforce Max 3 Versions FIFO Queue: prune oldest excess versions
    await pruneOldRevisions(ctx, args.blueprintId);

    return newVersion;
  },
});

export const setAsLatest = mutation({
  args: { blueprintId: v.id("blueprints") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.blueprintId, { pinnedAt: Date.now() });
  },
});

// Delete blueprint and all its files from storage
export const remove = mutation({
  args: { blueprintId: v.id("blueprints") },
  handler: async (ctx, args) => {
    const revisions = await ctx.db
      .query("blueprintRevisions")
      .withIndex("by_blueprint", (q) => q.eq("blueprintId", args.blueprintId))
      .collect();

    for (const rev of revisions) {
      try {
        if (rev.fileStorageId) await ctx.storage.delete(rev.fileStorageId);
      } catch (_) {
        // File may already be removed
      }
      await ctx.db.delete(rev._id);
    }

    await ctx.db.delete(args.blueprintId);
  },
});
