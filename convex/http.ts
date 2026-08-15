import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();
auth.addHttpRoutes(http);

/**
 * GHL webhook: fires when someone buys the Calm Dog Coach.
 * Body: { token, dogName, ownerName?, ownerEmail?, breed?, triggers?, baselineDistanceM?, externalId?, intakeAnswers? }
 * Returns the private coach link to store back on the contact.
 */
http.route({
  path: "/ghl/coach-signup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Accept values from the query string (GHL webhook actions are easiest to
    // configure that way) and fall back to the JSON body.
    const q = new URL(request.url).searchParams;
    let json: Record<string, unknown> = {};
    try {
      json = (await request.json()) as Record<string, unknown>;
    } catch {
      json = {};
    }
    const body: Record<string, unknown> = {
      secret: q.get("secret") ?? json.secret,
      active: q.get("active") ?? json.active,
      token: q.get("token") ?? json.token,
      ownerEmail: q.get("ownerEmail") ?? json.ownerEmail,
      scope: q.get("scope") ?? json.scope,
    };
    if (!body?.token || !body?.dogName) {
      return new Response(
        JSON.stringify({ error: "token and dogName required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    await ctx.runMutation(internal.coach.upsertDog, {
      token: String(body.token),
      dogName: String(body.dogName),
      ownerName: body.ownerName ? String(body.ownerName) : undefined,
      ownerEmail: body.ownerEmail ? String(body.ownerEmail) : undefined,
      breed: body.breed ? String(body.breed) : undefined,
      triggers: Array.isArray(body.triggers)
        ? body.triggers.map(String)
        : undefined,
      baselineDistanceM:
        body.baselineDistanceM != null
          ? Number(body.baselineDistanceM)
          : undefined,
      intakeAnswers: body.intakeAnswers,
      externalId: body.externalId ? String(body.externalId) : undefined,
    });
    return new Response(
      JSON.stringify({ ok: true, path: `/d/${body.token}` }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }),
});

/**
 * GHL webhook: fires when someone buys the unlimited plan hub (upsell 1).
 * Body: { token, ownerName?, ownerEmail?, externalId? }
 */
http.route({
  path: "/ghl/hub-signup",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Accept values from the query string (GHL webhook actions are easiest to
    // configure that way) and fall back to the JSON body.
    const q = new URL(request.url).searchParams;
    let json: Record<string, unknown> = {};
    try {
      json = (await request.json()) as Record<string, unknown>;
    } catch {
      json = {};
    }
    const body: Record<string, unknown> = {
      secret: q.get("secret") ?? json.secret,
      active: q.get("active") ?? json.active,
      token: q.get("token") ?? json.token,
      ownerEmail: q.get("ownerEmail") ?? json.ownerEmail,
      scope: q.get("scope") ?? json.scope,
    };
    if (!body?.token) {
      return new Response(JSON.stringify({ error: "token required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    await ctx.runMutation(internal.hub.upsertOwner, {
      token: String(body.token),
      ownerName: body.ownerName ? String(body.ownerName) : undefined,
      ownerEmail: body.ownerEmail ? String(body.ownerEmail) : undefined,
      externalId: body.externalId ? String(body.externalId) : undefined,
    });
    return new Response(
      JSON.stringify({ ok: true, path: `/plan/${body.token}` }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }),
});

/**
 * GHL webhook: subscription cancelled or restarted.
 * Body: { secret, active, token? , ownerEmail? , scope? } scope = "coach" | "hub" | "both".
 * Send it on the GHL side from a Payment/Subscription workflow.
 */
http.route({
  path: "/ghl/access",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Accept values from the query string (GHL webhook actions are easiest to
    // configure that way) and fall back to the JSON body.
    const q = new URL(request.url).searchParams;
    let json: Record<string, unknown> = {};
    try {
      json = (await request.json()) as Record<string, unknown>;
    } catch {
      json = {};
    }
    const body: Record<string, unknown> = {
      secret: q.get("secret") ?? json.secret,
      active: q.get("active") ?? json.active,
      token: q.get("token") ?? json.token,
      ownerEmail: q.get("ownerEmail") ?? json.ownerEmail,
      scope: q.get("scope") ?? json.scope,
    };
    const secret = (globalThis as { process?: { env: Record<string, string | undefined> } })
      .process?.env?.GHL_WEBHOOK_SECRET;
    if (secret && body?.secret !== secret) {
      return new Response(JSON.stringify({ error: "bad secret" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    // GHL webhooks send everything as strings, so accept "false"/"true" too.
    const rawActive = body?.active;
    const activeFlag =
      typeof rawActive === "boolean"
        ? rawActive
        : typeof rawActive === "string"
          ? ["true", "1", "yes"].includes(rawActive.trim().toLowerCase())
            ? true
            : ["false", "0", "no"].includes(rawActive.trim().toLowerCase())
              ? false
              : undefined
          : undefined;
    if (typeof activeFlag !== "boolean" || (!body?.token && !body?.ownerEmail)) {
      return new Response(
        JSON.stringify({ error: "active plus token or ownerEmail required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    const scope = body.scope ?? "both";
    const args = {
      token: body.token ? String(body.token) : undefined,
      ownerEmail: body.ownerEmail ? String(body.ownerEmail) : undefined,
      active: activeFlag,
    };
    let coach = 0;
    let hub = 0;
    if (scope === "coach" || scope === "both") {
      coach = await ctx.runMutation(internal.coach.setAccess, args);
    }
    if (scope === "hub" || scope === "both") {
      hub = await ctx.runMutation(internal.hub.setAccess, args);
    }
    return new Response(JSON.stringify({ ok: true, coach, hub }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
