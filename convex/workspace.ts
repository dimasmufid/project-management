import { getAuthUserId } from "@convex-dev/auth/server"
import { addWeeks, startOfWeek } from "date-fns"
import { v } from "convex/values"

import type { Doc, Id, TableNames } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"
import { mutation, query } from "./_generated/server"
import {
  buildIssuePrefix,
  ensureWorkspaceBootstrap as ensureTenantWorkspaceBootstrap,
  getWorkspaceBootstrapState,
} from "./workspaceBootstrap"

function toIso(value?: number | null) {
  if (value === undefined || value === null) {
    return null
  }

  return new Date(value).toISOString()
}

function parseDateInput(value: string, label: string) {
  const parsed = Date.parse(value)

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ${label}.`)
  }

  return parsed
}

function getInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "Member"
  const parts = source.split(/\s+/).filter(Boolean)

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

async function requireTenantAccess(
  ctx: QueryCtx | MutationCtx,
  tenantSlug: string
) {
  const userId = await getAuthUserId(ctx)

  if (!userId) {
    throw new Error("Not authenticated.")
  }

  const tenant = await ctx.db
    .query("tenants")
    .withIndex("slug", (q) => q.eq("slug", tenantSlug))
    .unique()

  if (!tenant) {
    throw new Error("Workspace not found.")
  }

  const membership = await ctx.db
    .query("tenantMembers")
    .withIndex("tenantIdAndUserId", (q) =>
      q.eq("tenantId", tenant._id).eq("userId", userId)
    )
    .unique()

  if (!membership) {
    throw new Error("You do not have access to this workspace.")
  }

  return { tenant, userId, membership }
}

async function ensureTenantMember(
  ctx: MutationCtx,
  tenantId: Id<"tenants">,
  userId: Id<"users"> | null | undefined,
  fieldName: string
) {
  if (!userId) {
    return undefined
  }

  const membership = await ctx.db
    .query("tenantMembers")
    .withIndex("tenantIdAndUserId", (q) =>
      q.eq("tenantId", tenantId).eq("userId", userId)
    )
    .unique()

  if (!membership) {
    throw new Error(`${fieldName} must belong to this workspace.`)
  }

  return userId
}

async function ensureTenantDoc<
  TableName extends "projects" | "milestones" | "statuses" | "cycles" | "issues"
>(
  ctx: MutationCtx,
  _table: TableName,
  tenantId: Id<"tenants">,
  id: Id<TableName> | null | undefined,
  fieldName: string
) {
  if (!id) {
    return undefined
  }

  const doc = await ctx.db.get(id)

  if (!doc || doc.tenantId !== tenantId) {
    throw new Error(`${fieldName} is invalid for this workspace.`)
  }

  return doc
}

function serializeStatus(status: Doc<"statuses">) {
  return {
    id: status._id,
    name: status.name,
    type: status.type,
    order: status.order,
  }
}

function serializeProject(project: Doc<"projects">) {
  return {
    id: project._id,
    name: project.name,
    description: project.description,
    status: project.status,
    startDate: new Date(project.startDate).toISOString(),
    targetDate: new Date(project.targetDate).toISOString(),
    createdAt: new Date(project.createdAt).toISOString(),
    archivedAt: toIso(project.archivedAt),
  }
}

function serializeMilestone(milestone: Doc<"milestones">) {
  return {
    id: milestone._id,
    projectId: milestone.projectId,
    name: milestone.name,
    targetDate: new Date(milestone.targetDate).toISOString(),
    status: milestone.status,
  }
}

function serializeCycle(cycle: Doc<"cycles">) {
  return {
    id: cycle._id,
    number: cycle.number,
    startsAt: new Date(cycle.startsAt).toISOString(),
    endsAt: new Date(cycle.endsAt).toISOString(),
    status: cycle.status,
    createdAt: new Date(cycle.createdAt).toISOString(),
    closedAt: toIso(cycle.closedAt),
  }
}

function serializeIssue(issue: Doc<"issues">) {
  return {
    id: issue._id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description,
    statusId: issue.statusId,
    priority: issue.priority,
    projectId: issue.projectId ?? null,
    milestoneId: issue.milestoneId ?? null,
    cycleId: issue.cycleId ?? null,
    assigneeId: issue.assigneeId ?? null,
    creatorId: issue.creatorId,
    createdAt: new Date(issue.createdAt).toISOString(),
    updatedAt: new Date(issue.updatedAt).toISOString(),
    completedAt: toIso(issue.completedAt),
    deletedAt: toIso(issue.deletedAt),
    cycleHistory: issue.cycleHistory.map((entry) => ({
      fromCycleId: entry.fromCycleId,
      toCycleId: entry.toCycleId,
      movedAt: new Date(entry.movedAt).toISOString(),
    })),
  }
}

function serializeComment(comment: Doc<"comments">) {
  return {
    id: comment._id,
    issueId: comment.issueId,
    userId: comment.userId,
    body: comment.body,
    createdAt: new Date(comment.createdAt).toISOString(),
    updatedAt: toIso(comment.updatedAt),
  }
}

function nullableIdValidator<TableName extends TableNames>(table: TableName) {
  return v.union(v.id(table), v.null())
}

async function getStatusesById(ctx: QueryCtx | MutationCtx, tenantId: Id<"tenants">) {
  const statuses = await ctx.db
    .query("statuses")
    .withIndex("tenantIdAndOrder", (q) => q.eq("tenantId", tenantId))
    .collect()

  return new Map(statuses.map((status) => [status._id, status]))
}

export const getWorkspaceOverview = query({
  args: {
    tenantSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenant, userId } = await requireTenantAccess(ctx, args.tenantSlug)
    const bootstrap = await getWorkspaceBootstrapState(ctx, tenant._id)

    const [memberships, statuses, cycles, projects, milestones, issues, comments] =
      await Promise.all([
        ctx.db
          .query("tenantMembers")
          .withIndex("tenantId", (q) => q.eq("tenantId", tenant._id))
          .collect(),
        ctx.db
          .query("statuses")
          .withIndex("tenantIdAndOrder", (q) => q.eq("tenantId", tenant._id))
          .collect(),
        ctx.db
          .query("cycles")
          .withIndex("tenantIdAndStartsAt", (q) => q.eq("tenantId", tenant._id))
          .collect(),
        ctx.db
          .query("projects")
          .withIndex("tenantIdAndCreatedAt", (q) => q.eq("tenantId", tenant._id))
          .collect(),
        ctx.db
          .query("milestones")
          .withIndex("tenantId", (q) => q.eq("tenantId", tenant._id))
          .collect(),
        ctx.db
          .query("issues")
          .withIndex("tenantIdAndSequenceNumber", (q) => q.eq("tenantId", tenant._id))
          .collect(),
        ctx.db
          .query("comments")
          .withIndex("tenantId", (q) => q.eq("tenantId", tenant._id))
          .collect(),
      ])

    const memberUsers = await Promise.all(
      memberships.map(async (membership) => {
        const user = await ctx.db.get(membership.userId)

        return {
          id: membership.userId,
          name: user?.name?.trim() || user?.email || "Member",
          initials: getInitials(user?.name, user?.email),
        }
      })
    )

    return {
      currentUserId: userId,
      issueSequence: tenant.issueCounter ?? 0,
      cycleLengthDays: tenant.cycleLengthDays ?? 7,
      needsBootstrap: !bootstrap.hasStatuses || !bootstrap.hasCurrentCycle,
      members: memberUsers.sort((left, right) => left.name.localeCompare(right.name)),
      statuses: statuses.map(serializeStatus),
      cycles: cycles
        .sort((left, right) => left.startsAt - right.startsAt)
        .map(serializeCycle),
      projects: projects
        .sort((left, right) => right.createdAt - left.createdAt)
        .map(serializeProject),
      milestones: milestones.map(serializeMilestone),
      issues: issues
        .sort((left, right) => right.sequenceNumber - left.sequenceNumber)
        .map(serializeIssue),
      comments: comments
        .sort((left, right) => left.createdAt - right.createdAt)
        .map(serializeComment),
    }
  },
})

export const ensureWorkspaceBootstrap = mutation({
  args: {
    tenantSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenant } = await requireTenantAccess(ctx, args.tenantSlug)
    await ensureTenantWorkspaceBootstrap(ctx, tenant)

    return { ok: true }
  },
})

export const createIssue = mutation({
  args: {
    tenantSlug: v.string(),
    title: v.string(),
    statusId: v.id("statuses"),
    priority: v.union(
      v.literal("urgent"),
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    projectId: v.optional(nullableIdValidator("projects")),
    milestoneId: v.optional(nullableIdValidator("milestones")),
    cycleId: v.optional(nullableIdValidator("cycles")),
    assigneeId: v.optional(nullableIdValidator("users")),
  },
  handler: async (ctx, args) => {
    const { tenant, userId } = await requireTenantAccess(ctx, args.tenantSlug)
    await ensureTenantWorkspaceBootstrap(ctx, tenant)

    const status = await ensureTenantDoc(
      ctx,
      "statuses",
      tenant._id,
      args.statusId,
      "Status"
    )
    const project = await ensureTenantDoc(
      ctx,
      "projects",
      tenant._id,
      args.projectId ?? null,
      "Project"
    )
    const milestone = await ensureTenantDoc(
      ctx,
      "milestones",
      tenant._id,
      args.milestoneId ?? null,
      "Milestone"
    )
    const cycle = await ensureTenantDoc(
      ctx,
      "cycles",
      tenant._id,
      args.cycleId ?? null,
      "Cycle"
    )

    await ensureTenantMember(
      ctx,
      tenant._id,
      args.assigneeId ?? null,
      "Assignee"
    )

    if (milestone && project && milestone.projectId !== project._id) {
      throw new Error("Milestone must belong to the selected project.")
    }

    if (milestone && !project) {
      throw new Error("Project is required when selecting a milestone.")
    }

    const sequenceNumber = (tenant.issueCounter ?? 0) + 1
    const issuePrefix = tenant.issuePrefix ?? buildIssuePrefix(tenant.slug)
    const now = Date.now()

    await ctx.db.patch(tenant._id, {
      issueCounter: sequenceNumber,
      issuePrefix,
      cycleLengthDays: tenant.cycleLengthDays ?? 7,
    })

    const issueId = await ctx.db.insert("issues", {
      tenantId: tenant._id,
      identifier: `${issuePrefix}-${sequenceNumber}`,
      sequenceNumber,
      title: args.title.trim(),
      description: "",
      statusId: status!._id,
      priority: args.priority,
      projectId: project?._id,
      milestoneId: milestone?._id,
      cycleId: cycle?._id,
      assigneeId: args.assigneeId ?? undefined,
      creatorId: userId,
      createdAt: now,
      updatedAt: now,
      completedAt: status?.type === "completed" ? now : undefined,
      deletedAt: undefined,
      cycleHistory: [],
    })

    return issueId
  },
})

export const updateIssue = mutation({
  args: {
    tenantSlug: v.string(),
    issueId: v.id("issues"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    statusId: v.optional(v.id("statuses")),
    priority: v.optional(
      v.union(
        v.literal("urgent"),
        v.literal("high"),
        v.literal("medium"),
        v.literal("low")
      )
    ),
    projectId: v.optional(nullableIdValidator("projects")),
    milestoneId: v.optional(nullableIdValidator("milestones")),
    cycleId: v.optional(nullableIdValidator("cycles")),
    assigneeId: v.optional(nullableIdValidator("users")),
  },
  handler: async (ctx, args) => {
    const { tenant } = await requireTenantAccess(ctx, args.tenantSlug)
    const issue = await ensureTenantDoc(
      ctx,
      "issues",
      tenant._id,
      args.issueId,
      "Issue"
    )

    const patch: Partial<Doc<"issues">> = {
      updatedAt: Date.now(),
    }

    let nextProjectId = issue?.projectId
    let nextMilestoneId = issue?.milestoneId

    if (args.title !== undefined) {
      patch.title = args.title.trim()
    }

    if (args.description !== undefined) {
      patch.description = args.description
    }

    if (args.priority !== undefined) {
      patch.priority = args.priority
    }

    if (args.statusId !== undefined) {
      const status = await ensureTenantDoc(
        ctx,
        "statuses",
        tenant._id,
        args.statusId,
        "Status"
      )

      patch.statusId = status!._id

      if (status?.type === "completed") {
        patch.completedAt = patch.completedAt ?? Date.now()
      } else {
        patch.completedAt = undefined
      }
    }

    if (args.projectId !== undefined) {
      const project = await ensureTenantDoc(
        ctx,
        "projects",
        tenant._id,
        args.projectId ?? null,
        "Project"
      )

      nextProjectId = project?._id
      patch.projectId = project?._id

      if (!project) {
        nextMilestoneId = undefined
        patch.milestoneId = undefined
      }
    }

    if (args.milestoneId !== undefined) {
      const milestone = await ensureTenantDoc(
        ctx,
        "milestones",
        tenant._id,
        args.milestoneId ?? null,
        "Milestone"
      )

      if (milestone && nextProjectId && milestone.projectId !== nextProjectId) {
        throw new Error("Milestone must belong to the selected project.")
      }

      if (milestone && !nextProjectId) {
        throw new Error("Project is required when selecting a milestone.")
      }

      nextMilestoneId = milestone?._id
      patch.milestoneId = milestone?._id
    }

    if (args.cycleId !== undefined) {
      const cycle = await ensureTenantDoc(
        ctx,
        "cycles",
        tenant._id,
        args.cycleId ?? null,
        "Cycle"
      )

      patch.cycleId = cycle?._id
    }

    if (args.assigneeId !== undefined) {
      await ensureTenantMember(
        ctx,
        tenant._id,
        args.assigneeId ?? null,
        "Assignee"
      )

      patch.assigneeId = args.assigneeId ?? undefined
    }

    if (args.projectId !== undefined && nextProjectId === undefined) {
      patch.milestoneId = undefined
    } else if (nextProjectId && nextMilestoneId === undefined) {
      patch.milestoneId = undefined
    }

    await ctx.db.patch(issue!._id, patch)

    return issue!._id
  },
})

export const archiveIssue = mutation({
  args: {
    tenantSlug: v.string(),
    issueId: v.id("issues"),
  },
  handler: async (ctx, args) => {
    const { tenant } = await requireTenantAccess(ctx, args.tenantSlug)
    const issue = await ensureTenantDoc(
      ctx,
      "issues",
      tenant._id,
      args.issueId,
      "Issue"
    )

    await ctx.db.patch(issue!._id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    })

    return issue!._id
  },
})

export const createProject = mutation({
  args: {
    tenantSlug: v.string(),
    name: v.string(),
    description: v.string(),
    targetDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenant } = await requireTenantAccess(ctx, args.tenantSlug)
    const now = Date.now()
    const targetDate = parseDateInput(args.targetDate, "target date")

    return await ctx.db.insert("projects", {
      tenantId: tenant._id,
      name: args.name.trim(),
      description: args.description.trim(),
      status: "planning",
      startDate: now,
      targetDate,
      createdAt: now,
      archivedAt: undefined,
    })
  },
})

export const archiveProject = mutation({
  args: {
    tenantSlug: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const { tenant } = await requireTenantAccess(ctx, args.tenantSlug)
    const project = await ensureTenantDoc(
      ctx,
      "projects",
      tenant._id,
      args.projectId,
      "Project"
    )

    await ctx.db.patch(project!._id, {
      status: "archived",
      archivedAt: Date.now(),
    })

    return project!._id
  },
})

export const createMilestone = mutation({
  args: {
    tenantSlug: v.string(),
    projectId: v.id("projects"),
    name: v.string(),
    targetDate: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenant } = await requireTenantAccess(ctx, args.tenantSlug)
    const project = await ensureTenantDoc(
      ctx,
      "projects",
      tenant._id,
      args.projectId,
      "Project"
    )

    return await ctx.db.insert("milestones", {
      tenantId: tenant._id,
      projectId: project!._id,
      name: args.name.trim(),
      targetDate: parseDateInput(args.targetDate, "target date"),
      status: "upcoming",
      createdAt: Date.now(),
    })
  },
})

export const addComment = mutation({
  args: {
    tenantSlug: v.string(),
    issueId: v.id("issues"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenant, userId } = await requireTenantAccess(ctx, args.tenantSlug)
    const issue = await ensureTenantDoc(
      ctx,
      "issues",
      tenant._id,
      args.issueId,
      "Issue"
    )
    const now = Date.now()

    await ctx.db.patch(issue!._id, { updatedAt: now })

    return await ctx.db.insert("comments", {
      tenantId: tenant._id,
      issueId: issue!._id,
      userId,
      body: args.body.trim(),
      createdAt: now,
      updatedAt: undefined,
    })
  },
})

export const updateComment = mutation({
  args: {
    tenantSlug: v.string(),
    commentId: v.id("comments"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenant } = await requireTenantAccess(ctx, args.tenantSlug)
    const comment = await ctx.db.get(args.commentId)

    if (!comment || comment.tenantId !== tenant._id) {
      throw new Error("Comment not found.")
    }

    await ctx.db.patch(comment._id, {
      body: args.body.trim(),
      updatedAt: Date.now(),
    })

    return comment._id
  },
})

export const deleteComment = mutation({
  args: {
    tenantSlug: v.string(),
    commentId: v.id("comments"),
  },
  handler: async (ctx, args) => {
    const { tenant } = await requireTenantAccess(ctx, args.tenantSlug)
    const comment = await ctx.db.get(args.commentId)

    if (!comment || comment.tenantId !== tenant._id) {
      throw new Error("Comment not found.")
    }

    await ctx.db.delete(comment._id)
    return comment._id
  },
})

export const closeCycle = mutation({
  args: {
    tenantSlug: v.string(),
    cycleId: v.id("cycles"),
    carryOverIssueIds: v.array(v.id("issues")),
  },
  handler: async (ctx, args) => {
    const { tenant } = await requireTenantAccess(ctx, args.tenantSlug)
    const cycle = await ensureTenantDoc(
      ctx,
      "cycles",
      tenant._id,
      args.cycleId,
      "Cycle"
    )

    if (!cycle || cycle.status !== "current") {
      throw new Error("Only the current cycle can be closed.")
    }

    const statusesById = await getStatusesById(ctx, tenant._id)
    const cycles = await ctx.db
      .query("cycles")
      .withIndex("tenantIdAndStartsAt", (q) => q.eq("tenantId", tenant._id))
      .collect()

    let nextCycle: Doc<"cycles"> | null =
      cycles
        .filter((entry) => entry.startsAt > cycle.startsAt)
        .sort((left, right) => left.startsAt - right.startsAt)[0] ?? null

    if (!nextCycle) {
      const nextStart = addWeeks(new Date(cycle.startsAt), 1)
      const nextCycleId = await ctx.db.insert("cycles", {
        tenantId: tenant._id,
        number: cycle.number + 1,
        startsAt: nextStart.getTime(),
        endsAt: addWeeks(new Date(cycle.endsAt), 1).getTime(),
        status: "upcoming",
        createdAt: Date.now(),
        closedAt: undefined,
      })
      nextCycle = await ctx.db.get(nextCycleId)
    }

    if (!nextCycle) {
      throw new Error("Unable to create the next cycle.")
    }

    const currentIssues = await ctx.db
      .query("issues")
      .withIndex("tenantIdAndCycleId", (q) =>
        q.eq("tenantId", tenant._id).eq("cycleId", cycle._id)
      )
      .collect()

    const carryOverSet = new Set(args.carryOverIssueIds)
    const now = Date.now()

    for (const issue of currentIssues) {
      if (issue.deletedAt || !carryOverSet.has(issue._id)) {
        continue
      }

      const statusType = statusesById.get(issue.statusId)?.type

      if (statusType === "completed" || statusType === "canceled") {
        continue
      }

      await ctx.db.patch(issue._id, {
        cycleId: nextCycle._id,
        updatedAt: now,
        cycleHistory: [
          {
            fromCycleId: cycle._id,
            toCycleId: nextCycle._id,
            movedAt: now,
          },
          ...issue.cycleHistory,
        ],
      })
    }

    for (const entry of cycles) {
      if (entry._id === cycle._id) {
        await ctx.db.patch(entry._id, {
          status: "closed",
          closedAt: now,
        })
        continue
      }

      if (entry._id === nextCycle._id) {
        await ctx.db.patch(entry._id, {
          status: "current",
          closedAt: undefined,
        })
        continue
      }

      await ctx.db.patch(entry._id, {
        status: entry.startsAt < nextCycle.startsAt ? "closed" : "upcoming",
        closedAt: entry.startsAt < nextCycle.startsAt ? entry.closedAt ?? now : undefined,
      })
    }

    const farFutureCycle = cycles.some((entry) => entry.startsAt > nextCycle.startsAt)

    if (!farFutureCycle) {
      const futureStart = startOfWeek(addWeeks(new Date(nextCycle.startsAt), 1), {
        weekStartsOn: 1,
      })

      await ctx.db.insert("cycles", {
        tenantId: tenant._id,
        number: nextCycle.number + 1,
        startsAt: futureStart.getTime(),
        endsAt: addWeeks(new Date(nextCycle.endsAt), 1).getTime(),
        status: "upcoming",
        createdAt: now,
        closedAt: undefined,
      })
    }

    return nextCycle._id
  },
})
