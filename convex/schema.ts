import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  dogs: defineTable({
    token: v.string(),
    dogName: v.string(),
    ownerName: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    breed: v.optional(v.string()),
    triggers: v.optional(v.array(v.string())),
    baselineDistanceM: v.optional(v.number()),
    intakeAnswers: v.optional(v.any()),
    externalId: v.optional(v.string()),
    active: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  walks: defineTable({
    dogId: v.id("dogs"),
    walkedAt: v.number(),
    reactions: v.number(),
    closestDistanceM: v.number(),
    trigger: v.string(),
    recoverySeconds: v.number(),
    handlerCalm: v.number(),
    notes: v.optional(v.string()),
  }).index("by_dog", ["dogId", "walkedAt"]),

  owners: defineTable({
    token: v.string(),
    ownerName: v.optional(v.string()),
    ownerEmail: v.optional(v.string()),
    externalId: v.optional(v.string()),
    active: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_token", ["token"]),

  plans: defineTable({
    ownerId: v.id("owners"),
    dogName: v.string(),
    behaviour: v.string(),
    ageBand: v.string(),
    where: v.optional(v.string()),
    home: v.optional(v.array(v.string())),
    severity: v.optional(v.number()),
    ownTrigger: v.optional(v.string()),
    mode: v.string(),
    pdfUrl: v.optional(v.string()),
    body: v.optional(v.string()),
    status: v.string(),
    createdAt: v.number(),
  }).index("by_owner", ["ownerId", "createdAt"]),

  debriefs: defineTable({
    dogId: v.id("dogs"),
    walkId: v.optional(v.id("walks")),
    kind: v.string(),
    status: v.string(),
    body: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_dog", ["dogId", "createdAt"]),
});

export default schema;
