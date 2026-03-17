import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"

import type { MutationCtx, QueryCtx } from "./_generated/server"
import { mutation, query } from "./_generated/server"

function toTeamName(name: string | undefined) {
  const trimmed = name?.trim()

  if (!trimmed) {
    return "My Team"
  }

  return `${trimmed}'s Team`
}

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "team"
}

async function createUniqueTenantSlug(ctx: MutationCtx, baseName: string) {
  const baseSlug = slugify(baseName)
  let candidate = baseSlug
  let suffix = 2

  while (
    await ctx.db
      .query("tenants")
      .withIndex("slug", (q) => q.eq("slug", candidate))
      .unique()
  ) {
    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return candidate
}

async function getFirstTenantForUser(
  ctx: QueryCtx | MutationCtx,
  userId: NonNullable<Awaited<ReturnType<typeof getAuthUserId>>>
) {
  const membership = await ctx.db
    .query("tenantMembers")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .first()

  if (!membership) {
    return null
  }

  const tenant = await ctx.db.get(membership.tenantId)

  if (!tenant) {
    return null
  }

  const user = await ctx.db.get(userId)

  return {
    tenantId: tenant._id,
    name: tenant.name,
    slug: tenant.slug,
    role: membership.role,
    avatarUrl: user?.image ?? null,
  }
}

export const getCurrentUserTenant = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      return null
    }

    return await getFirstTenantForUser(ctx, userId)
  },
})

export const ensureCurrentUserTenant = mutation({
  args: {
    preferredName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      throw new Error("Not authenticated.")
    }

    const user = await ctx.db.get(userId)
    let tenant = await getFirstTenantForUser(ctx, userId)

    if (!tenant) {
      const teamName = toTeamName(args.preferredName ?? user?.name)
      const slug = await createUniqueTenantSlug(ctx, teamName)
      const createdAt = Date.now()
      const tenantId = await ctx.db.insert("tenants", {
        name: teamName,
        slug,
        ownerUserId: userId,
        createdAt,
      })

      await ctx.db.insert("tenantMembers", {
        tenantId,
        userId,
        role: "owner",
        createdAt,
      })

      tenant = {
        tenantId,
        name: teamName,
        slug,
        role: "owner" as const,
        avatarUrl: null,
      }
    }

    return tenant
  },
})

export const getTenantBySlugForCurrentUser = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)

    if (!userId) {
      return null
    }

    const tenant = await ctx.db
      .query("tenants")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .unique()

    if (!tenant) {
      return null
    }

    const membership = await ctx.db
      .query("tenantMembers")
      .withIndex("tenantIdAndUserId", (q) =>
        q.eq("tenantId", tenant._id).eq("userId", userId)
      )
      .first()

    if (!membership) {
      return null
    }
    const user = await ctx.db.get(userId)

    return {
      tenantId: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      role: membership.role,
      avatarUrl: user?.image ?? null,
    }
  },
})
