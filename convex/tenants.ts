import { getAuthUserId } from "@convex-dev/auth/server"
import { v } from "convex/values"

import type { MutationCtx, QueryCtx } from "./_generated/server"
import { mutation, query } from "./_generated/server"
import { fs } from "./fs"

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {}

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

function buildAvatarUrl(blobId?: string, path?: string) {
  if (!blobId || !path) {
    return null
  }

  const siteUrl = env.CONVEX_SITE_URL ?? env.VITE_CONVEX_SITE_URL ?? ""

  if (!siteUrl) {
    return null
  }

  return `${siteUrl}/fs/blobs/${blobId}?path=${encodeURIComponent(path)}`
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
  const userProfile = await ctx.db
    .query("userProfiles")
    .withIndex("userId", (q) => q.eq("userId", userId))
    .unique()

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

  return {
    tenantId: tenant._id,
    name: tenant.name,
    slug: tenant.slug,
    role: membership.role,
    avatarUrl: buildAvatarUrl(
      userProfile?.avatarBlobId,
      userProfile?.avatarPath
    ),
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
    avatarBlobId: v.optional(v.string()),
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

    if (args.avatarBlobId) {
      const avatarPath = `/users/${userId}/avatar`

      await fs.commitFiles(ctx, [
        { path: avatarPath, blobId: args.avatarBlobId },
      ])

      const existingProfile = await ctx.db
        .query("userProfiles")
        .withIndex("userId", (q) => q.eq("userId", userId))
        .unique()

      const timestamp = Date.now()

      if (existingProfile) {
        await ctx.db.patch(existingProfile._id, {
          avatarBlobId: args.avatarBlobId,
          avatarPath,
          updatedAt: timestamp,
        })
      } else {
        await ctx.db.insert("userProfiles", {
          userId,
          avatarBlobId: args.avatarBlobId,
          avatarPath,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      }

      return {
        ...tenant,
        avatarUrl: buildAvatarUrl(args.avatarBlobId, avatarPath),
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

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("userId", (q) => q.eq("userId", userId))
      .unique()

    return {
      tenantId: tenant._id,
      name: tenant.name,
      slug: tenant.slug,
      role: membership.role,
      avatarUrl: buildAvatarUrl(
        userProfile?.avatarBlobId,
        userProfile?.avatarPath
      ),
    }
  },
})
