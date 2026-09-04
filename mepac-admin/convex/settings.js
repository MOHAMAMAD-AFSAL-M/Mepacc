import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

async function requireAdminAuth(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  return userId;
}

// Default settings used when no settings document exists yet
const DEFAULTS = {
  companyName: "MEPac Solutions Pvt Ltd",
  companyEmail: "admin@mepac.com",
  companyPhone: "5551234567",
  companyAddress: "101 Industrial Park Way, Sector 4\nMetropolis, NY 10001",

  shiftStart: "08:00",
  shiftEnd: "17:00",
  lateBuffer: "15 minutes",
  autoAbsent: "4 hours",

  workWeek: {
    M: true,
    T: true,
    W: true,
    T1: true,
    F: true,
    S1: true,
    S2: false,
  },

  holidays: [
    { name: "Republic Day", date: "26/01" },
    { name: "Independence Day", date: "15/08" },
  ],

  enforceGps: false,
  geofenceRadius: 200,

  silentAlert: "24 hours",
  proxyReminder: "3 days",
  disputeResolution: "5 days",

  requirePhoto: false,
  allowSelfClockIn: true,
  requireReason: true,
};

// ── Queries ─────────────────────────────────────────────────────

export const get = query({
  args: {},
  handler: async (ctx) => {
    // Get the first (and only) settings document
    const settings = await ctx.db.query("settings").first();

    if (!settings) {
      // Return defaults with a flag so the frontend knows
      return { ...DEFAULTS, _isDefault: true };
    }

    // Enrich with logo URL if available
    let logoUrl = null;
    if (settings.logoStorageId) {
      logoUrl = await ctx.storage.getUrl(settings.logoStorageId);
    }

    return { ...settings, logoUrl };
  },
});

// ── Mutations ───────────────────────────────────────────────────

export const save = mutation({
  args: {
    companyName: v.string(),
    companyEmail: v.string(),
    companyPhone: v.string(),
    companyAddress: v.string(),
    logoStorageId: v.optional(v.id("_storage")),

    shiftStart: v.string(),
    shiftEnd: v.string(),
    lateBuffer: v.string(),
    autoAbsent: v.string(),

    workWeek: v.object({
      M: v.boolean(),
      T: v.boolean(),
      W: v.boolean(),
      T1: v.boolean(),
      F: v.boolean(),
      S1: v.boolean(),
      S2: v.boolean(),
    }),

    holidays: v.array(
      v.object({
        name: v.string(),
        date: v.string(),
      })
    ),

    enforceGps: v.boolean(),
    geofenceRadius: v.number(),

    silentAlert: v.string(),
    proxyReminder: v.string(),
    disputeResolution: v.string(),

    requirePhoto: v.boolean(),
    allowSelfClockIn: v.boolean(),
    requireReason: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdminAuth(ctx);
    const existing = await ctx.db.query("settings").first();

    if (existing) {
      await ctx.db.patch(existing._id, args);
    } else {
      await ctx.db.insert("settings", args);
    }
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});
