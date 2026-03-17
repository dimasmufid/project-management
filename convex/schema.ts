import { authTables } from "@convex-dev/auth/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  ...authTables,
  tenants: defineTable({
    name: v.string(),
    slug: v.string(),
    ownerUserId: v.id("users"),
    createdAt: v.number(),
    cycleLengthDays: v.optional(v.number()),
    issueCounter: v.optional(v.number()),
    issuePrefix: v.optional(v.string()),
  })
    .index("slug", ["slug"])
    .index("ownerUserId", ["ownerUserId"]),
  tenantMembers: defineTable({
    tenantId: v.id("tenants"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
    createdAt: v.number(),
  })
    .index("tenantId", ["tenantId"])
    .index("userId", ["userId"])
    .index("tenantIdAndUserId", ["tenantId", "userId"]),
  statuses: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    type: v.union(
      v.literal("backlog"),
      v.literal("unstarted"),
      v.literal("started"),
      v.literal("completed"),
      v.literal("canceled")
    ),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("tenantId", ["tenantId"])
    .index("tenantIdAndOrder", ["tenantId", "order"]),
  cycles: defineTable({
    tenantId: v.id("tenants"),
    number: v.number(),
    startsAt: v.number(),
    endsAt: v.number(),
    status: v.union(
      v.literal("upcoming"),
      v.literal("current"),
      v.literal("closed")
    ),
    createdAt: v.number(),
    closedAt: v.optional(v.number()),
  })
    .index("tenantId", ["tenantId"])
    .index("tenantIdAndStatus", ["tenantId", "status"])
    .index("tenantIdAndStartsAt", ["tenantId", "startsAt"]),
  projects: defineTable({
    tenantId: v.id("tenants"),
    name: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("planning"),
      v.literal("on_track"),
      v.literal("at_risk"),
      v.literal("completed"),
      v.literal("archived")
    ),
    startDate: v.number(),
    targetDate: v.number(),
    createdAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("tenantId", ["tenantId"])
    .index("tenantIdAndCreatedAt", ["tenantId", "createdAt"]),
  milestones: defineTable({
    tenantId: v.id("tenants"),
    projectId: v.id("projects"),
    name: v.string(),
    targetDate: v.number(),
    status: v.union(
      v.literal("upcoming"),
      v.literal("in_progress"),
      v.literal("done")
    ),
    createdAt: v.number(),
  })
    .index("tenantId", ["tenantId"])
    .index("projectId", ["projectId"])
    .index("tenantIdAndProjectId", ["tenantId", "projectId"]),
  issues: defineTable({
    tenantId: v.id("tenants"),
    identifier: v.string(),
    sequenceNumber: v.number(),
    title: v.string(),
    description: v.string(),
    statusId: v.id("statuses"),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    projectId: v.optional(v.id("projects")),
    milestoneId: v.optional(v.id("milestones")),
    cycleId: v.optional(v.id("cycles")),
    assigneeId: v.optional(v.id("users")),
    creatorId: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
    deletedAt: v.optional(v.number()),
    cycleHistory: v.array(
      v.object({
        fromCycleId: v.id("cycles"),
        toCycleId: v.id("cycles"),
        movedAt: v.number(),
      })
    ),
  })
    .index("tenantId", ["tenantId"])
    .index("tenantIdAndSequenceNumber", ["tenantId", "sequenceNumber"])
    .index("tenantIdAndUpdatedAt", ["tenantId", "updatedAt"])
    .index("tenantIdAndCycleId", ["tenantId", "cycleId"])
    .index("tenantIdAndProjectId", ["tenantId", "projectId"])
    .index("tenantIdAndStatusId", ["tenantId", "statusId"]),
  comments: defineTable({
    tenantId: v.id("tenants"),
    issueId: v.id("issues"),
    userId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("tenantId", ["tenantId"])
    .index("issueId", ["issueId"])
    .index("tenantIdAndIssueId", ["tenantId", "issueId"]),
})
