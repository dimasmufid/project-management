export type WorkspaceTenant = {
  name: string
  slug: string
  role: "owner" | "member"
  avatarUrl?: string | null
}

export type WorkspaceMember = {
  id: string
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
  id: string
  name: string
  type: StatusType
  order: number
}

export type WorkspaceProject = {
  id: string
  name: string
  description: string
  status: ProjectStatus
  startDate: string
  targetDate: string
  createdAt: string
  archivedAt?: string | null
}

export type WorkspaceMilestone = {
  id: string
  projectId: string
  name: string
  targetDate: string
  status: MilestoneStatus
}

export type CycleStatus = "upcoming" | "current" | "closed"

export type WorkspaceCycle = {
  id: string
  number: number
  startsAt: string
  endsAt: string
  status: CycleStatus
  createdAt: string
  closedAt?: string | null
}

export type WorkspaceComment = {
  id: string
  issueId: string
  userId: string
  body: string
  createdAt: string
  updatedAt?: string | null
}

export type CycleMove = {
  fromCycleId: string
  toCycleId: string
  movedAt: string
}

export type WorkspaceIssue = {
  id: string
  identifier: string
  title: string
  description: string
  statusId: string
  priority: "urgent" | "high" | "medium" | "low"
  projectId?: string | null
  milestoneId?: string | null
  cycleId?: string | null
  assigneeId?: string | null
  creatorId: string
  createdAt: string
  updatedAt: string
  completedAt?: string | null
  deletedAt?: string | null
  cycleHistory: CycleMove[]
}

export type WorkspaceData = {
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
