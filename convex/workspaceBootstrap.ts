import { addWeeks, endOfWeek, getISOWeek, startOfWeek } from "date-fns"

import type { Doc, Id } from "./_generated/dataModel"
import type { MutationCtx, QueryCtx } from "./_generated/server"

const DEFAULT_CYCLE_LENGTH_DAYS = 7

const DEFAULT_STATUSES = [
  { name: "Backlog", type: "backlog", order: 0 },
  { name: "Todo", type: "unstarted", order: 1 },
  { name: "In Progress", type: "started", order: 2 },
  { name: "In Review", type: "started", order: 3 },
  { name: "Done", type: "completed", order: 4 },
  { name: "Canceled", type: "canceled", order: 5 },
] as const

export function buildIssuePrefix(slug: string) {
  const normalized = slug.replace(/[^a-z0-9]/gi, "").toUpperCase()
  return normalized.slice(0, 4) || "TEAM"
}

function createCycleRecord(
  startsAt: Date,
  status: "upcoming" | "current" | "closed"
) {
  const createdAt = Date.now()
  const endsAt = endOfWeek(startsAt, { weekStartsOn: 1 })

  return {
    number: getISOWeek(startsAt),
    startsAt: startsAt.getTime(),
    endsAt: endsAt.getTime(),
    status,
    createdAt,
    closedAt: status === "closed" ? createdAt : undefined,
  }
}

async function ensureStatuses(
  ctx: MutationCtx,
  tenantId: Id<"tenants">
) {
  const existingStatuses = await ctx.db
    .query("statuses")
    .withIndex("tenantId", (q) => q.eq("tenantId", tenantId))
    .collect()

  if (existingStatuses.length) {
    return existingStatuses
  }

  const created: Doc<"statuses">[] = []

  for (const status of DEFAULT_STATUSES) {
    const id = await ctx.db.insert("statuses", {
      tenantId,
      name: status.name,
      type: status.type,
      order: status.order,
      createdAt: Date.now(),
    })
    const doc = await ctx.db.get(id)

    if (doc) {
      created.push(doc)
    }
  }

  return created
}

async function ensureCycles(
  ctx: MutationCtx,
  tenant: Doc<"tenants">
) {
  const existingCycles = await ctx.db
    .query("cycles")
    .withIndex("tenantId", (q) => q.eq("tenantId", tenant._id))
    .collect()

  if (existingCycles.length) {
    return existingCycles
  }

  const currentStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const seedCycles = [
    createCycleRecord(addWeeks(currentStart, -1), "closed"),
    createCycleRecord(currentStart, "current"),
    createCycleRecord(addWeeks(currentStart, 1), "upcoming"),
  ]

  const created: Doc<"cycles">[] = []

  for (const cycle of seedCycles) {
    const id = await ctx.db.insert("cycles", {
      tenantId: tenant._id,
      ...cycle,
    })
    const doc = await ctx.db.get(id)

    if (doc) {
      created.push(doc)
    }
  }

  return created
}

export async function ensureWorkspaceBootstrap(
  ctx: MutationCtx,
  tenant: Doc<"tenants">
) {
  if (
    tenant.cycleLengthDays !== DEFAULT_CYCLE_LENGTH_DAYS ||
    !tenant.issuePrefix ||
    tenant.issueCounter === undefined
  ) {
    await ctx.db.patch(tenant._id, {
      cycleLengthDays: tenant.cycleLengthDays ?? DEFAULT_CYCLE_LENGTH_DAYS,
      issuePrefix: tenant.issuePrefix ?? buildIssuePrefix(tenant.slug),
      issueCounter: tenant.issueCounter ?? 0,
    })
  }

  await ensureStatuses(ctx, tenant._id)
  await ensureCycles(ctx, tenant)
}

export async function getWorkspaceBootstrapState(
  ctx: QueryCtx,
  tenantId: Id<"tenants">
) {
  const [statuses, cycles] = await Promise.all([
    ctx.db
      .query("statuses")
      .withIndex("tenantId", (q) => q.eq("tenantId", tenantId))
      .collect(),
    ctx.db
      .query("cycles")
      .withIndex("tenantId", (q) => q.eq("tenantId", tenantId))
      .collect(),
  ])

  return {
    hasStatuses: statuses.length > 0,
    hasCurrentCycle: cycles.some((cycle) => cycle.status === "current"),
  }
}
