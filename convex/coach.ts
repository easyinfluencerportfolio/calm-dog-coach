import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";

declare const process: { env: Record<string, string | undefined> };

/** Public read of one dog's whole dashboard, keyed by the unguessable link token. */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const dog = await ctx.db
      .query("dogs")
      .withIndex("by_token", q => q.eq("token", token))
      .unique();
    if (!dog) return null;
    const walks = await ctx.db
      .query("walks")
      .withIndex("by_dog", q => q.eq("dogId", dog._id))
      .order("desc")
      .take(120);
    const debriefs = await ctx.db
      .query("debriefs")
      .withIndex("by_dog", q => q.eq("dogId", dog._id))
      .order("desc")
      .take(20);
    return { dog, walks, debriefs };
  },
});

export const logWalk = mutation({
  args: {
    token: v.string(),
    reactions: v.number(),
    closestDistanceM: v.number(),
    trigger: v.string(),
    recoverySeconds: v.number(),
    handlerCalm: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dog = await ctx.db
      .query("dogs")
      .withIndex("by_token", q => q.eq("token", args.token))
      .unique();
    if (!dog) throw new Error("Unknown link");
    const walkId = await ctx.db.insert("walks", {
      dogId: dog._id,
      walkedAt: Date.now(),
      reactions: args.reactions,
      closestDistanceM: args.closestDistanceM,
      trigger: args.trigger,
      recoverySeconds: args.recoverySeconds,
      handlerCalm: args.handlerCalm,
      notes: args.notes,
    });
    return walkId;
  },
});

export const createDebriefPlaceholder = internalMutation({
  args: {
    dogId: v.id("dogs"),
    walkId: v.optional(v.id("walks")),
    kind: v.string(),
  },
  handler: async (ctx, a) =>
    await ctx.db.insert("debriefs", {
      ...a,
      status: "working",
      createdAt: Date.now(),
    }),
});

export const finishDebrief = internalMutation({
  args: { id: v.id("debriefs"), body: v.string(), status: v.string() },
  handler: async (ctx, { id, body, status }) => {
    await ctx.db.patch(id, { body, status });
  },
});

export const dogContext = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const dog = await ctx.db
      .query("dogs")
      .withIndex("by_token", q => q.eq("token", token))
      .unique();
    if (!dog) return null;
    const walks = await ctx.db
      .query("walks")
      .withIndex("by_dog", q => q.eq("dogId", dog._id))
      .order("desc")
      .take(14);
    return { dog, walks };
  },
});

async function callTool<T>(
  role: string,
  args: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(
    `${process.env.VIKTOR_SPACES_API_URL}/api/viktor-spaces/tools/call`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: process.env.VIKTOR_SPACES_PROJECT_NAME,
        project_secret: process.env.VIKTOR_SPACES_PROJECT_SECRET,
        role,
        arguments: args,
      }),
    },
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Tool call failed");
  return json.result as T;
}

function walkLines(walks: Doc<"walks">[]) {
  return walks
    .map(
      w =>
        `${new Date(w.walkedAt).toISOString().slice(0, 10)} — trigger: ${w.trigger}, reactions: ${w.reactions}, closest distance: ${w.closestDistanceM}m (${Math.round(w.closestDistanceM * 3.28084)}ft), recovery: ${w.recoverySeconds}s, handler calm: ${w.handlerCalm}/5${w.notes ? `, note: ${w.notes}` : ""}`,
    )
    .join("\n");
}

/** Bad-day debrief: diagnoses the last walk and rewrites the next 7 days. */
export const requestDebrief = action({
  args: { token: v.string(), kind: v.optional(v.string()) },
  returns: v.id("debriefs"),
  handler: async (ctx, { token, kind }) => {
    const context: { dog: Doc<"dogs">; walks: Doc<"walks">[] } | null =
      await ctx.runQuery(internal.coach.dogContext, { token });
    if (!context) throw new Error("Unknown link");
    const { dog, walks } = context;
    const isMonthly = kind === "monthly";
    const debriefId: Id<"debriefs"> = await ctx.runMutation(
      internal.coach.createDebriefPlaceholder,
      {
        dogId: dog._id,
        walkId: walks[0]?._id,
        kind: isMonthly ? "monthly" : "walk",
      },
    );

    const prompt = `You are a calm, experienced reactive-dog trainer writing directly to the owner of ${dog.dogName}${dog.breed ? ` (${dog.breed})` : ""}.
Known triggers: ${(dog.triggers ?? []).join(", ") || "not stated"}.
Baseline safe distance at intake: ${dog.baselineDistanceM ?? "unknown"}m.\nUnits: whenever you state a distance, give metres first then feet in brackets, e.g. "12 m (40 ft)". The reader may be American.

Their logged walks, newest first:
${walkLines(walks) || "No walks logged yet."}

Write ${isMonthly ? "a monthly progress report" : "a debrief of the most recent walk"} in British English, plain text with short markdown headings, no preamble, under 400 words:
${
  isMonthly
    ? `1. What actually changed this month, using their own numbers (safe distance, reactions per week, longest calm streak). Name the trend honestly, including if it is flat.
2. The one pattern in the data most worth acting on.
3. The focus for next month in one sentence.`
    : `1. What most likely happened, in one short paragraph, no blame on the owner.
2. The threshold read: the distance they should work at this week, derived from their logged closest distances.
3. A rewritten 7-day walk card: one line per day, each a concrete instruction of under 15 words.
4. One sentence of perspective on non-linear progress.`
}`;

    try {
      const result = await callTool<{
        result?: { debrief?: string };
        error?: string;
      }>("ai_structured_output", {
        prompt,
        intelligence_level: "smart",
        output_schema: {
          type: "object",
          properties: { debrief: { type: "string" } },
          required: ["debrief"],
          additionalProperties: false,
        },
      });
      const body = result.result?.debrief ?? "";
      await ctx.runMutation(internal.coach.finishDebrief, {
        id: debriefId,
        body,
        status: body ? "done" : "failed",
      });
    } catch (e) {
      await ctx.runMutation(internal.coach.finishDebrief, {
        id: debriefId,
        body: `Could not generate this debrief: ${String(e)}`,
        status: "failed",
      });
    }
    return debriefId;
  },
});

/** Called by the GHL webhook when someone buys the Coach. */
export const upsertDog = internalMutation({
  args: {
    token: v.string(),
    dogName: v.string(),
    ownerName: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    breed: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
    baselineDistanceM: v.optional(v.number()),
    intakeAnswers: v.optional(v.any()),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("dogs")
      .withIndex("by_token", q => q.eq("token", a.token))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, a);
      return existing._id;
    }
    return await ctx.db.insert("dogs", { ...a, createdAt: Date.now() });
  },
});

export const seedDemo = mutation({
  args: {},
  handler: async ctx => {
    const token = "demo-milo";
    const existing = await ctx.db
      .query("dogs")
      .withIndex("by_token", q => q.eq("token", token))
      .unique();
    let dogId: Id<"dogs">;
    if (existing) {
      dogId = existing._id;
    } else {
      dogId = await ctx.db.insert("dogs", {
        token,
        dogName: "Milo",
        ownerName: "Sam",
        breed: "Collie cross",
        triggers: ["other dogs on lead", "cyclists"],
        baselineDistanceM: 25,
        createdAt: Date.now(),
      });
    }
    const already = await ctx.db
      .query("walks")
      .withIndex("by_dog", q => q.eq("dogId", dogId))
      .first();
    if (!already) {
      const day = 86400000;
      const rows = [
        [13, 3, 25, "other dogs on lead", 240, 2],
        [11, 2, 22, "other dogs on lead", 180, 3],
        [9, 3, 20, "cyclists", 200, 2],
        [7, 1, 16, "other dogs on lead", 90, 4],
        [5, 2, 15, "other dogs on lead", 120, 3],
        [3, 0, 12, "other dogs on lead", 0, 5],
        [1, 1, 10, "cyclists", 60, 4],
      ] as const;
      for (const [ago, reactions, dist, trigger, recovery, calm] of rows) {
        await ctx.db.insert("walks", {
          dogId,
          walkedAt: Date.now() - ago * day,
          reactions,
          closestDistanceM: dist,
          trigger,
          recoverySeconds: recovery,
          handlerCalm: calm,
        });
      }
    }
    return token;
  },
});

/**
 * Subscription gate. GHL calls this when a Calm Dog Coach subscription is
 * cancelled or comes back to life. Matches on the link token when we have it,
 * otherwise on the owner's email address.
 */
export const setAccess = internalMutation({
  args: {
    token: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, a) => {
    let matched = 0;
    if (a.token) {
      const dog = await ctx.db
        .query("dogs")
        .withIndex("by_token", q => q.eq("token", a.token as string))
        .unique();
      if (dog) {
        await ctx.db.patch(dog._id, { active: a.active });
        matched++;
      }
    } else if (a.ownerEmail) {
      const email = a.ownerEmail.trim().toLowerCase();
      const all = await ctx.db.query("dogs").collect();
      for (const dog of all) {
        if ((dog.ownerEmail ?? "").trim().toLowerCase() === email) {
          await ctx.db.patch(dog._id, { active: a.active });
          matched++;
        }
      }
    }
    return matched;
  },
});
