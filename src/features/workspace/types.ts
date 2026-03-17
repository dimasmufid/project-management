import type { Id } from "../../../convex/_generated/dataModel"

export type WorkspaceTenant = {
  tenantId: Id<"tenants">
  name: string
  slug: string
  role: "owner" | "member"
  avatarUrl?: string | null
}

export type WorkspaceMember = {
  id: Id<"users">
  name: string
  initials: string
}

export type ProjectStatus =
  | "planning"
  | "on_track"
  | "at_risk"
  | "completed"
  | "archived"

export type MilestoneStatus = "upcoming" | "in_progress" | "done"

export type StatusType =
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "canceled"

export type IssueStatus = {
  id: Id<"statuses">
  name: string
  type: StatusType
  order: number
}

export type WorkspaceProject = {
  id: Id<"projects">
  name: string
  description: string
  status: ProjectStatus
  startDate: string
  targetDate: string
  createdAt: string
  archivedAt?: string | null
}

export type WorkspaceMilestone = {
  id: Id<"milestones">
  projectId: Id<"projects">
  name: string
  targetDate: string
  status: MilestoneStatus
}

export type CycleStatus = "upcoming" | "current" | "closed"

export type WorkspaceCycle = {
  id: Id<"cycles">
  number: number
  startsAt: string
  endsAt: string
  status: CycleStatus
  createdAt: string
  closedAt?: string | null
}

export type WorkspaceComment = {
  id: Id<"comments">
  issueId: Id<"issues">
  userId: Id<"users">
  body: string
  createdAt: string
  updatedAt?: string | null
}

export type CycleMove = {
  fromCycleId: Id<"cycles">
  toCycleId: Id<"cycles">
  movedAt: string
}

export type WorkspaceIssue = {
  id: Id<"issues">
  identifier: string
  title: string
  description: string
  statusId: Id<"statuses">
  priority: "urgent" | "high" | "medium" | "low"
  projectId?: Id<"projects"> | null
  milestoneId?: Id<"milestones"> | null
  cycleId?: Id<"cycles"> | null
  assigneeId?: Id<"users"> | null
  creatorId: Id<"users">
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  deletedAt?: string | null
  cycleHistory: CycleMove[]
}

export type WorkspaceData = {
  currentUserId: Id<"users">
  issueSequence: number
  cycleLengthDays: number
  members: WorkspaceMember[]
  projects: WorkspaceProject[]
  milestones: WorkspaceMilestone[]
  statuses: IssueStatus[]
  cycles: WorkspaceCycle[]
  issues: WorkspaceIssue[]
  comments: WorkspaceComment[]
}
