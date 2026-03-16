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
  userProfiles: defineTable({
    userId: v.id("users"),
    avatarBlobId: v.optional(v.string()),
    avatarPath: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("userId", ["userId"]),
})
