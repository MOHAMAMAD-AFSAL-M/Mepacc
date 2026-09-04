import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getInitials, verifyWorkerPin } from "./workers";

// ── Auth helper ─────────────────────────────────────────────────

async function requireAdminAuth(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

// ── IST Timezone Helpers (UTC+5:30) ─────────────────────────────

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

// Get today's check-ins for a project (admin-only)
export const getByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const startOfDay = getStartOfDayIST();

    const allCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const todayCheckIns = allCheckIns.filter(
      (c) => c.checkInTime >= startOfDay
    );

    // Enrich with worker info
    const enriched = await Promise.all(
      todayCheckIns.map(async (checkIn) => {
        const worker = await ctx.db.get(checkIn.workerId);
        if (!worker) return null;
        return {
          ...checkIn,
          name: `${worker.firstName} ${worker.lastName}`,
          initials: getInitials(worker.firstName, worker.lastName),
          checkInTimeStr: formatTimeIST(checkIn.checkInTime),
          checkOutTimeStr: formatTimeIST(checkIn.checkOutTime),
        };
      })
    );

    return enriched.filter(Boolean);
  },
});

// ── Worker-Facing Mutations (authenticated by workerId + PIN) ────

export const workerLogin = mutation({
  args: {
    mobile: v.string(),
    pin: v.string(),
  },
  handler: async (ctx, { mobile, pin }) => {
    const worker = await ctx.db
      .query("workers")
      .filter((q) => q.eq(q.field("mobile"), mobile))
      .first();

    if (!worker || !worker.isActive) throw new Error("Invalid credentials");
    if (worker.pin !== pin) throw new Error("Invalid credentials");

    return {
      workerId: worker._id,
      workerCode: worker.workerCode,
      firstName: worker.firstName,
      lastName: worker.lastName,
      role: worker.role,
      pinIsDefault: worker.pinIsDefault,
    };
  },
});

export const checkIn = mutation({
  args: {
    workerId: v.id("workers"),
    pin: v.string(),
    projectId: v.id("projects"),
    type: v.union(v.literal("Self"), v.literal("Proxy")),
  },
  handler: async (ctx, args) => {
    const worker = await verifyWorkerPin(ctx.db, args.workerId, args.pin);

    const startOfDay = getStartOfDayIST();
    const existingCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .collect();

    const todayCheckIn = existingCheckIns.find(
      (c) => c.checkInTime >= startOfDay
    );

    const status = args.type === "Self" ? "Verified" : "Pending Approval";

    let checkInId;
    if (todayCheckIn) {
      checkInId = todayCheckIn._id;
      await ctx.db.replace(todayCheckIn._id, {
        projectId: args.projectId,
        workerId: args.workerId,
        checkInTime: Date.now(),
        type: args.type,
        status,
      });
    } else {
      checkInId = await ctx.db.insert("checkIns", {
        projectId: args.projectId,
        workerId: args.workerId,
        checkInTime: Date.now(),
        type: args.type,
        status,
      });
    }

    return {
      checkInId,
      requiresPinChange: worker.pinIsDefault,
    };
  },
});

export const workerCheckOut = mutation({
  args: {
    workerId: v.id("workers"),
    pin: v.string(),
    checkInId: v.id("checkIns"),
  },
  handler: async (ctx, args) => {
    await verifyWorkerPin(ctx.db, args.workerId, args.pin);

    const checkIn = await ctx.db.get(args.checkInId);
    if (!checkIn) throw new Error("Check-in not found");

    if (checkIn.workerId !== args.workerId) throw new Error("Unauthorized");

    await ctx.db.patch(args.checkInId, { checkOutTime: Date.now() });
  },
});

export const workerChangePin = mutation({
  args: {
    workerId: v.id("workers"),
    currentPin: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    await verifyWorkerPin(ctx.db, args.workerId, args.currentPin);

    if (!/^\d{4,8}$/.test(args.newPin)) {
      throw new Error("New PIN must be 4–8 digits");
    }

    await ctx.db.patch(args.workerId, {
      pin: args.newPin,
      pinIsDefault: false,
    });
  },
});

// ── Admin-Only Mutations ─────────────────────────────────────────

export const checkOut = mutation({
  args: {
    checkInId: v.id("checkIns"),
    checkOutTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);

    let checkOutTime = args.checkOutTime;

    if (!checkOutTime) {
      const checkIn = await ctx.db.get(args.checkInId);
      if (!checkIn) throw new Error("Check-in not found");

      const checkInDate = new Date(checkIn.checkInTime);
      checkOutTime = new Date(
        checkInDate.getFullYear(),
        checkInDate.getMonth(),
        checkInDate.getDate(),
        16, 0, 0
      ).getTime();
    }

    await ctx.db.patch(args.checkInId, { checkOutTime });
  },
});

export const approveProxy = mutation({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    await ctx.db.patch(args.checkInId, { status: "Verified" });
  },
});

// ── PWA Attendance & Check-In Functions ───────────────────────────

export const getTodayStatus = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    const startOfDay = getStartOfDayIST();

    const workerCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .collect();

    const todayCheckIn = workerCheckIns.find(
      (c) => c.checkInTime >= startOfDay
    );

    const isClockedIn = Boolean(todayCheckIn && !todayCheckIn.checkOutTime);
    const isCompleted = Boolean(todayCheckIn && todayCheckIn.checkOutTime);

    return {
      isClockedIn,
      isCompleted,
      checkIn: todayCheckIn || null,
    };
  },
});

export const clockInWorker = mutation({
  args: {
    workerId: v.id("workers"),
    projectId: v.optional(v.id("projects")),
    type: v.optional(v.union(v.literal("Self"), v.literal("Proxy"))),
  },
  handler: async (ctx, args) => {
    let projectId = args.projectId;

    if (!projectId) {
      const assignment = await ctx.db
        .query("projectAssignments")
        .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
        .first();

      if (assignment) {
        projectId = assignment.projectId;
      } else {
        throw new Error("No active project site assigned to this worker. Please assign a project in the Admin Panel.");
      }
    }

    const startOfDay = getStartOfDayIST();

    const existingCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .collect();

    const todayCheckInForProject = existingCheckIns.find(
      (c) => c.checkInTime >= startOfDay && c.projectId === projectId
    );

    const type = args.type || "Self";
    const status = type === "Proxy" ? "Pending Approval" : "Verified";

    let checkInId;
    if (todayCheckInForProject) {
      if (!todayCheckInForProject.checkOutTime) {
        return todayCheckInForProject._id;
      }
      // If worker previously clocked out of this project today, reactivate / update
      checkInId = todayCheckInForProject._id;
      await ctx.db.patch(todayCheckInForProject._id, {
        checkInTime: Date.now(),
        checkOutTime: undefined,
        type,
        status,
      });
    } else {
      checkInId = await ctx.db.insert("checkIns", {
        projectId,
        workerId: args.workerId,
        checkInTime: Date.now(),
        type,
        status,
      });
    }

    if (type === "Proxy") {
      const worker = await ctx.db.get(args.workerId);
      const workerName = worker ? `${worker.firstName} ${worker.lastName}` : "Worker";
      await ctx.db.insert("notifications", {
        title: "Proxy Check-in Alert",
        desc: `${workerName} was checked in via proxy. Supervisor approval required.`,
        createdAt: Date.now(),
        isRead: false,
      });
    }

    return checkInId;
  },
});

export const clockOutWorker = mutation({
  args: {
    workerId: v.id("workers"),
    checkInId: v.optional(v.id("checkIns")),
  },
  handler: async (ctx, args) => {
    let targetCheckInId = args.checkInId;

    if (!targetCheckInId) {
      const startOfDay = getStartOfDayIST();

      const existingCheckIns = await ctx.db
        .query("checkIns")
        .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
        .collect();

      const activeCheckIn = existingCheckIns.find(
        (c) => c.checkInTime >= startOfDay && !c.checkOutTime
      );

      if (!activeCheckIn) {
        throw new Error("No active check-in found to clock out");
      }
      targetCheckInId = activeCheckIn._id;
    }

    await ctx.db.patch(targetCheckInId, {
      checkOutTime: Date.now(),
    });

    return { success: true };
  },
});

export const getMonthlyAttendance = query({
  args: {
    workerId: v.id("workers"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const daysInMonth = new Date(args.year, args.month, 0).getDate();
    const startOfMonth = new Date(args.year, args.month - 1, 1).getTime();
    const endOfMonth = new Date(args.year, args.month, 0, 23, 59, 59).getTime();

    const allCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .collect();

    const monthCheckIns = allCheckIns.filter(
      (c) => c.checkInTime >= startOfMonth && c.checkInTime <= endOfMonth
    );

    const now = new Date();
    const records = [];
    let totalWorked = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(args.year, args.month - 1, day);
      const dayOfWeek = dateObj.getDay();

      if (dateObj > now) {
        records.push({ day, status: "none" });
        continue;
      }

      const dayStart = new Date(args.year, args.month - 1, day).getTime();
      const dayEnd = new Date(args.year, args.month - 1, day, 23, 59, 59).getTime();

      const dayCheckIn = monthCheckIns.find(
        (c) => c.checkInTime >= dayStart && c.checkInTime <= dayEnd
      );

      if (dayCheckIn) {
        records.push({ day, status: "full" });
        totalWorked += 1;
      } else if (dayOfWeek === 0) {
        records.push({ day, status: "leave" });
      } else {
        records.push({ day, status: "leave" });
      }
    }

    return {
      records,
      totalWorked,
    };
  },
});

export const getCrewAttendance = query({
  args: { foremanId: v.id("workers") },
  handler: async (ctx, args) => {
    const assignment = await ctx.db
      .query("projectAssignments")
      .withIndex("by_worker", (q) => q.eq("workerId", args.foremanId))
      .first();

    const projectId = assignment?.projectId;
    if (!projectId) return [];

    const projectAssignments = await ctx.db
      .query("projectAssignments")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    const startOfDay = getStartOfDayIST();

    const todayCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    const crew = await Promise.all(
      projectAssignments.map(async (pa) => {
        const worker = await ctx.db.get(pa.workerId);
        if (!worker) return null;

        const checkIn = todayCheckIns.find(
          (c) => c.workerId === worker._id && c.checkInTime >= startOfDay
        );

        let status = "Not Marked";
        if (checkIn) {
          if (checkIn.checkOutTime) {
            status = "Clocked Out";
          } else if (checkIn.status === "Pending Approval") {
            status = "Pending Approval";
          } else {
            status = "Clocked In";
          }
        }

        return {
          id: worker._id,
          workerCode: worker.workerCode || "W-000",
          name: `${worker.firstName} ${worker.lastName}`,
          role: worker.role,
          mobile: worker.mobile,
          initials: getInitials(worker.firstName, worker.lastName),
          status,
          isPresent: Boolean(checkIn),
          checkInId: checkIn?._id || null,
          checkInTime: formatTimeIST(checkIn?.checkInTime),
          type: checkIn?.type || null,
        };
      })
    );

    return crew.filter(Boolean);
  },
});

export const proxyCheckIn = mutation({
  args: {
    foremanId: v.id("workers"),
    workerId: v.id("workers"),
    projectId: v.optional(v.id("projects")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let projectId = args.projectId;

    if (!projectId) {
      const assignment = await ctx.db
        .query("projectAssignments")
        .withIndex("by_worker", (q) => q.eq("workerId", args.foremanId))
        .first();
      projectId = assignment?.projectId;

      if (!projectId) {
        throw new Error("Foreman has no assigned project site.");
      }
    }

    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new Error("Worker not found");

    const startOfDay = getStartOfDayIST();

    const existingCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .collect();

    const todayCheckIn = existingCheckIns.find(
      (c) => c.checkInTime >= startOfDay
    );

    let checkInId;
    if (todayCheckIn) {
      checkInId = todayCheckIn._id;
      await ctx.db.replace(todayCheckIn._id, {
        projectId,
        workerId: args.workerId,
        checkInTime: Date.now(),
        type: "Proxy",
        status: "Pending Approval",
      });
    } else {
      checkInId = await ctx.db.insert("checkIns", {
        projectId,
        workerId: args.workerId,
        checkInTime: Date.now(),
        type: "Proxy",
        status: "Pending Approval",
      });
    }

    const foreman = await ctx.db.get(args.foremanId);
    const foremanName = foreman ? `${foreman.firstName} ${foreman.lastName}` : "Foreman";

    await ctx.db.insert("notifications", {
      title: "Proxy Check-in Alert",
      desc: `${worker.firstName} ${worker.lastName} was checked in via proxy by ${foremanName}.${args.reason ? ` Reason: ${args.reason}` : ""}`,
      createdAt: Date.now(),
      isRead: false,
    });

    return checkInId;
  },
});

// ── Admin Dashboard: All Today's Check-Ins ──────────────────────

export const getAllToday = query({
  args: {},
  handler: async (ctx) => {
    const startOfDay = getStartOfDayIST();

    const allCheckIns = await ctx.db.query("checkIns").collect();
    const todayCheckIns = allCheckIns.filter(
      (c) => c.checkInTime >= startOfDay
    );

    // Keep the latest check-in per worker per project today
    const latestByWorkerProject = new Map();
    for (const checkIn of todayCheckIns) {
      const key = `${checkIn.workerId}_${checkIn.projectId}`;
      const existing = latestByWorkerProject.get(key);
      if (!existing || checkIn.checkInTime > existing.checkInTime) {
        latestByWorkerProject.set(key, checkIn);
      }
    }

    const deduplicatedTodayCheckIns = Array.from(latestByWorkerProject.values());

    const enriched = await Promise.all(
      deduplicatedTodayCheckIns.map(async (checkIn) => {
        const worker = await ctx.db.get(checkIn.workerId);
        const project = await ctx.db.get(checkIn.projectId);
        if (!worker) return null;

        const checkInTimeStr = formatTimeIST(checkIn.checkInTime);

        let checkOutTimeStr = null;
        let hoursWorked = null;
        if (checkIn.checkOutTime) {
          checkOutTimeStr = formatTimeIST(checkIn.checkOutTime);
          hoursWorked = ((checkIn.checkOutTime - checkIn.checkInTime) / (1000 * 60 * 60)).toFixed(1);
        }

        // Determine if late (after 08:30 AM IST)
        const lateThreshold = startOfDay + (8 * 60 + 30) * 60 * 1000;
        const isLate = checkIn.checkInTime > lateThreshold;

        return {
          _id: checkIn._id,
          workerId: checkIn.workerId,
          projectId: checkIn.projectId,
          workerName: `${worker.firstName} ${worker.lastName}`,
          name: `${worker.firstName} ${worker.lastName}`,
          workerCode: worker.workerCode || "W-000",
          role: worker.role,
          initials: getInitials(worker.firstName, worker.lastName),
          projectName: project?.name || "Unknown",
          projectLocation: project?.location || "",
          checkInTime: checkIn.checkInTime,
          checkInTimeStr,
          checkOutTime: checkIn.checkOutTime || null,
          checkOutTimeStr,
          hoursWorked,
          type: checkIn.type,
          status: checkIn.status,
          isLate,
        };
      })
    );

    return enriched.filter(Boolean);
  },
});

// ── Admin Query: Attendance Records by Worker ──────────────────

export const getByWorker = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    const records = await ctx.db
      .query("checkIns")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .collect();

    const enriched = await Promise.all(
      records.map(async (c) => {
        const project = await ctx.db.get(c.projectId);
        const checkInTimeStr = formatTimeIST(c.checkInTime);
        const checkOutTimeStr = c.checkOutTime ? formatTimeIST(c.checkOutTime) : null;
        const dateStr = new Date(c.checkInTime).toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });
        let hoursWorked = null;
        if (c.checkOutTime) {
          hoursWorked = ((c.checkOutTime - c.checkInTime) / (1000 * 60 * 60)).toFixed(1);
        }
        return {
          _id: c._id,
          workerId: c.workerId,
          projectId: c.projectId,
          projectName: project?.name || "Unassigned Site",
          projectLocation: project?.location || "",
          checkInTime: c.checkInTime,
          checkOutTime: c.checkOutTime || null,
          checkInTimeStr,
          checkOutTimeStr,
          dateStr,
          hoursWorked,
          type: c.type,
          status: c.status,
        };
      })
    );

    return enriched.sort((a, b) => b.checkInTime - a.checkInTime);
  },
});

export const adminOverrideAttendance = mutation({
  args: {
    checkInId: v.optional(v.id("checkIns")),
    workerId: v.id("workers"),
    projectId: v.id("projects"),
    checkInTime: v.number(),
    checkOutTime: v.optional(v.number()),
    type: v.optional(
      v.union(
        v.literal("Self"),
        v.literal("Proxy"),
        v.literal("Manual"),
        v.literal("Manual Override")
      )
    ),
    status: v.optional(
      v.union(
        v.literal("Verified"),
        v.literal("Pending Approval"),
        v.literal("On Site"),
        v.literal("Completed")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    const checkInStatus = args.status || "Verified";
    const checkInType = args.type || "Manual Override";

    if (args.checkInId) {
      await ctx.db.patch(args.checkInId, {
        projectId: args.projectId,
        checkInTime: args.checkInTime,
        checkOutTime: args.checkOutTime !== undefined ? args.checkOutTime : undefined,
        type: checkInType,
        status: checkInStatus,
      });
      return args.checkInId;
    } else {
      return await ctx.db.insert("checkIns", {
        projectId: args.projectId,
        workerId: args.workerId,
        checkInTime: args.checkInTime,
        checkOutTime: args.checkOutTime || undefined,
        type: checkInType,
        status: checkInStatus,
      });
    }
  },
});

// ── Supervisor Site Visits Tracking ────────────────────────────────

export const getProjectSupervisorVisits = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const startOfDay = getStartOfDayIST();

    const allCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Filter to only checkIns where the worker is a Supervisor
    const supervisorCheckIns = await Promise.all(
      allCheckIns.map(async (c) => {
        const worker = await ctx.db.get(c.workerId);
        if (!worker || worker.role !== "Supervisor") return null;

        const checkInTimeStr = formatTimeIST(c.checkInTime);
        const checkOutTimeStr = formatTimeIST(c.checkOutTime);
        const dateStr = new Date(c.checkInTime).toLocaleDateString("en-US", {
          timeZone: "Asia/Kolkata",
          month: "short",
          day: "numeric",
          year: "numeric",
        });

        let durationHours = null;
        if (c.checkOutTime) {
          durationHours = ((c.checkOutTime - c.checkInTime) / (1000 * 60 * 60)).toFixed(1);
        }

        return {
          _id: c._id,
          workerId: c.workerId,
          supervisorName: `${worker.firstName} ${worker.lastName}`,
          supervisorCode: worker.workerCode || "S-000",
          initials: getInitials(worker.firstName, worker.lastName),
          checkInTime: c.checkInTime,
          checkOutTime: c.checkOutTime || null,
          checkInTimeStr,
          checkOutTimeStr,
          dateStr,
          durationHours,
          status: c.status,
          type: c.type,
          isToday: c.checkInTime >= startOfDay,
        };
      })
    );

    const validVisits = supervisorCheckIns.filter(Boolean);
    const todayVisits = validVisits.filter((v) => v.isToday);
    const historyVisits = validVisits.sort((a, b) => b.checkInTime - a.checkInTime);

    const isVisitedToday = todayVisits.length > 0;
    const lastVisitedBy = isVisitedToday ? todayVisits[0].supervisorName : null;
    const lastVisitedTimeStr = isVisitedToday ? todayVisits[0].checkInTimeStr : null;

    return {
      isVisitedToday,
      lastVisitedBy,
      lastVisitedTimeStr,
      todayVisits,
      historyVisits,
      totalVisitsCount: validVisits.length,
    };
  },
});

export const getAllProjectsSupervisorVisits = query({
  args: {},
  handler: async (ctx) => {
    const startOfDay = getStartOfDayIST();
    const allCheckIns = await ctx.db.query("checkIns").collect();

    const todaySupervisorCheckIns = [];
    for (const c of allCheckIns) {
      if (c.checkInTime >= startOfDay) {
        const worker = await ctx.db.get(c.workerId);
        if (worker && worker.role === "Supervisor") {
          todaySupervisorCheckIns.push({
            ...c,
            supervisorName: `${worker.firstName} ${worker.lastName}`,
            initials: getInitials(worker.firstName, worker.lastName),
            checkInTimeStr: formatTimeIST(c.checkInTime),
          });
        }
      }
    }

    // Group by projectId
    const visitsByProject = {};
    for (const visit of todaySupervisorCheckIns) {
      const pId = visit.projectId;
      if (!visitsByProject[pId]) {
        visitsByProject[pId] = [];
      }
      visitsByProject[pId].push(visit);
    }

    return visitsByProject;
  },
});

export const adminDeleteAttendance = mutation({
  args: { checkInId: v.id("checkIns") },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    await ctx.db.delete(args.checkInId);
    return { success: true };
  },
});



