import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // ── Global Workforce ──────────────────────────────────────────
  workers: defineTable({
    workerCode: v.optional(v.string()),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(
      v.literal("Supervisor"),
      v.literal("Foreman"),
      v.literal("Technician"),
      v.literal("Designer")
    ),
    mobile: v.string(), // Used only for workerLogin lookup; never returned to frontend
    adminPin: v.optional(v.string()), // Set by admin; shown in admin panel for reset reference
    pin: v.optional(v.string()),     // Worker's own PIN; never returned to frontend
    pinIsDefault: v.optional(v.boolean()), // true = worker has not yet changed their PIN
    isActive: v.boolean(),
    currentSessionId: v.optional(v.string()), // Unique single-device active session token
    lastSessionAt: v.optional(v.number()),    // Timestamp when session was last claimed/updated
    lastDeviceName: v.optional(v.string()),   // Device/Browser identifier
  }),

  // ── Projects ──────────────────────────────────────────────────
  projects: defineTable({
    name: v.string(),
    client: v.string(),
    location: v.string(),
    latitude: v.optional(v.float64()),
    longitude: v.optional(v.float64()),
    imageStorageId: v.optional(v.id("_storage")),
    isCompleted: v.boolean(),
  }),

  // ── Project ↔ Worker Assignment (many-to-many) ────────────────
  projectAssignments: defineTable({
    projectId: v.id("projects"),
    workerId: v.id("workers"),
  })
    .index("by_project", ["projectId"])
    .index("by_worker", ["workerId"])
    .index("by_project_and_worker", ["projectId", "workerId"]),

  // ── Daily Check-ins ───────────────────────────────────────────
  checkIns: defineTable({
    projectId: v.id("projects"),
    workerId: v.id("workers"),
    checkInTime: v.number(),
    checkOutTime: v.optional(v.number()),
    type: v.union(
      v.literal("Self"),
      v.literal("Proxy"),
      v.literal("Manual"),
      v.literal("Manual Override")
    ),
    status: v.union(
      v.literal("Verified"),
      v.literal("Pending Approval"),
      v.literal("On Site"),
      v.literal("Completed")
    ),
  })
    .index("by_project", ["projectId"])
    .index("by_worker", ["workerId"])
    .index("by_project_and_date", ["projectId", "checkInTime"]),

  // ── Blueprints / Drawings ─────────────────────────────────────
  blueprints: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    currentVersion: v.number(),
    pinnedAt: v.optional(v.number()),
    category: v.optional(v.string()), // e.g. "Electrical", "Plumbing", "HVAC", "Fire Protection", "Architectural", "Other"
    discipline: v.optional(v.string()),
    description: v.optional(v.string()),
  }).index("by_project", ["projectId"]),

  // ── Blueprint Revisions (version history — max 3 retained FIFO) ─
  blueprintRevisions: defineTable({
    blueprintId: v.id("blueprints"),
    version: v.number(),
    fileStorageId: v.id("_storage"),
    uploadedAt: v.number(),
    uploadedBy: v.optional(v.string()),
    uploadedByRole: v.optional(v.string()),
    workerId: v.optional(v.id("workers")),
    notes: v.optional(v.string()), // Revision comment explaining what is included/changed
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.string()),
  })
    .index("by_blueprint", ["blueprintId"])
    .index("by_blueprint_and_version", ["blueprintId", "version"]),

  // ── Notifications (Global & Worker) ──────────────────────────
  notifications: defineTable({
    title: v.string(),
    desc: v.string(),
    createdAt: v.number(),
    isRead: v.boolean(),
    recipientWorkerId: v.optional(v.id("workers")),
    role: v.optional(v.string()),
    type: v.optional(v.string()),
  }).index("by_created", ["createdAt"]),

  // ── Settings (Singleton) ──────────────────────────────────────
  settings: defineTable({
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
    holidays: v.array(v.object({
      name: v.string(),
      date: v.string(),
    })),
    enforceGps: v.boolean(),
    geofenceRadius: v.number(),
    silentAlert: v.string(),
    proxyReminder: v.string(),
    disputeResolution: v.string(),
    requirePhoto: v.boolean(),
    allowSelfClockIn: v.boolean(),
    requireReason: v.boolean(),
  }),

  // ── Invited Admins ────────────────────────────────────────────
  invitedAdmins: defineTable({
    email: v.string(),
    invitedAt: v.number(),
  }).index("by_email", ["email"]),

  // ── Requests for Information & Disputes ───────────────────────
  rfis: defineTable({
    type: v.union(v.literal("rfi"), v.literal("dispute")),
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
    status: v.union(
      v.literal("OPEN"),
      v.literal("IN PROGRESS"),
      v.literal("FLAGGED FOR ADMIN REVIEW"),
      v.literal("RESOLVED")
    ),
    priority: v.union(
      v.literal("High"),
      v.literal("Medium"),
      v.literal("Low")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
    rfiCode: v.string(),
  })
    .index("by_project", ["projectId"])
    .index("by_worker", ["workerId"])
    .index("by_type", ["type"])
    .index("by_created", ["createdAt"]),
});

