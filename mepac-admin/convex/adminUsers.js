import { query, mutation, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ── Auth helper ─────────────────────────────────────────────────

/**
 * Throws "Unauthorized" if the caller has no valid admin session.
 * Returns the user object if authenticated.
 */
async function requireAdminAuth(ctx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Unauthorized");
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Unauthorized");
  return user;
}

// ── Queries ─────────────────────────────────────────────────────

/**
 * Get the currently authenticated admin user.
 */
export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

/**
 * List all invited (pending) admin emails.
 * Admin-protected.
 */
export const listInvited = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx);
    return await ctx.db.query("invitedAdmins").collect();
  },
});

/**
 * List all active admin user accounts from Convex Auth.
 * Admin-protected.
 */
export const listAdmins = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminAuth(ctx);
    const users = await ctx.db.query("users").collect();
    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      emailVerificationTime: u.emailVerificationTime,
      _creationTime: u._creationTime,
    }));
  },
});

/**
 * Public query: check if an email has been invited and has no account yet.
 * Used by the LoginPage to show the "Set your password" form.
 */
export const checkEmailStatus = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const cleanEmail = email.toLowerCase().trim();

    const users = await ctx.db.query("users").collect();
    const existingUser = users.find(
      (u) => u.email && u.email.toLowerCase() === cleanEmail
    );

    if (existingUser) {
      return { status: "has_account" };
    }

    const invite = await ctx.db
      .query("invitedAdmins")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();

    if (invite) {
      return { status: "invited" };
    }

    if (users.length === 0) {
      return { status: "invited" };
    }

    return { status: "not_found" };
  },
});

export const checkIsInvited = query({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const cleanEmail = email.toLowerCase().trim();

    const users = await ctx.db.query("users").collect();
    const hasAccount = users.some(
      (u) => u.email && u.email.toLowerCase() === cleanEmail
    );
    if (hasAccount) return false;

    if (users.length === 0) {
      return true;
    }

    const invite = await ctx.db
      .query("invitedAdmins")
      .withIndex("by_email", (q) => q.eq("email", cleanEmail))
      .first();
    return !!invite;
  },
});

export const seedInitialAdmin = mutation({
  args: { email: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const email = (args.email || "admin@riverrtech.com").toLowerCase().trim();
    const existing = await ctx.db
      .query("invitedAdmins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!existing) {
      await ctx.db.insert("invitedAdmins", {
        email,
        invitedAt: Date.now(),
      });
    }
    return { success: true, email };
  },
});

// ── Mutations ───────────────────────────────────────────────────

/**
 * Invite a new admin by email. Admin-protected.
 * This does NOT create a Convex Auth account — the invited person
 * sets their own password on their first visit to the login page.
 */
export const invite = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const user = await requireAdminAuth(ctx);
    if (user.email !== "admin@riverrtech.com") {
      throw new Error("Only the Owner can invite new administrators.");
    }

    // Prevent duplicate invites
    const existing = await ctx.db
      .query("invitedAdmins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (existing) throw new ConvexError("This email has already been invited.");

    // Prevent inviting already existing admins
    const users = await ctx.db.query("users").collect();
    const isAlreadyAdmin = users.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (isAlreadyAdmin) throw new ConvexError("An administrator with this email already exists.");

    await ctx.db.insert("invitedAdmins", {
      email: email.toLowerCase().trim(),
      invitedAt: Date.now(),
    });
  },
});

/**
 * Revoke a pending invite. Admin-protected.
 */
export const revokeInvite = mutation({
  args: { inviteId: v.id("invitedAdmins") },
  handler: async (ctx, { inviteId }) => {
    const user = await requireAdminAuth(ctx);
    if (user.email !== "admin@riverrtech.com") {
      throw new Error("Only the Owner can revoke invites.");
    }
    await ctx.db.delete(inviteId);
  },
});

/**
 * Remove an active admin account. Admin-protected.
 * Note: This removes the user record from Convex Auth.
 */
export const removeAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const caller = await requireAdminAuth(ctx);
    if (caller.email !== "admin@riverrtech.com") {
      throw new Error("Only the Owner can remove administrators.");
    }

    // Prevent self-deletion
    if (caller._id === userId) throw new Error("You cannot remove your own account.");

    // Prevent deletion of the owner
    const targetUser = await ctx.db.get(userId);
    if (targetUser && targetUser.email === "admin@riverrtech.com") {
        throw new Error("The Owner account cannot be removed.");
    }

    // Delete associated auth accounts and sessions
    const authAccounts = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
      .collect();
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .collect();
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(userId);
  },
});

/**
 * Consume (delete) an invite after successful account creation.
 * Called from the frontend immediately after a new user signs in.
 */
export const consumeInvite = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const invite = await ctx.db
      .query("invitedAdmins")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
      
    if (invite) {
      await ctx.db.delete(invite._id);
    }
  },
});
