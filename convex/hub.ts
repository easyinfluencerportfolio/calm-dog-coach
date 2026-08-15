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
import { BEHAVIOURS, PLAN_FILES } from "./planFiles";

declare const process: { env: Record<string, string | undefined> };

/** Everything the hub page needs, keyed by the owner's unguessable link token. */
export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const owner = await ctx.db
      .query("owners")
      .withIndex("by_token", q => q.eq("token", token))
      .unique();
    if (!owner) return null;
    const plans = await ctx.db
      .query("plans")
      .withIndex("by_owner", q => q.eq("ownerId", owner._id))
      .order("desc")
      .take(200);
    return { owner, plans };
  },
});

export const getPlan = query({
  args: { token: v.string(), planId: v.id("plans") },
  handler: async (ctx, { token, planId }) => {
    const owner = await ctx.db
      .query("owners")
      .withIndex("by_token", q => q.eq("token", token))
      .unique();
    if (!owner) return null;
    const plan = await ctx.db.get(planId);
    if (!plan || plan.ownerId !== owner._id) return null;
    return plan;
  },
});

const planArgs = {
  token: v.string(),
  dogName: v.string(),
  behaviour: v.string(),
  ageBand: v.string(),
  where: v.optional(v.string()),
  home: v.optional(v.array(v.string())),
  severity: v.optional(v.number()),
  ownTrigger: v.optional(v.string()),
};

/**
 * Gear one: the case maps to one of the eight tracks and there is no custom
 * trigger, so we hand back the pre-rendered file. Instant, no AI, no cost.
 */
export const createMatchedPlan = mutation({
  args: planArgs,
  handler: async (ctx, a) => {
    const owner = await ctx.db
      .query("owners")
      .withIndex("by_token", q => q.eq("token", a.token))
      .unique();
    if (!owner) throw new Error("Unknown link");
    const key = `${a.behaviour}-${a.ageBand}`;
    const pdfUrl = PLAN_FILES[key];
    if (!pdfUrl) throw new Error(`No rendered plan for ${key}`);
    const { token: _t, ...rest } = a;
    return await ctx.db.insert("plans", {
      ...rest,
      ownerId: owner._id,
      mode: "matched",
      pdfUrl,
      status: "done",
      createdAt: Date.now(),
    });
  },
});

export const ownerContext = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    return await ctx.db
      .query("owners")
      .withIndex("by_token", q => q.eq("token", token))
      .unique();
  },
});

export const createPlaceholder = internalMutation({
  args: { ...planArgs, ownerId: v.id("owners") },
  handler: async (ctx, a) => {
    const { token: _t, ownerId, ...rest } = a;
    return await ctx.db.insert("plans", {
      ...rest,
      ownerId,
      mode: "composed",
      status: "working",
      createdAt: Date.now(),
    });
  },
});

export const finishPlan = internalMutation({
  args: { id: v.id("plans"), body: v.string(), status: v.string() },
  handler: async (ctx, { id, body, status }) => {
    await ctx.db.patch(id, { body, status });
  },
});

function label(code: string) {
  return BEHAVIOURS.find(b => b.code === code)?.label ?? code;
}

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

/**
 * Gear two: the case does not map to a rendered file (custom trigger, or
 * "something else"), so the plan is written against the same 11-section
 * skeleton and the same evidence base the 24 files were built on.
 */
export const composePlan = action({
  args: planArgs,
  returns: v.id("plans"),
  handler: async (ctx, a) => {
    const owner: Doc<"owners"> | null = await ctx.runQuery(
      internal.hub.ownerContext,
      { token: a.token },
    );
    if (!owner) throw new Error("Unknown link");
    const planId: Id<"plans"> = await ctx.runMutation(
      internal.hub.createPlaceholder,
      { ...a, ownerId: owner._id },
    );

    const ageText =
      a.ageBand === "A1"
        ? "under 12 months"
        : a.ageBand === "A3"
          ? "8 years or older"
          : "between 1 and 7 years";

    const prompt = `You are a calm, experienced dog behaviourist writing a complete 14-day plan for one specific dog. British English. Write directly to the owner, second person, no preamble, no sign-off, no marketing.

THE DOG
Name: ${a.dogName}
Age: ${ageText}
Problem the owner selected: ${label(a.behaviour)}
${a.ownTrigger ? `What actually sets the dog off, in the owner's own words: "${a.ownTrigger}"` : ""}
${a.where ? `Where it happens most: ${a.where}` : ""}
${a.home?.length ? `Home setup: ${a.home.join("; ")}` : ""}
${a.severity ? `Owner rates severity ${a.severity} out of 5` : ""}

NON-NEGOTIABLE STRUCTURE - use these eleven markdown H2 headings in this order, and nothing else at H2:
## What is actually happening
## Why what you have already tried did not work
## Your setup, 10 minutes, nothing to buy
## Days 1 to 3: the measurement
## Days 4 to 7: working the distance
## Days 8 to 11: closing the gap
## Days 12 to 14: the real walk
## When it goes wrong: the four step protocol
## Your 14 day tracker
## What good looks like
## When to call a professional

VOICE (non-negotiable)
Write like a calm, experienced behaviourist talking to one worried owner across a table. Confident, casual, never salesy, never chirpy. British English spelling throughout, including behaviour, colour, practise, metres, neighbour. Never American spellings. Contractions, second person.
BANNED, these mark text as machine-written:
- The em dash character. Never use it. Use a comma, a full stop or brackets.
- "It is not X, it is Y" and every contrastive reversal of that shape.
- Rhetorical questions you then answer yourself.
- Hedging openers: "it is important to note", "it is worth remembering", "keep in mind".
- Summary bows: "at the end of the day", "the bottom line", "in conclusion", "remember:".
- Transitions: moreover, furthermore, additionally, ultimately, that said.
- These words: delve, journey, unlock, harness, elevate, robust, seamless, crucial, pivotal, comprehensive, holistic, meticulous, underscore, leverage, realm, landscape, tapestry, testament, navigate, embark, foster, myriad, transformative, ensure, utilise.
- Exclamation marks.
- Sentences that sound profound but say nothing.
REQUIRED: vary sentence length deliberately, short next to long. Say hard things plainly.

FORMATTING (the owner reads this on a phone, so a wall of text is a failed plan)
- Write in real paragraphs of 2 or 3 sentences. Put the whole paragraph on ONE line and separate paragraphs with a blank line. Do not put every sentence on its own line, that reads as a machine stuttering.
- No paragraph longer than 3 sentences or 45 words.
- Vary sentence length inside each paragraph. A short sentence next to a long one. If every sentence is the same length the writing sounds robotic, and lots of short sentences in a row is just as robotic as lots of long ones.
- Inside each H2 section, use 2 or 3 markdown H3 sub-headings (###) to break the section up. Write them as plain statements, not labels. Never more than 3 per section.
- Use bullet lists for anything that is genuinely a list. Use prose for anything that is genuinely an argument.
- Give each H2 section at most ONE callout, written on its own line starting with "> ", placed at the END of that section as the line worth remembering. Sections 9 to 11 get no callout. Never put a callout directly under a heading.
- Bold the numbers and the distances so they can be found by eye.

RULES
- Build the whole plan around distance and threshold: find the distance at which ${a.dogName} notices but can still eat, work there, close it gradually. Never advise flooding, never advise correction, never advise punishment.
- Every distance in metres first, then feet in brackets, e.g. "12 m (40 ft)".
- Every day in the day sections is one concrete instruction under 20 words. Dated days, not vague advice.
- "Why what you have already tried did not work" must name the specific things this owner has most likely tried for THIS trigger and explain mechanically why they failed. This is the most important section.
${a.ageBand === "A3" ? "- The dog is 8 or over, so the plan must open by telling them a new or worsening behaviour at this age is a medical question first: rule out pain, hearing and sight with a vet before training.\n" : ""}${a.ageBand === "A1" ? "- The dog is under 12 months, so keep sessions to 3 to 5 minutes and set expectations around developmental fear periods.\n" : ""}- The tracker section is a simple markdown table with columns: Day, Distance worked, Reactions, Recovery time, Note.
- 1,400 to 1,900 words total.`;

    try {
      const result = await callTool<{ result?: { plan?: string } }>(
        "ai_structured_output",
        {
          prompt,
          intelligence_level: "smart",
          output_schema: {
            type: "object",
            properties: { plan: { type: "string" } },
            required: ["plan"],
            additionalProperties: false,
          },
        },
      );
      const body = result.result?.plan ?? "";
      await ctx.runMutation(internal.hub.finishPlan, {
        id: planId,
        body,
        status: body ? "done" : "failed",
      });
    } catch (e) {
      await ctx.runMutation(internal.hub.finishPlan, {
        id: planId,
        body: `Could not write this plan: ${String(e)}. Try again in a moment.`,
        status: "failed",
      });
    }
    return planId;
  },
});

/** Called by the GHL webhook when someone buys the unlimited plan hub. */
export const upsertOwner = internalMutation({
  args: {
    token: v.string(),
    ownerName: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    externalId: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    const existing = await ctx.db
      .query("owners")
      .withIndex("by_token", q => q.eq("token", a.token))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, a);
      return existing._id;
    }
    return await ctx.db.insert("owners", { ...a, createdAt: Date.now() });
  },
});

export const seedHubDemo = mutation({
  args: {},
  handler: async ctx => {
    const token = "demo-hub";
    const existing = await ctx.db
      .query("owners")
      .withIndex("by_token", q => q.eq("token", token))
      .unique();
    if (existing) return token;
    const ownerId = await ctx.db.insert("owners", {
      token,
      ownerName: "Sam",
      ownerEmail: "sam@example.com",
      createdAt: Date.now(),
    });
    await ctx.db.insert("plans", {
      ownerId,
      dogName: "Milo",
      behaviour: "B1",
      ageBand: "A2",
      mode: "matched",
      pdfUrl: PLAN_FILES["B1-A2"],
      status: "done",
      createdAt: Date.now() - 86400000 * 6,
    });
    return token;
  },
});

/** Same subscription gate for the Plan Room side. */
export const setAccess = internalMutation({
  args: {
    token: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    active: v.boolean(),
  },
  handler: async (ctx, a) => {
    let matched = 0;
    if (a.token) {
      const owner = await ctx.db
        .query("owners")
        .withIndex("by_token", q => q.eq("token", a.token as string))
        .unique();
      if (owner) {
        await ctx.db.patch(owner._id, { active: a.active });
        matched++;
      }
    } else if (a.ownerEmail) {
      const email = a.ownerEmail.trim().toLowerCase();
      const all = await ctx.db.query("owners").collect();
      for (const owner of all) {
        if ((owner.ownerEmail ?? "").trim().toLowerCase() === email) {
          await ctx.db.patch(owner._id, { active: a.active });
          matched++;
        }
      }
    }
    return matched;
  },
});
