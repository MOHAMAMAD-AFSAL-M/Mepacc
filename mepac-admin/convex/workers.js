import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Auth helpers ─────────────────────────────────────────────────

async function requireAdminAuth(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

// Helper: verify a worker's active PIN given their workerId.
// Used by worker-facing mutations in checkIns.js.
export async function verifyWorkerPin(db, workerId, pin) {
  const worker = await db.get(workerId);
  if (!worker || !worker.isActive) throw new Error("Invalid credentials");
  if (worker.pin !== pin) throw new Error("Invalid credentials");
  return worker;
}

// Helper to compute initials from first and last name
export function getInitials(firstName, lastName) {
  return ((firstName?.[0] || "") + (lastName?.[0] || "")).toUpperCase();
}

// ── Queries ─────────────────────────────────────────────────────

export const list = query({
  args: {},
  handler: async (ctx) => {
    const workers = await ctx.db.query("workers").collect();
    return workers.map((w) => ({
      _id: w._id,
      _creationTime: w._creationTime,
      workerCode: w.workerCode || "W-000",
      displayId: w.workerCode || "W-000",
      firstName: w.firstName,
      lastName: w.lastName,
      role: w.role,
      mobile: w.mobile,  // admin needs to see mobile in the dashboard
      adminPin: w.adminPin,       // admin needs this to reset/communicate default PIN
      pinIsDefault: w.pinIsDefault, // flag: worker has not changed their PIN
      isActive: w.isActive,
      initials: getInitials(w.firstName, w.lastName),
      name: `${w.firstName} ${w.lastName}`,
    }));
  },
});

export const get = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    const worker = await ctx.db.get(args.workerId);
    if (!worker) return null;
    return {
      _id: worker._id,
      _creationTime: worker._creationTime,
      workerCode: worker.workerCode || "W-000",
      displayId: worker.workerCode || "W-000",
      firstName: worker.firstName,
      lastName: worker.lastName,
      role: worker.role,
      mobile: worker.mobile,  // admin needs to see mobile in the dashboard
      adminPin: worker.adminPin,
      pinIsDefault: worker.pinIsDefault,
      isActive: worker.isActive,
      initials: getInitials(worker.firstName, worker.lastName),
      name: `${worker.firstName} ${worker.lastName}`,
    };
  },
});

// ── Mutations ───────────────────────────────────────────────────

export const create = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(
      v.literal("Supervisor"),
      v.literal("Foreman"),
      v.literal("Technician"),
      v.literal("Designer")
    ),
    mobile: v.string(),
    adminPin: v.string(),
    workerCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);

    // Validate mobile: digits only, exactly 10
    if (!/^\d{10}$/.test(args.mobile)) {
      throw new Error("Mobile must be exactly 10 digits");
    }

    // Validate adminPin: digits only, 4-8 characters
    if (!/^\d{4,8}$/.test(args.adminPin)) {
      throw new Error("PIN must be 4–8 digits");
    }

    let workerCode = args.workerCode;
    if (!workerCode) {
      const existing = await ctx.db.query("workers").collect();
      const count = existing.filter((w) => w.role === args.role).length;
      const prefix =
        args.role === "Supervisor"
          ? "SUP"
          : args.role === "Foreman"
          ? "FOR"
          : args.role === "Designer"
          ? "DES"
          : "TEC";
      workerCode = `${prefix}-${String(count + 1).padStart(3, "0")}`;
    }

    return await ctx.db.insert("workers", {
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      mobile: args.mobile,
      adminPin: args.adminPin,
      pin: args.adminPin,        // worker's active PIN starts as adminPin
      pinIsDefault: true,        // worker must change on first login
      workerCode,
      isActive: true,
    });
  },
});

export const update = mutation({
  args: {
    workerId: v.id("workers"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("Supervisor"),
        v.literal("Foreman"),
        v.literal("Technician"),
        v.literal("Designer")
      )
    ),
    mobile: v.optional(v.string()),
    adminPin: v.optional(v.string()),
    workerCode: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);

    const { workerId, ...updates } = args;

    if (updates.mobile && !/^\d{10}$/.test(updates.mobile)) {
      throw new Error("Mobile must be exactly 10 digits");
    }

    if (updates.adminPin && !/^\d{4,8}$/.test(updates.adminPin)) {
      throw new Error("PIN must be 4–8 digits");
    }

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(workerId, cleanUpdates);
  },
});

export const toggleStatus = mutation({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new Error("Worker not found");
    await ctx.db.patch(args.workerId, { isActive: !worker.isActive });
  },
});

export const remove = mutation({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    const assignments = await ctx.db
      .query("projectAssignments")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .collect();
    for (const a of assignments) {
      await ctx.db.delete(a._id);
    }
    await ctx.db.delete(args.workerId);
  },
});

/**
 * Reset a worker's PIN back to their adminPin.
 * Sets pinIsDefault = true so the worker is forced to change it on next login.
 */
export const resetPin = mutation({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new Error("Worker not found");
    await ctx.db.patch(args.workerId, {
      pin: worker.adminPin,
      pinIsDefault: true,
    });
  },
});

// ── PWA Auth & Profile Functions ───────────────────────────────

export const loginWithPin = mutation({
  args: {
    mobile: v.string(), // can be workerCode (e.g. DES-001) or mobile number (e.g. 9876543210)
    pin: v.string(),
    sessionId: v.optional(v.string()),
    deviceName: v.optional(v.string()),
    forceOverride: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rawInput = (args.mobile || "").trim();
    const cleanDigits = rawInput.replace(/\D/g, "");
    const lowerInput = rawInput.toLowerCase();
    const cleanCode = lowerInput.replace(/[^a-z0-9]/g, "");

    const allWorkers = await ctx.db.query("workers").collect();
    const worker = allWorkers.find((w) => {
      // 1. Match by Worker Code (e.g. "DES-001", "DES001", "des-001")
      if (w.workerCode) {
        const wCodeLower = w.workerCode.trim().toLowerCase();
        const wCodeClean = wCodeLower.replace(/[^a-z0-9]/g, "");
        if (wCodeLower === lowerInput || wCodeClean === cleanCode) {
          return true;
        }
      }

      // 2. Match by Mobile Number
      if (cleanDigits.length >= 4 && w.mobile) {
        const wMobileClean = w.mobile.replace(/\D/g, "");
        if (wMobileClean === cleanDigits || (cleanDigits.length >= 10 && wMobileClean.endsWith(cleanDigits))) {
          return true;
        }
      }

      return false;
    });

    if (!worker) {
      throw new Error("Invalid Worker ID, Mobile number, or PIN");
    }

    const currentPin = worker.pin || worker.adminPin || "123456";
    const matchesPin =
      args.pin === worker.pin ||
      args.pin === worker.adminPin ||
      (args.pin === "123456" && (!worker.pin || worker.pinIsDefault));

    if (!matchesPin && currentPin !== args.pin) {
      throw new Error("Invalid Worker ID, Mobile number, or PIN");
    }

    if (worker.isActive === false) {
      throw new Error("Your account has been deactivated. Please contact admin.");
    }

    // Generate or use unique single-active-device session token
    const sessionToken = args.sessionId || `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Check if worker already has an ongoing active session on a different device
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
    const hasOngoingSession = Boolean(
      worker.currentSessionId &&
      worker.currentSessionId !== sessionToken &&
      worker.lastSessionAt &&
      Date.now() - worker.lastSessionAt < TWELVE_HOURS_MS
    );

    if (hasOngoingSession && !args.forceOverride) {
      return {
        hasActiveSession: true,
        existingDeviceName: worker.lastDeviceName || "Another Device",
        lastSessionAt: worker.lastSessionAt,
      };
    }

    // Override previous active device session
    await ctx.db.patch(worker._id, {
      currentSessionId: sessionToken,
      lastSessionAt: Date.now(),
      lastDeviceName: args.deviceName || "Mobile PWA",
    });

    const roleLower = worker.role.toLowerCase();
    const department =
      worker.role === "Supervisor"
        ? "Administration"
        : worker.role === "Foreman"
        ? "Operations"
        : worker.role === "Designer"
        ? "Engineering & Design"
        : "HVAC";

    return {
      hasActiveSession: false,
      user: {
        id: worker._id,
        name: `${worker.firstName} ${worker.lastName}`,
        firstName: worker.firstName,
        lastName: worker.lastName,
        mobile: worker.mobile,
        role: roleLower,
        workerCode: worker.workerCode || "W-000",
        department,
        avatar: null,
        sessionId: sessionToken,
      },
      role: roleLower,
      sessionId: sessionToken,
    };
  },
});

export const getActiveSession = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    const worker = await ctx.db.get(args.workerId);
    if (!worker) return null;
    return {
      currentSessionId: worker.currentSessionId || null,
      lastSessionAt: worker.lastSessionAt || null,
      lastDeviceName: worker.lastDeviceName || "Unknown Device",
      isActive: worker.isActive !== false,
    };
  },
});

export const claimSession = mutation({
  args: {
    workerId: v.id("workers"),
    sessionId: v.string(),
    deviceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new Error("Worker not found");
    if (worker.isActive === false) throw new Error("Account deactivated");

    await ctx.db.patch(args.workerId, {
      currentSessionId: args.sessionId,
      lastSessionAt: Date.now(),
      lastDeviceName: args.deviceName || "Mobile PWA",
    });

    return { success: true, sessionId: args.sessionId };
  },
});

export const changePin = mutation({
  args: {
    workerId: v.id("workers"),
    oldPin: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    if (!/^\d{6}$/.test(args.newPin)) {
      throw new Error("New PIN must be exactly 6 digits");
    }

    const worker = await ctx.db.get(args.workerId);
    if (!worker) throw new Error("Worker not found");

    const currentPin = worker.pin || worker.adminPin || "123456";
    const matchesOld =
      currentPin === args.oldPin ||
      worker.adminPin === args.oldPin ||
      (args.oldPin === "123456" && (!worker.pin || worker.pinIsDefault));

    if (!matchesOld) {
      throw new Error("Current PIN is incorrect");
    }

    await ctx.db.patch(args.workerId, {
      pin: args.newPin,
      pinIsDefault: false,
    });
    return { success: true, message: "PIN updated successfully" };
  },
});

export const getProfile = query({
  args: { workerId: v.id("workers") },
  handler: async (ctx, args) => {
    const worker = await ctx.db.get(args.workerId);
    if (!worker) return null;

    const assignment = await ctx.db
      .query("projectAssignments")
      .withIndex("by_worker", (q) => q.eq("workerId", args.workerId))
      .first();

    let project = null;
    if (assignment) {
      project = await ctx.db.get(assignment.projectId);
    }

    return {
      ...worker,
      name: `${worker.firstName} ${worker.lastName}`,
      initials: getInitials(worker.firstName, worker.lastName),
      assignedProject: project ? { id: project._id, name: project.name, location: project.location } : null,
    };
  },
});

