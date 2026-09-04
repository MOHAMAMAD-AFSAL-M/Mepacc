/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminUsers from "../adminUsers.js";
import type * as assignments from "../assignments.js";
import type * as auth from "../auth.js";
import type * as blueprints from "../blueprints.js";
import type * as checkIns from "../checkIns.js";
import type * as http from "../http.js";
import type * as notifications from "../notifications.js";
import type * as projects from "../projects.js";
import type * as rfis from "../rfis.js";
import type * as settings from "../settings.js";
import type * as workers from "../workers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminUsers: typeof adminUsers;
  assignments: typeof assignments;
  auth: typeof auth;
  blueprints: typeof blueprints;
  checkIns: typeof checkIns;
  http: typeof http;
  notifications: typeof notifications;
  projects: typeof projects;
  rfis: typeof rfis;
  settings: typeof settings;
  workers: typeof workers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
