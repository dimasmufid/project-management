import { useCallback, useEffect, useMemo, useState } from "react"
import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  getISOWeek,
  isAfter,
  parseISO,
  startOfWeek,
  subDays,
} from "date-fns"

import type {
  IssueStatus,
  WorkspaceComment,
  WorkspaceCycle,
  WorkspaceData,
  WorkspaceIssue,
  WorkspaceMember,
  WorkspaceMilestone,
  WorkspaceProject,
} from "@/features/workspace/types"

const STORAGE_VERSION = 2

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function getStorageKey(tenantSlug: string) {
  return `linear-workspace:${tenantSlug}:v${STORAGE_VERSION}`
}

function buildCycleId(startsAt: Date) {
  return `cycle-${format(startsAt, "yyyy-MM-dd")}`
}

function buildCycle(startsAt: Date, status: WorkspaceCycle["status"]): WorkspaceCycle {
  const endsAt = endOfWeek(startsAt, { weekStartsOn: 1 })
  const now = new Date().toISOString()

  return {
    id: buildCycleId(startsAt),
    number: getISOWeek(startsAt),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
    status,
    createdAt: now,
    closedAt: status === "closed" ? now : null,
  }
}

function ensureCycleTimeline(cycles: WorkspaceCycle[]): WorkspaceCycle[] {
  if (!cycles.length) {
    const currentStart = startOfWeek(new Date(), { weekStartsOn: 1 })

    return [
      buildCycle(addWeeks(currentStart, -1), "closed"),
      buildCycle(currentStart, "current"),
      buildCycle(addWeeks(currentStart, 1), "upcoming"),
    ]
  }

  const sorted = [...cycles].sort(
    (left, right) =>
      parseISO(left.startsAt).getTime() - parseISO(right.startsAt).getTime()
  )
  const current =
    sorted.find((cycle) => cycle.status === "current") ??
    sorted.find((cycle) => cycle.status === "upcoming") ??
    sorted.at(-1)!

  const previousStart = addWeeks(parseISO(current.startsAt), -1)
  const nextStart = addWeeks(parseISO(current.startsAt), 1)
  const requiredIds = new Set([
    buildCycleId(previousStart),
    buildCycleId(parseISO(current.startsAt)),
    buildCycleId(nextStart),
  ])

  const byId = new Map(sorted.map((cycle) => [cycle.id, cycle]))

  if (!byId.has(buildCycleId(previousStart))) {
    byId.set(buildCycleId(previousStart), buildCycle(previousStart, "closed"))
  }

  if (!byId.has(buildCycleId(parseISO(current.startsAt)))) {
    byId.set(
      buildCycleId(parseISO(current.startsAt)),
      buildCycle(parseISO(current.startsAt), "current")
    )
  }

  if (!byId.has(buildCycleId(nextStart))) {
    byId.set(buildCycleId(nextStart), buildCycle(nextStart, "upcoming"))
  }

  return [...byId.values()]
    .filter((cycle) => requiredIds.has(cycle.id))
    .sort(
      (left, right) =>
        parseISO(left.startsAt).getTime() - parseISO(right.startsAt).getTime()
    )
    .map((cycle) => {
      const currentId = buildCycleId(parseISO(current.startsAt))
      const previousId = buildCycleId(previousStart)

      if (cycle.id === currentId) {
        return { ...cycle, status: "current" as const, closedAt: null }
      }

      if (cycle.id === previousId && cycle.status !== "closed") {
        return {
          ...cycle,
          status: "closed" as const,
          closedAt: cycle.closedAt ?? cycle.endsAt,
        }
      }

      return { ...cycle, status: "upcoming" as const, closedAt: null }
    })
}

function createSeedWorkspace(tenantSlug: string): WorkspaceData {
  const currentStart = startOfWeek(new Date(), { weekStartsOn: 1 })
  const previousCycle = buildCycle(addWeeks(currentStart, -1), "closed")
  const currentCycle = buildCycle(currentStart, "current")
  const nextCycle = buildCycle(addWeeks(currentStart, 1), "upcoming")
  const createdAt = subDays(currentStart, 18).toISOString()

  const members: WorkspaceMember[] = [
    {
      id: "member-dimas",
      name: "Dimas",
      initials: "DM",
    },
    {
      id: "member-salsa",
      name: "Salsa",
      initials: "SA",
    },
    {
      id: "member-raka",
      name: "Raka",
      initials: "RK",
    },
  ]

  const statuses: IssueStatus[] = [
    { id: "status-backlog", name: "Backlog", type: "backlog", order: 0 },
    { id: "status-todo", name: "Todo", type: "unstarted", order: 1 },
    { id: "status-progress", name: "In Progress", type: "started", order: 2 },
    { id: "status-review", name: "In Review", type: "started", order: 3 },
    { id: "status-done", name: "Done", type: "completed", order: 4 },
    { id: "status-canceled", name: "Canceled", type: "canceled", order: 5 },
  ]

  const projects: WorkspaceProject[] = [
    {
      id: "project-workspace",
      name: "Workspace Foundations",
      description:
        "Tenant-scoped shell, sidebar navigation, issue flows, and cycle planning.",
      status: "on_track",
      startDate: subDays(currentStart, 21).toISOString(),
      targetDate: addDays(currentStart, 21).toISOString(),
      createdAt,
      archivedAt: null,
    },
    {
      id: "project-editor",
      name: "Editor Experience",
      description:
        "Markdown description workflow, preview, and collaborative commenting patterns.",
      status: "planning",
      startDate: subDays(currentStart, 14).toISOString(),
      targetDate: addDays(currentStart, 28).toISOString(),
      createdAt,
      archivedAt: null,
    },
  ]

  const milestones: WorkspaceMilestone[] = [
    {
      id: "milestone-navigation",
      projectId: "project-workspace",
      name: "Navigation MVP",
      targetDate: addDays(currentStart, 5).toISOString(),
      status: "in_progress",
    },
    {
      id: "milestone-cycles",
      projectId: "project-workspace",
      name: "Cycle Close Flow",
      targetDate: addDays(currentStart, 12).toISOString(),
      status: "upcoming",
    },
    {
      id: "milestone-markdown",
      projectId: "project-editor",
      name: "Markdown Compose + Preview",
      targetDate: addDays(currentStart, 10).toISOString(),
      status: "in_progress",
    },
  ]

  const prefix = tenantSlug.slice(0, 4).toUpperCase() || "TEAM"

  const issues: WorkspaceIssue[] = [
    {
      id: "issue-shell",
      identifier: `${prefix}-1`,
      title: "Ship tenant workspace shell with inset sidebar",
      description: [
        "## Goal",
        "Build the tenant-scoped shell that routes every authenticated page through the workspace.",
        "",
        "### Must include",
        "- inset sidebar navigation",
        "- section-aware header",
        "- quick entry points for issues, cycles, and projects",
      ].join("\n"),
      statusId: "status-review",
      priority: "high",
      projectId: "project-workspace",
      milestoneId: "milestone-navigation",
      cycleId: currentCycle.id,
      assigneeId: "member-dimas",
      creatorId: "member-dimas",
      createdAt: subDays(currentStart, 8).toISOString(),
      updatedAt: subDays(currentStart, 1).toISOString(),
      completedAt: null,
      deletedAt: null,
      cycleHistory: [],
    },
    {
      id: "issue-close-cycle",
      identifier: `${prefix}-2`,
      title: "Model cycle close confirmation and carry-over",
      description: [
        "## Close flow",
        "When the current cycle closes:",
        "",
        "1. show completed and incomplete counts",
        "2. allow deselecting carry-over items",
        "3. promote next cycle to current",
        "",
        "> Incomplete work should not disappear from planning.",
      ].join("\n"),
      statusId: "status-progress",
      priority: "urgent",
      projectId: "project-workspace",
      milestoneId: "milestone-cycles",
      cycleId: currentCycle.id,
      assigneeId: "member-raka",
      creatorId: "member-dimas",
      createdAt: subDays(currentStart, 5).toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null,
      deletedAt: null,
      cycleHistory: [],
    },
    {
      id: "issue-markdown",
      identifier: `${prefix}-3`,
      title: "Support markdown write and preview in issue detail",
      description: [
        "## Description experience",
        "",
        "- headings",
        "- task lists",
        "- fenced code blocks",
        "- tables",
        "",
        "```tsx",
        "<MarkdownPreview content={issue.description} />",
        "```",
      ].join("\n"),
      statusId: "status-progress",
      priority: "high",
      projectId: "project-editor",
      milestoneId: "milestone-markdown",
      cycleId: currentCycle.id,
      assigneeId: "member-salsa",
      creatorId: "member-dimas",
      createdAt: subDays(currentStart, 6).toISOString(),
      updatedAt: subDays(currentStart, 2).toISOString(),
      completedAt: null,
      deletedAt: null,
      cycleHistory: [],
    },
    {
      id: "issue-board",
      identifier: `${prefix}-4`,
      title: "Enable board view drag and drop",
      description: "Keep board movement simple: drag card between status columns.",
      statusId: "status-todo",
      priority: "medium",
      projectId: "project-workspace",
      milestoneId: "milestone-navigation",
      cycleId: currentCycle.id,
      assigneeId: "member-raka",
      creatorId: "member-dimas",
      createdAt: subDays(currentStart, 3).toISOString(),
      updatedAt: subDays(currentStart, 1).toISOString(),
      completedAt: null,
      deletedAt: null,
      cycleHistory: [],
    },
    {
      id: "issue-backlog",
      identifier: `${prefix}-5`,
      title: "Draft list view inline editing rules",
      description: "Backlog item waiting for cycle planning.",
      statusId: "status-backlog",
      priority: "medium",
      projectId: "project-workspace",
      milestoneId: null,
      cycleId: null,
      assigneeId: null,
      creatorId: "member-raka",
      createdAt: subDays(currentStart, 2).toISOString(),
      updatedAt: subDays(currentStart, 2).toISOString(),
      completedAt: null,
      deletedAt: null,
      cycleHistory: [],
    },
    {
      id: "issue-complete",
      identifier: `${prefix}-6`,
      title: "Finalize project summary cards",
      description: "Done items should stay in the closed cycle after review.",
      statusId: "status-done",
      priority: "low",
      projectId: "project-workspace",
      milestoneId: "milestone-navigation",
      cycleId: previousCycle.id,
      assigneeId: "member-dimas",
      creatorId: "member-salsa",
      createdAt: subDays(currentStart, 11).toISOString(),
      updatedAt: subDays(currentStart, 8).toISOString(),
      completedAt: subDays(currentStart, 8).toISOString(),
      deletedAt: null,
      cycleHistory: [],
    },
  ]

  const comments: WorkspaceComment[] = [
    {
      id: "comment-1",
      issueId: "issue-close-cycle",
      userId: "member-dimas",
      body: "We should show the incomplete list in the confirmation modal before moving anything.",
      createdAt: subDays(currentStart, 1).toISOString(),
      updatedAt: null,
    },
    {
      id: "comment-2",
      issueId: "issue-markdown",
      userId: "member-salsa",
      body: "Preview should support checklists and tables so the description can act as the execution doc.",
      createdAt: subDays(currentStart, 1).toISOString(),
      updatedAt: null,
    },
  ]

  return {
    issueSequence: issues.length,
    cycleLengthDays: 7,
    members,
    projects,
    milestones,
    statuses,
    cycles: [previousCycle, currentCycle, nextCycle],
    issues,
    comments,
  }
}

function normalizeWorkspace(workspace: WorkspaceData) {
  return {
    ...workspace,
    cycles: ensureCycleTimeline(workspace.cycles),
  }
}

function readWorkspace(tenantSlug: string) {
  if (typeof window === "undefined") {
    return normalizeWorkspace(createSeedWorkspace(tenantSlug))
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(tenantSlug))

    if (!raw) {
      return normalizeWorkspace(createSeedWorkspace(tenantSlug))
    }

    const parsed = JSON.parse(raw) as WorkspaceData
    return normalizeWorkspace(parsed)
  } catch {
    return normalizeWorkspace(createSeedWorkspace(tenantSlug))
  }
}

function writeWorkspace(tenantSlug: string, workspace: WorkspaceData) {
  window.localStorage.setItem(getStorageKey(tenantSlug), JSON.stringify(workspace))
}

function updateCompletion(statuses: IssueStatus[], issue: WorkspaceIssue) {
  const status = statuses.find((item) => item.id === issue.statusId)

  if (!status) {
    return issue
  }

  if (status.type === "completed" && !issue.completedAt) {
    return { ...issue, completedAt: new Date().toISOString() }
  }

  if (status.type !== "completed" && issue.completedAt) {
    return { ...issue, completedAt: null }
  }

  return issue
}

function createUpcomingCycle(baseCycle: WorkspaceCycle) {
  const nextStart = addWeeks(parseISO(baseCycle.startsAt), 1)
  return buildCycle(nextStart, "upcoming")
}

export function useWorkspaceState(tenantSlug: string) {
  const [workspace, setWorkspace] = useState<WorkspaceData>(() =>
    readWorkspace(tenantSlug)
  )

  useEffect(() => {
    setWorkspace(readWorkspace(tenantSlug))
  }, [tenantSlug])

  useEffect(() => {
    writeWorkspace(tenantSlug, workspace)
  }, [tenantSlug, workspace])

  const statusById = useMemo(
    () => new Map(workspace.statuses.map((status) => [status.id, status])),
    [workspace.statuses]
  )

  const currentCycle = useMemo(
    () => workspace.cycles.find((cycle) => cycle.status === "current") ?? null,
    [workspace.cycles]
  )

  const createIssue = useCallback(
    ({
      title,
      statusId,
      priority,
      projectId,
      milestoneId,
      cycleId,
      assigneeId,
      creatorId,
    }: {
      title: string
      statusId: string
      priority: WorkspaceIssue["priority"]
      projectId?: string | null
      milestoneId?: string | null
      cycleId?: string | null
      assigneeId?: string | null
      creatorId: string
    }) => {
      setWorkspace((previous) => {
        const nextSequence = previous.issueSequence + 1
        const prefix = tenantSlug.slice(0, 4).toUpperCase() || "TEAM"
        const nextIssue: WorkspaceIssue = updateCompletion(previous.statuses, {
          id: createId("issue"),
          identifier: `${prefix}-${nextSequence}`,
          title: title.trim(),
          description: "",
          statusId,
          priority,
          projectId: projectId || null,
          milestoneId: milestoneId || null,
          cycleId: cycleId || null,
          assigneeId: assigneeId || null,
          creatorId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: null,
          deletedAt: null,
          cycleHistory: [],
        })

        return {
          ...previous,
          issueSequence: nextSequence,
          issues: [nextIssue, ...previous.issues],
        }
      })
    },
    [tenantSlug]
  )

  const updateIssue = useCallback(
    (issueId: string, patch: Partial<WorkspaceIssue>) => {
      setWorkspace((previous) => ({
        ...previous,
        issues: previous.issues.map((issue) => {
          if (issue.id !== issueId) {
            return issue
          }

          return updateCompletion(previous.statuses, {
            ...issue,
            ...patch,
            updatedAt: new Date().toISOString(),
          })
        }),
      }))
    },
    []
  )

  const archiveIssue = useCallback((issueId: string) => {
    setWorkspace((previous) => ({
      ...previous,
      issues: previous.issues.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              deletedAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          : issue
      ),
    }))
  }, [])

  const createProject = useCallback(
    (project: Pick<WorkspaceProject, "name" | "description" | "targetDate">) => {
      setWorkspace((previous) => ({
        ...previous,
        projects: [
          {
            id: createId("project"),
            name: project.name.trim(),
            description: project.description.trim(),
            status: "planning",
            startDate: new Date().toISOString(),
            targetDate: project.targetDate,
            createdAt: new Date().toISOString(),
            archivedAt: null,
          },
          ...previous.projects,
        ],
      }))
    },
    []
  )

  const updateProject = useCallback(
    (projectId: string, patch: Partial<WorkspaceProject>) => {
      setWorkspace((previous) => ({
        ...previous,
        projects: previous.projects.map((project) =>
          project.id === projectId ? { ...project, ...patch } : project
        ),
      }))
    },
    []
  )

  const archiveProject = useCallback((projectId: string) => {
    setWorkspace((previous) => ({
      ...previous,
      projects: previous.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              status: "archived",
              archivedAt: new Date().toISOString(),
            }
          : project
      ),
    }))
  }, [])

  const createMilestone = useCallback(
    (milestone: Pick<WorkspaceMilestone, "projectId" | "name" | "targetDate">) => {
      setWorkspace((previous) => ({
        ...previous,
        milestones: [
          {
            id: createId("milestone"),
            projectId: milestone.projectId,
            name: milestone.name.trim(),
            targetDate: milestone.targetDate,
            status: "upcoming",
          },
          ...previous.milestones,
        ],
      }))
    },
    []
  )

  const addComment = useCallback(
    (issueId: string, userId: string, body: string) => {
      setWorkspace((previous) => ({
        ...previous,
        comments: [
          {
            id: createId("comment"),
            issueId,
            userId,
            body: body.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: null,
          },
          ...previous.comments,
        ],
        issues: previous.issues.map((issue) =>
          issue.id === issueId
            ? { ...issue, updatedAt: new Date().toISOString() }
            : issue
        ),
      }))
    },
    []
  )

  const updateComment = useCallback((commentId: string, body: string) => {
    setWorkspace((previous) => ({
      ...previous,
      comments: previous.comments.map((comment) =>
        comment.id === commentId
          ? {
              ...comment,
              body: body.trim(),
              updatedAt: new Date().toISOString(),
            }
          : comment
      ),
    }))
  }, [])

  const deleteComment = useCallback((commentId: string) => {
    setWorkspace((previous) => ({
      ...previous,
      comments: previous.comments.filter((comment) => comment.id !== commentId),
    }))
  }, [])

  const closeCycle = useCallback(
    ({
      cycleId,
      carryOverIssueIds,
    }: {
      cycleId: string
      carryOverIssueIds: string[]
    }) => {
      setWorkspace((previous) => {
        const cycle = previous.cycles.find((item) => item.id === cycleId)

        if (!cycle) {
          return previous
        }

        const sortedCycles = [...previous.cycles].sort(
          (left, right) =>
            parseISO(left.startsAt).getTime() - parseISO(right.startsAt).getTime()
        )

        const nextExistingCycle = sortedCycles.find((item) =>
          isAfter(parseISO(item.startsAt), parseISO(cycle.startsAt))
        )
        const nextCycle = nextExistingCycle ?? createUpcomingCycle(cycle)
        const carryOverSet = new Set(carryOverIssueIds)
        const now = new Date().toISOString()
        const statuses = new Map(
          previous.statuses.map((status) => [status.id, status.type])
        )

        const nextIssues = previous.issues.map((issue) => {
          if (issue.deletedAt || issue.cycleId !== cycleId || !carryOverSet.has(issue.id)) {
            return issue
          }

          const statusType = statuses.get(issue.statusId)

          if (statusType === "completed" || statusType === "canceled") {
            return issue
          }

          return {
            ...issue,
            cycleId: nextCycle.id,
            updatedAt: now,
            cycleHistory: [
              {
                fromCycleId: cycleId,
                toCycleId: nextCycle.id,
                movedAt: now,
              },
              ...issue.cycleHistory,
            ],
          }
        })

        const normalizedCycles = ensureCycleTimeline([
          {
            ...cycle,
            status: "closed" as const,
            closedAt: now,
          },
          {
            ...nextCycle,
            status: "current" as const,
            closedAt: null,
          },
          createUpcomingCycle(nextCycle),
        ])

        return {
          ...previous,
          cycles: normalizedCycles,
          issues: nextIssues,
        }
      })
    },
    []
  )

  return {
    workspace,
    currentCycle,
    statusById,
    createIssue,
    updateIssue,
    archiveIssue,
    createProject,
    updateProject,
    archiveProject,
    createMilestone,
    addComment,
    updateComment,
    deleteComment,
    closeCycle,
  }
}
