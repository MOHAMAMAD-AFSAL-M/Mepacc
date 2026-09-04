import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdminAuth(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

function getStartOfDayIST(timestamp = Date.now()) {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(timestamp + IST_OFFSET_MS);
  const year = istDate.getUTCFullYear();
  const month = istDate.getUTCMonth();
  const date = istDate.getUTCDate();
  return Date.UTC(year, month, date) - IST_OFFSET_MS;
}

function formatTimeIST(timestamp) {
  if (!timestamp) return null;
  return new Date(timestamp).toLocaleTimeString("en-US", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ── Queries ─────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();

    const enriched = await Promise.all(
      projects.map(async (project) => {
        const assignments = await ctx.db
          .query("projectAssignments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const startOfDay = getStartOfDayIST();
        const checkIns = await ctx.db
          .query("checkIns")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        const todayCheckIns = checkIns.filter((c) => c.checkInTime >= startOfDay);

        // Find supervisor visits for today
        const supervisorVisits = [];
        for (const c of todayCheckIns) {
          const worker = await ctx.db.get(c.workerId);
          if (worker && (worker.role === "Supervisor" || c.type === "Proxy")) {
            supervisorVisits.push({
              _id: c._id,
              workerId: c.workerId,
              supervisorName: `${worker.firstName} ${worker.lastName}`,
              supervisorCode: worker.workerCode || "SUP",
              checkInTime: c.checkInTime,
              checkInTimeStr: formatTimeIST(c.checkInTime),
              checkOutTime: c.checkOutTime || null,
              checkOutTimeStr: formatTimeIST(c.checkOutTime),
              status: c.status,
            });
          }
        }

        // Sort by newest visit first
        supervisorVisits.sort((a, b) => b.checkInTime - a.checkInTime);
        const isVisitedToday = supervisorVisits.length > 0;
        const lastSupervisorVisit = isVisitedToday ? supervisorVisits[0] : null;

        let imageUrl = null;
        if (project.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(project.imageStorageId);
        }

        return {
          ...project,
          imageUrl,
          totalAssigned: assignments.length,
          employeesPresent: todayCheckIns.length,
          isVisitedToday,
          visitedBySupervisorName: lastSupervisorVisit?.supervisorName || null,
          visitedAtTimeStr: lastSupervisorVisit?.checkInTimeStr || null,
          supervisorVisits,
        };
      })
    );

    return enriched;
  },
});

export const get = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    let imageUrl = null;
    if (project.imageStorageId) {
      imageUrl = await ctx.storage.getUrl(project.imageStorageId);
    }

    const assignments = await ctx.db
      .query("projectAssignments")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    const startOfDay = getStartOfDayIST();
    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();
    const todayCheckIns = checkIns.filter((c) => c.checkInTime >= startOfDay);

    return {
      ...project,
      imageUrl,
      totalAssigned: assignments.length,
      employeesPresent: todayCheckIns.length,
    };
  },
});

// ── Mutations (Admin-protected) ──────────────────────────────────

export const create = mutation({
  args: {
    name: v.string(),
    client: v.string(),
    location: v.string(),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    return await ctx.db.insert("projects", {
      ...args,
      isCompleted: false,
    });
  },
});

export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    client: v.optional(v.string()),
    location: v.optional(v.string()),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    imageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    const { projectId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(projectId, cleanUpdates);
  },
});

export const toggleComplete = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    await ctx.db.patch(args.projectId, { isCompleted: !project.isCompleted });
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// ── PWA Job & Project Queries ───────────────────────────────────

export const getActiveJobForWorker = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("projectAssignments")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();

    if (!assignment) return null;

    const project = await ctx.db.get(assignment.projectId);
    if (!project || project.isCompleted) return null;

    let imageUrl = null;
    if (project.imageStorageId) {
      imageUrl = await ctx.storage.getUrl(project.imageStorageId);
    }

    const startOfDay = getStartOfDayIST();

    const checkIns = await ctx.db
      .query("checkIns")
      .withIndex("by_project", (q) => q.eq("projectId", project._id))
      .collect();

    const myTodayCheckIn = checkIns.find(
      (c) => c.workerId === args.workerId && c.checkInTime >= startOfDay
    );

    const isClockedIn = Boolean(myTodayCheckIn && !myTodayCheckIn.checkOutTime);
    const isCompletedShift = Boolean(myTodayCheckIn && myTodayCheckIn.checkOutTime);

    const sysSettings = await ctx.db.query("settings").first();

    return {
      id: project._id,
      name: project.name,
      client: project.client,
      location: project.location,
      latitude: project.latitude,
      longitude: project.longitude,
      imageUrl:
        imageUrl ||
        "https://images.unsplash.com/photo-1541888081636-67a550d5145b?auto=format&fit=crop&q=80&w=800",
      dateStr: new Date().toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
      timeStr: sysSettings
        ? `${sysSettings.shiftStart} - ${sysSettings.shiftEnd}`
        : "08:00 AM - 05:00 PM",
      status: isCompletedShift
        ? "Shift Completed"
        : isClockedIn
        ? "Clocked In"
        : "Not Clocked In",
      assignedTo: args.workerId,
      isClockedIn,
      checkInId: myTodayCheckIn?._id || null,
      enforceGps: sysSettings?.enforceGps ?? true,
      geofenceRadius: sysSettings?.geofenceRadius ?? 100,
      allowSelfClockIn: sysSettings?.allowSelfClockIn ?? true,
    };
  },
});

export const getSupervisorProjects = query({
  args: { workerId: v.optional(v.id("workers")) },
  handler: async (ctx, args) => {
    const projects = await ctx.db.query("projects").collect();

    let assignedProjectIds = new Set();
    if (args.workerId) {
      const myAssignments = await ctx.db
        .query("projectAssignments")
        .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
        .collect();
      assignedProjectIds = new Set(myAssignments.map((a) => a.projectId));
    }

    const sysSettings = await ctx.db.query("settings").first();

    const enriched = await Promise.all(
      projects.map(async (project) => {
        const assignments = await ctx.db
          .query("projectAssignments")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        const blueprints = await ctx.db
          .query("blueprints")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();

        let imageUrl = null;
        if (project.imageStorageId) {
          imageUrl = await ctx.storage.getUrl(project.imageStorageId);
        }

        const startOfDay = getStartOfDayIST();

        const checkIns = await ctx.db
          .query("checkIns")
          .withIndex("by_project", (q) => q.eq("projectId", project._id))
          .collect();
        const todayCheckIns = checkIns.filter((c) => c.checkInTime >= startOfDay);

        // Find supervisor visits for today
        const supervisorVisits = [];
        for (const c of todayCheckIns) {
          const worker = await ctx.db.get(c.workerId);
          if (worker && (worker.role === "Supervisor" || c.type === "Proxy")) {
            supervisorVisits.push({
              _id: c._id,
              workerId: c.workerId,
              supervisorName: `${worker.firstName} ${worker.lastName}`,
              supervisorCode: worker.workerCode || "SUP",
              checkInTime: c.checkInTime,
              checkInTimeStr: formatTimeIST(c.checkInTime),
              checkOutTime: c.checkOutTime || null,
              checkOutTimeStr: formatTimeIST(c.checkOutTime),
              status: c.status,
            });
          }
        }

        supervisorVisits.sort((a, b) => b.checkInTime - a.checkInTime);
        const isVisitedToday = supervisorVisits.length > 0;
        const lastSupervisorVisit = isVisitedToday ? supervisorVisits[0] : null;
        const isVisitedByMe = args.workerId
          ? supervisorVisits.some((v) => v.workerId === args.workerId)
          : isVisitedToday;

        return {
          id: project._id,
          _id: project._id,
          name: project.name,
          client: project.client,
          location: project.location,
          latitude: project.latitude,
          longitude: project.longitude,
          imageUrl:
            imageUrl ||
            "https://images.unsplash.com/photo-1541888081636-67a550d5145b?auto=format&fit=crop&q=80&w=800",
          totalAssigned: assignments.length,
          presentCount: todayCheckIns.length,
          blueprintsCount: blueprints.length,
          isCompleted: project.isCompleted,
          isAssignedToMe: args.workerId ? assignedProjectIds.has(project._id) : true,
          isVisitedToday,
          isVisitedByMe,
          visitedBySupervisorName: lastSupervisorVisit?.supervisorName || null,
          visitedAtTimeStr: lastSupervisorVisit?.checkInTimeStr || null,
          supervisorVisits,
          enforceGps: sysSettings?.enforceGps ?? true,
          geofenceRadius: sysSettings?.geofenceRadius ?? 100,
          allowSelfClockIn: sysSettings?.allowSelfClockIn ?? true,
        };
      })
    );

    return enriched;
  },
});

