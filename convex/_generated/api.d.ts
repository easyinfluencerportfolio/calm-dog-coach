/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ViktorSpacesEmail from "../ViktorSpacesEmail.js";
import type * as auth from "../auth.js";
import type * as cleanup from "../cleanup.js";
import type * as coach from "../coach.js";
import type * as constants from "../constants.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as hub from "../hub.js";
import type * as planFiles from "../planFiles.js";
import type * as seedTestUser from "../seedTestUser.js";
import type * as testAuth from "../testAuth.js";
import type * as users from "../users.js";
import type * as viktorSpaceAuthConfig from "../viktorSpaceAuthConfig.js";
import type * as viktorSpaceAuthEnv from "../viktorSpaceAuthEnv.js";
import type * as viktorTools from "../viktorTools.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  ViktorSpacesEmail: typeof ViktorSpacesEmail;
  auth: typeof auth;
  cleanup: typeof cleanup;
  coach: typeof coach;
  constants: typeof constants;
  functions: typeof functions;
  http: typeof http;
  hub: typeof hub;
  planFiles: typeof planFiles;
  seedTestUser: typeof seedTestUser;
  testAuth: typeof testAuth;
  users: typeof users;
  viktorSpaceAuthConfig: typeof viktorSpaceAuthConfig;
  viktorSpaceAuthEnv: typeof viktorSpaceAuthEnv;
  viktorTools: typeof viktorTools;
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
