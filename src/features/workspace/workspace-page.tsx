import {
  RiAddLine,
  RiCalendarLine,
  RiChat3Line,
  RiDeleteBin6Line,
  RiFlagLine,
  RiFolderLine,
  RiGitCommitLine,
  RiLayoutGridLine,
  RiListCheck3,
  RiLoopLeftLine,
  RiPencilLine,
} from "@remixicon/react"
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useOutletContext } from "react-router-dom"
import { format, isAfter, parseISO } from "date-fns"

import { MarkdownPreview } from "@/features/workspace/markdown-preview"
import type { WorkspaceLayoutContext } from "@/features/workspace/workspace-layout"
import type {
  IssueStatus,
  WorkspaceComment,
  WorkspaceCycle,
  WorkspaceIssue,
  WorkspaceMember,
  WorkspaceMilestone,
  WorkspaceProject,
} from "@/features/workspace/types"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

type SectionKey = "issues" | "cycles" | "projects"
type IssueViewKey = "list" | "board"
type IssueScope = "all" | "current" | "backlog"
type SortKey = "updated" | "priority" | "identifier"

const PRIORITY_ORDER: Record<WorkspaceIssue["priority"], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const PRIORITY_LABELS: Record<WorkspaceIssue["priority"], string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
}

const PRIORITY_BADGES: Record<WorkspaceIssue["priority"], string> = {
  urgent: "border-destructive/40 bg-destructive/10 text-destructive",
  high: "border-primary/40 bg-primary/10 text-primary",
  medium: "border-border bg-muted text-foreground/80",
  low: "border-border bg-background text-muted-foreground",
}

const PROJECT_STATUS_LABELS: Record<WorkspaceProject["status"], string> = {
  planning: "Planning",
  on_track: "On track",
  at_risk: "At risk",
  completed: "Completed",
  archived: "Archived",
}

const MILESTONE_STATUS_LABELS: Record<WorkspaceMilestone["status"], string> = {
  upcoming: "Upcoming",
  in_progress: "In progress",
  done: "Done",
}

const CYCLE_STATUS_LABELS: Record<WorkspaceCycle["status"], string> = {
  upcoming: "Upcoming",
  current: "Current",
  closed: "Closed",
}

function formatDate(value?: string | null, pattern = "MMM d") {
  if (!value) {
    return "Backlog"
  }

  return format(parseISO(value), pattern)
}

function parseDateValue(value: string) {
  if (!value) {
    return undefined
  }

  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return undefined
  }

  return new Date(year, month - 1, day)
}

function formatDateValue(value: Date) {
  return format(value, "yyyy-MM-dd")
}

function getStatusTone(status: IssueStatus) {
  switch (status.type) {
    case "completed":
      return "border-primary/30 bg-primary/10 text-primary"
    case "started":
      return "border-chart-2/30 bg-chart-2/10 text-chart-2"
    case "unstarted":
      return "border-chart-3/30 bg-chart-3/10 text-chart-3"
    case "canceled":
      return "border-border bg-muted text-muted-foreground"
    default:
      return "border-border bg-background text-muted-foreground"
  }
}

function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Workflow
        </p>
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="max-w-2xl text-xs/relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint: string
}) {
  return (
    <Card size="sm" className="min-w-0">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 py-1">
        <div className="text-lg font-semibold">{value}</div>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full border border-border bg-background">
      <div
        className="h-full bg-primary transition-[width]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  )
}

function MarkdownToolbarButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button type="button" variant="outline" size="xs" onClick={onClick}>
      {label}
    </Button>
  )
}

function DatePickerField({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
}) {
  const [open, setOpen] = useState(false)
  const selectedDate = parseDateValue(value)

  return (
    <div className="grid gap-1">
      <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            buttonVariants({ variant: "outline" }),
            "w-full justify-between font-normal",
            !selectedDate && "text-muted-foreground"
          )}
        >
          <span>{selectedDate ? format(selectedDate, "MMM d, yyyy") : placeholder}</span>
          <RiCalendarLine />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (!date) {
                return
              }

              onChange(formatDateValue(date))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function NewIssueDialog({
  open,
  onOpenChange,
  members,
  projects,
  milestones,
  cycles,
  statuses,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  members: WorkspaceMember[]
  projects: WorkspaceProject[]
  milestones: WorkspaceMilestone[]
  cycles: WorkspaceCycle[]
  statuses: IssueStatus[]
  onCreate: (values: {
    title: string
    statusId: IssueStatus["id"]
    priority: WorkspaceIssue["priority"]
    projectId?: WorkspaceProject["id"] | null
    milestoneId?: WorkspaceMilestone["id"] | null
    cycleId?: WorkspaceCycle["id"] | null
    assigneeId?: WorkspaceMember["id"] | null
  }) => void
}) {
  const backlogStatus = statuses.find((status) => status.type === "backlog") ?? statuses[0]
  const [title, setTitle] = useState("")
  const [statusId, setStatusId] = useState<string>(backlogStatus.id)
  const [priority, setPriority] = useState<WorkspaceIssue["priority"]>("medium")
  const [projectId, setProjectId] = useState<string>("none")
  const [milestoneId, setMilestoneId] = useState<string>("none")
  const [cycleId, setCycleId] = useState<string>("none")
  const [assigneeId, setAssigneeId] = useState<string>("none")

  const resetForm = () => {
    setTitle("")
    setStatusId(backlogStatus.id)
    setPriority("medium")
    setProjectId("none")
    setMilestoneId("none")
    setCycleId("none")
    setAssigneeId("none")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }

    onOpenChange(nextOpen)
  }

  const projectMilestones = milestones.filter((milestone) =>
    projectId === "none" ? true : milestone.projectId === projectId
  )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New issue</DialogTitle>
          <DialogDescription>
            Minimal input is just the title. Project, assignee, and cycle can stay empty.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Issue title"
            autoFocus
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <InlineSelect
              label="Status"
              value={statusId}
              onValueChange={setStatusId}
              options={statuses.map((status) => ({
                value: status.id,
                label: status.name,
              }))}
            />
            <InlineSelect
              label="Priority"
              value={priority}
              onValueChange={(value) =>
                setPriority(value as WorkspaceIssue["priority"])
              }
              options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <InlineSelect
              label="Project"
              value={projectId}
              onValueChange={(value) => {
                setProjectId(value)
                setMilestoneId("none")
              }}
              options={[
                { value: "none", label: "No project" },
                ...projects
                  .filter((project) => !project.archivedAt)
                  .map((project) => ({
                    value: project.id,
                    label: project.name,
                  })),
              ]}
            />
            <InlineSelect
              label="Milestone"
              value={milestoneId}
              onValueChange={setMilestoneId}
              options={[
                { value: "none", label: "No milestone" },
                ...projectMilestones.map((milestone) => ({
                  value: milestone.id,
                  label: milestone.name,
                })),
              ]}
            />
            <InlineSelect
              label="Cycle"
              value={cycleId}
              onValueChange={setCycleId}
              options={[
                { value: "none", label: "Backlog" },
                ...cycles.map((cycle) => ({
                  value: cycle.id,
                  label: `Cycle ${cycle.number} (${CYCLE_STATUS_LABELS[cycle.status]})`,
                })),
              ]}
            />
            <InlineSelect
              label="Assignee"
              value={assigneeId}
              onValueChange={setAssigneeId}
              options={[
                { value: "none", label: "Unassigned" },
                ...members.map((member) => ({
                  value: member.id,
                  label: member.name,
                })),
              ]}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              if (!title.trim()) {
                return
              }

              onCreate({
                title,
                statusId: statusId as IssueStatus["id"],
                priority,
                projectId:
                  projectId === "none" ? null : (projectId as WorkspaceProject["id"]),
                milestoneId:
                  milestoneId === "none"
                    ? null
                    : (milestoneId as WorkspaceMilestone["id"]),
                cycleId: cycleId === "none" ? null : (cycleId as WorkspaceCycle["id"]),
                assigneeId:
                  assigneeId === "none"
                    ? null
                    : (assigneeId as WorkspaceMember["id"]),
              })
              handleOpenChange(false)
            }}
          >
            Create issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NewProjectDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreate: (values: {
    name: string
    description: string
    targetDate: string
  }) => void
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [targetDate, setTargetDate] = useState("")

  const resetForm = () => {
    setName("")
    setDescription("")
    setTargetDate("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New project</DialogTitle>
          <DialogDescription>
            Keep the project small. Milestones and issues will define the execution details.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
          />
          <Textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={5}
            placeholder="Project description"
          />
          <DatePickerField
            label="Target date"
            value={targetDate}
            onChange={setTargetDate}
            placeholder="Pick a target date"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              if (!name.trim() || !targetDate) {
                return
              }

              onCreate({
                name,
                description,
                targetDate: new Date(targetDate).toISOString(),
              })
              handleOpenChange(false)
            }}
          >
            Create project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function NewMilestoneDialog({
  open,
  onOpenChange,
  projects,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projects: WorkspaceProject[]
  onCreate: (values: {
    projectId: WorkspaceProject["id"]
    name: string
    targetDate: string
  }) => void
}) {
  const firstProject = projects.find((project) => !project.archivedAt)?.id ?? "none"
  const [projectId, setProjectId] = useState<string>(firstProject)
  const [name, setName] = useState("")
  const [targetDate, setTargetDate] = useState("")

  const resetForm = () => {
    setProjectId(firstProject)
    setName("")
    setTargetDate("")
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm()
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New milestone</DialogTitle>
          <DialogDescription>
            Milestones live under a single project and help break weekly planning into targets.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <InlineSelect
            label="Project"
            value={projectId}
            onValueChange={setProjectId}
            options={projects
              .filter((project) => !project.archivedAt)
              .map((project) => ({ value: project.id, label: project.name }))}
          />
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Milestone name"
          />
          <DatePickerField
            label="Target date"
            value={targetDate}
            onChange={setTargetDate}
            placeholder="Pick a milestone date"
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              if (!projectId || projectId === "none" || !name.trim() || !targetDate) {
                return
              }

              onCreate({
                projectId: projectId as WorkspaceProject["id"],
                name,
                targetDate: new Date(targetDate).toISOString(),
              })
              handleOpenChange(false)
            }}
          >
            Create milestone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function InlineSelect({
  label,
  value,
  onValueChange,
  options,
  disabled,
}: {
  label?: string
  value: string
  onValueChange: (value: string) => void
  options: Array<{ value: string; label: string }>
  disabled?: boolean
}) {
  const selectedOption = options.find((option) => option.value === value)

  return (
    <div className="grid gap-1">
      {label ? <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{label}</div> : null}
      <Select
        value={value}
        onValueChange={(nextValue) => {
          if (nextValue) {
            onValueChange(nextValue)
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue>{selectedOption?.label ?? value}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function CloseCycleDialog({
  open,
  onOpenChange,
  cycle,
  incompleteIssues,
  completedCount,
  canceledCount,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  cycle: WorkspaceCycle
  incompleteIssues: WorkspaceIssue[]
  completedCount: number
  canceledCount: number
  onConfirm: (issueIds: WorkspaceIssue["id"][]) => void
}) {
  const [selectedIds, setSelectedIds] = useState<WorkspaceIssue["id"][]>(() =>
    incompleteIssues.map((issue) => issue.id)
  )

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedIds(incompleteIssues.map((issue) => issue.id))
    }

    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Close cycle {cycle.number}</DialogTitle>
          <DialogDescription>
            Completed and canceled issues stay in the closed cycle. Incomplete work can carry into the next cycle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Total"
            value={completedCount + canceledCount + incompleteIssues.length}
            hint="Issues in the current cycle"
          />
          <MetricCard
            label="Completed"
            value={completedCount}
            hint="Only completed status counts as done"
          />
          <MetricCard
            label="Carry over"
            value={selectedIds.length}
            hint={`${canceledCount} canceled stay in place`}
          />
        </div>
        <div className="border border-border">
          <div className="border-b border-border px-4 py-3 text-xs font-semibold">
            Incomplete issues
          </div>
          <div className="max-h-72 divide-y divide-border overflow-y-auto">
            {incompleteIssues.map((issue) => {
              const checked = selectedIds.includes(issue.id)

              return (
                <label
                  key={issue.id}
                  className="flex cursor-pointer items-start gap-3 px-4 py-3"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      setSelectedIds((previous) =>
                        nextChecked
                          ? [...previous, issue.id]
                          : previous.filter((id) => id !== issue.id)
                      )
                    }}
                  />
                  <div className="space-y-1">
                    <div className="font-medium">{issue.title}</div>
                    <div className="text-muted-foreground">{issue.identifier}</div>
                  </div>
                </label>
              )
            })}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm(selectedIds)
              handleOpenChange(false)
            }}
          >
            Close cycle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function IssueListView({
  issues,
  statuses,
  members,
  projects,
  cycles,
  onStatusChange,
  onProjectChange,
  onCycleChange,
  onOpenIssue,
}: {
  issues: WorkspaceIssue[]
  statuses: IssueStatus[]
  members: WorkspaceMember[]
  projects: WorkspaceProject[]
  cycles: WorkspaceCycle[]
  onStatusChange: (
    issueId: WorkspaceIssue["id"],
    statusId: IssueStatus["id"]
  ) => void
  onProjectChange: (
    issueId: WorkspaceIssue["id"],
    projectId: WorkspaceProject["id"] | null
  ) => void
  onCycleChange: (
    issueId: WorkspaceIssue["id"],
    cycleId: WorkspaceCycle["id"] | null
  ) => void
  onOpenIssue: (issueId: WorkspaceIssue["id"]) => void
}) {
  const statusById = new Map(statuses.map((status) => [status.id, status]))
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle]))
  const memberById = new Map(members.map((member) => [member.id, member]))

  return (
    <Card className="gap-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Cycle</TableHead>
            <TableHead>Assignee</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.map((issue) => (
            <TableRow key={issue.id}>
              <TableCell>{issue.identifier}</TableCell>
              <TableCell className="w-[34%] whitespace-normal">
                <button
                  type="button"
                  className="text-left font-medium hover:text-primary"
                  onClick={() => onOpenIssue(issue.id)}
                >
                  {issue.title}
                </button>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge
                    variant="outline"
                    className={cn(PRIORITY_BADGES[issue.priority])}
                  >
                    {PRIORITY_LABELS[issue.priority]}
                  </Badge>
                </div>
              </TableCell>
              <TableCell>
                <InlineSelect
                  value={issue.statusId}
                  onValueChange={(value) =>
                    onStatusChange(issue.id, value as IssueStatus["id"])
                  }
                  options={statuses.map((status) => ({
                    value: status.id,
                    label: status.name,
                  }))}
                />
              </TableCell>
              <TableCell>
                <InlineSelect
                  value={issue.projectId ?? "none"}
                  onValueChange={(value) =>
                    onProjectChange(
                      issue.id,
                      value === "none" ? null : (value as WorkspaceProject["id"])
                    )
                  }
                  options={[
                    { value: "none", label: "No project" },
                    ...projects
                      .filter((project) => !project.archivedAt)
                      .map((project) => ({
                        value: project.id,
                        label: project.name,
                      })),
                  ]}
                />
              </TableCell>
              <TableCell>
                <InlineSelect
                  value={issue.cycleId ?? "none"}
                  onValueChange={(value) =>
                    onCycleChange(
                      issue.id,
                      value === "none" ? null : (value as WorkspaceCycle["id"])
                    )
                  }
                  options={[
                    { value: "none", label: "Backlog" },
                    ...cycles.map((cycle) => ({
                      value: cycle.id,
                      label: `Cycle ${cycle.number}`,
                    })),
                  ]}
                />
              </TableCell>
              <TableCell>
                {issue.assigneeId
                  ? memberById.get(issue.assigneeId)?.name ?? "Unknown"
                  : "Unassigned"}
              </TableCell>
              <TableCell>
                <div>{formatDate(issue.updatedAt, "MMM d, HH:mm")}</div>
                <div className="text-muted-foreground">
                  {statusById.get(issue.statusId)?.name}
                  {" · "}
                  {issue.projectId
                    ? projectById.get(issue.projectId)?.name ?? "No project"
                    : issue.cycleId && cycleById.get(issue.cycleId)?.number
                      ? `Cycle ${cycleById.get(issue.cycleId)?.number}`
                      : "Backlog"}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function IssueBoardView({
  issues,
  statuses,
  projects,
  cycles,
  onDropIssue,
  onOpenIssue,
}: {
  issues: WorkspaceIssue[]
  statuses: IssueStatus[]
  projects: WorkspaceProject[]
  cycles: WorkspaceCycle[]
  onDropIssue: (
    issueId: WorkspaceIssue["id"],
    statusId: IssueStatus["id"]
  ) => void
  onOpenIssue: (issueId: WorkspaceIssue["id"]) => void
}) {
  const [dragIssueId, setDragIssueId] = useState<WorkspaceIssue["id"] | null>(null)
  const projectById = new Map(projects.map((project) => [project.id, project]))
  const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle]))

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {statuses.map((status) => {
        const columnIssues = issues.filter((issue) => issue.statusId === status.id)

        return (
          <Card
            key={status.id}
            className="gap-0"
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (dragIssueId) {
                onDropIssue(dragIssueId, status.id)
              }
              setDragIssueId(null)
            }}
          >
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className={cn(getStatusTone(status))}>
                  {status.name}
                </Badge>
                <span className="text-muted-foreground">{columnIssues.length}</span>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 py-4">
              {columnIssues.map((issue) => (
                <button
                  key={issue.id}
                  type="button"
                  draggable
                  onDragStart={() => setDragIssueId(issue.id)}
                  onDragEnd={() => setDragIssueId(null)}
                  onClick={() => onOpenIssue(issue.id)}
                  className="border border-border bg-background p-3 text-left hover:bg-muted/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="font-medium">{issue.title}</div>
                      <div className="text-muted-foreground">{issue.identifier}</div>
                    </div>
                    <Badge
                      variant="outline"
                      className={cn(PRIORITY_BADGES[issue.priority])}
                    >
                      {PRIORITY_LABELS[issue.priority]}
                    </Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    <Badge variant="outline">
                      {issue.projectId
                        ? projectById.get(issue.projectId)?.name ?? "Project"
                        : "No project"}
                    </Badge>
                    <Badge variant="outline">
                      {issue.cycleId
                        ? `Cycle ${cycleById.get(issue.cycleId)?.number ?? "?"}`
                        : "Backlog"}
                    </Badge>
                  </div>
                </button>
              ))}
              {!columnIssues.length ? (
                <div className="border border-dashed border-border p-3 text-muted-foreground">
                  Drop issues here
                </div>
              ) : null}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function CyclesView({
  currentCycle,
  cycles,
  issues,
  statuses,
  members,
  onPlanIssue,
  onCloseCycle,
}: {
  currentCycle: WorkspaceCycle
  cycles: WorkspaceCycle[]
  issues: WorkspaceIssue[]
  statuses: IssueStatus[]
  members: WorkspaceMember[]
  onPlanIssue: (
    issueId: WorkspaceIssue["id"],
    assigneeId: WorkspaceMember["id"] | null
  ) => void
  onCloseCycle: () => void
}) {
  const statusById = new Map(statuses.map((status) => [status.id, status]))
  const memberById = new Map(members.map((member) => [member.id, member]))
  const currentIssues = issues.filter((issue) => issue.cycleId === currentCycle.id)
  const backlogIssues = issues.filter((issue) => !issue.cycleId)
  const completedCount = currentIssues.filter(
    (issue) => statusById.get(issue.statusId)?.type === "completed"
  ).length
  const incompleteCount = currentIssues.filter((issue) => {
    const type = statusById.get(issue.statusId)?.type
    return type !== "completed" && type !== "canceled"
  }).length
  const movedIntoNextCount = currentIssues.reduce(
    (count, issue) => count + issue.cycleHistory.filter((entry) => entry.toCycleId === currentCycle.id).length,
    0
  )

  return (
    <div className="grid gap-6 px-6 py-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <MetricCard
          label="Current cycle"
          value={`#${currentCycle.number}`}
          hint={`${formatDate(currentCycle.startsAt)} - ${formatDate(currentCycle.endsAt)}`}
        />
        <MetricCard
          label="Committed"
          value={currentIssues.length}
          hint="Issues assigned to this cycle"
        />
        <MetricCard
          label="Completed"
          value={completedCount}
          hint="Completed stays on cycle close"
        />
        <MetricCard
          label="Incomplete"
          value={incompleteCount}
          hint={`${movedIntoNextCount} items were carried in`}
        />
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Cycle close</CardTitle>
              <CardDescription>
                Follow the PRD flow: review the summary, confirm the carry-over set, then close.
              </CardDescription>
            </div>
            <Button type="button" onClick={onCloseCycle}>
              Close cycle
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 py-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="border border-border bg-background p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
              <RiGitCommitLine />
              Current commitments
            </div>
            <div className="space-y-3">
              {currentIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between gap-3 border border-border p-3"
                >
                  <div>
                    <div className="font-medium">{issue.title}</div>
                    <div className="text-muted-foreground">{issue.identifier}</div>
                  </div>
                  <Badge variant="outline" className={cn(getStatusTone(statusById.get(issue.statusId)!))}>
                    {statusById.get(issue.statusId)?.name}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <div className="border border-border bg-muted/20 p-4">
            <div className="mb-3 text-xs font-semibold">Upcoming cycle lane</div>
            <div className="space-y-3">
              {cycles
                .filter((cycle) => isAfter(parseISO(cycle.startsAt), parseISO(currentCycle.startsAt)))
                .slice(0, 1)
                .map((cycle) => (
                  <div key={cycle.id} className="border border-border bg-background p-3">
                    <div className="font-medium">Cycle {cycle.number}</div>
                    <div className="text-muted-foreground">
                      {formatDate(cycle.startsAt)} - {formatDate(cycle.endsAt)}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Plan backlog into this cycle</CardTitle>
            <CardDescription>
              Pick backlog issues, assign an owner, and commit them to the current week.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 py-4">
            {backlogIssues.length ? (
              backlogIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="grid gap-3 border border-border bg-background p-3 lg:grid-cols-[1fr_11rem_auto]"
                >
                  <div>
                    <div className="font-medium">{issue.title}</div>
                    <div className="text-muted-foreground">{issue.identifier}</div>
                  </div>
                  <InlineSelect
                    value={issue.assigneeId ?? "none"}
                    onValueChange={(value) =>
                      onPlanIssue(
                        issue.id,
                        value === "none" ? null : (value as WorkspaceMember["id"])
                      )
                    }
                    options={[
                      { value: "none", label: "Unassigned" },
                      ...members.map((member) => ({
                        value: member.id,
                        label: member.name,
                      })),
                    ]}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onPlanIssue(issue.id, issue.assigneeId ?? null)}
                  >
                    Add to cycle
                  </Button>
                </div>
              ))
            ) : (
              <div className="border border-dashed border-border p-4 text-muted-foreground">
                No backlog issues left to plan.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Cycle history</CardTitle>
            <CardDescription>
              Weekly cadence stays visible: one current cycle, one next cycle, and the last closed cycle.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 py-4">
            {cycles.map((cycle) => (
              <div key={cycle.id} className="border border-border bg-background p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">Cycle {cycle.number}</div>
                  <Badge variant="outline">
                    {CYCLE_STATUS_LABELS[cycle.status]}
                  </Badge>
                </div>
                <div className="mt-1 text-muted-foreground">
                  {formatDate(cycle.startsAt)} - {formatDate(cycle.endsAt)}
                </div>
                <div className="mt-2 text-muted-foreground">
                  Owners this week:{" "}
                  {currentIssues
                    .map((issue) => issue.assigneeId)
                    .filter(Boolean)
                    .map((assigneeId) => memberById.get(assigneeId!)?.name)
                    .filter(Boolean)
                    .slice(0, 3)
                    .join(", ") || "No assignees yet"}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ProjectsView({
  projects,
  milestones,
  issues,
  statuses,
  onArchiveProject,
}: {
  projects: WorkspaceProject[]
  milestones: WorkspaceMilestone[]
  issues: WorkspaceIssue[]
  statuses: IssueStatus[]
  onArchiveProject: (projectId: WorkspaceProject["id"]) => void
}) {
  const statusById = new Map(statuses.map((status) => [status.id, status]))
  const activeProjects = projects.filter((project) => !project.archivedAt)

  return (
    <div className="grid gap-6 px-6 py-6">
      <div className="grid gap-4 xl:grid-cols-2">
        {activeProjects.map((project) => {
          const projectMilestones = milestones.filter(
            (milestone) => milestone.projectId === project.id
          )
          const projectIssues = issues.filter((issue) => issue.projectId === project.id)
          const completedIssues = projectIssues.filter(
            (issue) => statusById.get(issue.statusId)?.type === "completed"
          ).length
          const progress = projectIssues.length
            ? Math.round((completedIssues / projectIssues.length) * 100)
            : 0

          return (
            <Card key={project.id}>
              <CardHeader className="border-b border-border">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{project.name}</CardTitle>
                    <CardDescription>{project.description}</CardDescription>
                  </div>
                  <Badge variant="outline">{PROJECT_STATUS_LABELS[project.status]}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 py-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <ProgressBar value={progress} />
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="border border-border bg-background p-3">
                    <div className="text-muted-foreground">Issues</div>
                    <div className="text-base font-semibold">{projectIssues.length}</div>
                  </div>
                  <div className="border border-border bg-background p-3">
                    <div className="text-muted-foreground">Milestones</div>
                    <div className="text-base font-semibold">{projectMilestones.length}</div>
                  </div>
                  <div className="border border-border bg-background p-3">
                    <div className="text-muted-foreground">Target</div>
                    <div className="text-base font-semibold">
                      {formatDate(project.targetDate)}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    Milestones
                  </div>
                  {projectMilestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="flex items-center justify-between gap-3 border border-border bg-background p-3"
                    >
                      <div>
                        <div className="font-medium">{milestone.name}</div>
                        <div className="text-muted-foreground">
                          Target {formatDate(milestone.targetDate)}
                        </div>
                      </div>
                      <Badge variant="outline">
                        {MILESTONE_STATUS_LABELS[milestone.status]}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="justify-between">
                <span className="text-muted-foreground">
                  Created {formatDate(project.createdAt)}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onArchiveProject(project.id)}
                >
                  Archive
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Archived projects</CardTitle>
          <CardDescription>
            Archiving a project does not remove its issues, matching the PRD edge case.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 py-4">
          {projects.filter((project) => project.archivedAt).length ? (
            projects
              .filter((project) => project.archivedAt)
              .map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between gap-3 border border-border bg-background p-3"
                >
                  <div>
                    <div className="font-medium">{project.name}</div>
                    <div className="text-muted-foreground">
                      Archived {formatDate(project.archivedAt, "MMM d, yyyy")}
                    </div>
                  </div>
                  <Badge variant="outline">Archived</Badge>
                </div>
              ))
          ) : (
            <div className="border border-dashed border-border p-4 text-muted-foreground">
              No archived projects yet.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function IssueDetailDialog({
  issue,
  ...props
}: {
  issue: WorkspaceIssue | null
  open: boolean
  onOpenChange: (open: boolean) => void
  members: WorkspaceMember[]
  statuses: IssueStatus[]
  projects: WorkspaceProject[]
  milestones: WorkspaceMilestone[]
  cycles: WorkspaceCycle[]
  comments: WorkspaceComment[]
  currentUserId: WorkspaceMember["id"]
  onUpdateIssue: (
    issueId: WorkspaceIssue["id"],
    patch: Partial<WorkspaceIssue>
  ) => void
  onArchiveIssue: (issueId: WorkspaceIssue["id"]) => void
  onAddComment: (
    issueId: WorkspaceIssue["id"],
    userId: WorkspaceMember["id"],
    body: string
  ) => void
  onUpdateComment: (commentId: WorkspaceComment["id"], body: string) => void
  onDeleteComment: (commentId: WorkspaceComment["id"]) => void
}) {
  if (!issue) {
    return null
  }

  return <IssueDetailDialogContent key={issue.id} issue={issue} {...props} />
}

function IssueDetailDialogContent({
  issue,
  open,
  onOpenChange,
  members,
  statuses,
  projects,
  milestones,
  cycles,
  comments,
  currentUserId,
  onUpdateIssue,
  onArchiveIssue,
  onAddComment,
  onUpdateComment,
  onDeleteComment,
}: {
  issue: WorkspaceIssue
  open: boolean
  onOpenChange: (open: boolean) => void
  members: WorkspaceMember[]
  statuses: IssueStatus[]
  projects: WorkspaceProject[]
  milestones: WorkspaceMilestone[]
  cycles: WorkspaceCycle[]
  comments: WorkspaceComment[]
  currentUserId: WorkspaceMember["id"]
  onUpdateIssue: (
    issueId: WorkspaceIssue["id"],
    patch: Partial<WorkspaceIssue>
  ) => void
  onArchiveIssue: (issueId: WorkspaceIssue["id"]) => void
  onAddComment: (
    issueId: WorkspaceIssue["id"],
    userId: WorkspaceMember["id"],
    body: string
  ) => void
  onUpdateComment: (commentId: WorkspaceComment["id"], body: string) => void
  onDeleteComment: (commentId: WorkspaceComment["id"]) => void
}) {
  const [titleDraft, setTitleDraft] = useState(issue.title)
  const [descriptionDraft, setDescriptionDraft] = useState(issue.description)
  const [descriptionTab, setDescriptionTab] = useState<"write" | "preview">("write")
  const [commentDraft, setCommentDraft] = useState("")
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)

  useEffect(() => {
    if (descriptionDraft === issue.description) {
      return
    }

    const timeout = window.setTimeout(() => {
      onUpdateIssue(issue.id, { description: descriptionDraft })
    }, 300)

    return () => window.clearTimeout(timeout)
  }, [descriptionDraft, issue, onUpdateIssue])

  const memberOptions = [
    { value: "none", label: "Unassigned" },
    ...members.map((member) => ({ value: member.id, label: member.name })),
  ]
  const projectOptions = [
    { value: "none", label: "No project" },
    ...projects
      .filter((project) => !project.archivedAt)
      .map((project) => ({ value: project.id, label: project.name })),
  ]
  const milestoneOptions = [
    { value: "none", label: "No milestone" },
    ...milestones
      .filter((milestone) =>
        issue.projectId ? milestone.projectId === issue.projectId : true
      )
      .map((milestone) => ({ value: milestone.id, label: milestone.name })),
  ]
  const cycleOptions = [
    { value: "none", label: "Backlog" },
    ...cycles.map((cycle) => ({
      value: cycle.id,
      label: `Cycle ${cycle.number} (${CYCLE_STATUS_LABELS[cycle.status]})`,
    })),
  ]
  const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle]))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] p-0 sm:max-w-[calc(100%-3rem)]">
        <div className="grid min-h-[78svh] gap-0 lg:grid-cols-[1.45fr_0.75fr]">
          <div className="border-b border-border lg:border-r lg:border-b-0">
            <div className="space-y-4 border-b border-border px-6 py-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{issue.identifier}</Badge>
                <Badge
                  variant="outline"
                  className={cn(PRIORITY_BADGES[issue.priority])}
                >
                  {PRIORITY_LABELS[issue.priority]}
                </Badge>
              </div>
              <Input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={() => {
                  if (titleDraft.trim() && titleDraft !== issue.title) {
                    onUpdateIssue(issue.id, { title: titleDraft.trim() })
                  }
                }}
                className="h-10 border-0 px-0 text-base font-semibold focus-visible:ring-0"
              />
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">Description</div>
                  <div className="text-muted-foreground">
                    Autosaves while you type. Preview uses GFM markdown.
                  </div>
                </div>
                <Tabs value={descriptionTab} onValueChange={(value) => setDescriptionTab(value as "write" | "preview")}>
                  <TabsList variant="line">
                    <TabsTrigger value="write">Write</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="flex flex-wrap gap-2">
                <MarkdownToolbarButton
                  label="H2"
                  onClick={() =>
                    setDescriptionDraft((previous) =>
                      `${previous}${previous ? "\n\n" : ""}## Section`
                    )
                  }
                />
                <MarkdownToolbarButton
                  label="Checklist"
                  onClick={() =>
                    setDescriptionDraft((previous) =>
                      `${previous}${previous ? "\n\n" : ""}- [ ] First step\n- [ ] Second step`
                    )
                  }
                />
                <MarkdownToolbarButton
                  label="Quote"
                  onClick={() =>
                    setDescriptionDraft((previous) =>
                      `${previous}${previous ? "\n\n" : ""}> Call out a key decision`
                    )
                  }
                />
                <MarkdownToolbarButton
                  label="Code"
                  onClick={() =>
                    setDescriptionDraft((previous) =>
                      `${previous}${previous ? "\n\n" : ""}\`\`\`ts\n// implementation note\n\`\`\``
                    )
                  }
                />
              </div>

              {descriptionTab === "write" ? (
                <Textarea
                  value={descriptionDraft}
                  onChange={(event) => setDescriptionDraft(event.target.value)}
                  rows={18}
                  className="min-h-[24rem]"
                  placeholder="Write the issue context, scope, and execution notes..."
                />
              ) : (
                <div className="min-h-[24rem] border border-border bg-muted/10 p-4">
                  {descriptionDraft.trim() ? (
                    <MarkdownPreview content={descriptionDraft} />
                  ) : (
                    <div className="text-muted-foreground">Nothing to preview yet.</div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border px-6 py-5">
              <div className="mb-4 flex items-center gap-2">
                <RiChat3Line />
                <div className="text-sm font-semibold">Comments</div>
              </div>
              <div className="space-y-4">
                {comments.map((comment) => {
                  const isEditing = editingCommentId === comment.id
                  const author = members.find((member) => member.id === comment.userId)

                  return (
                    <div key={comment.id} className="border border-border bg-background p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium">{author?.name ?? "Unknown"}</div>
                          <div className="text-muted-foreground">
                            {formatDate(comment.updatedAt ?? comment.createdAt, "MMM d, HH:mm")}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => {
                              setEditingCommentId(isEditing ? null : comment.id)
                              setCommentDraft(comment.body)
                            }}
                          >
                            <RiPencilLine />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => onDeleteComment(comment.id)}
                          >
                            <RiDeleteBin6Line />
                          </Button>
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="space-y-3">
                          <Textarea
                            value={commentDraft}
                            onChange={(event) => setCommentDraft(event.target.value)}
                            rows={4}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                if (!commentDraft.trim()) {
                                  return
                                }

                                onUpdateComment(comment.id, commentDraft)
                                setEditingCommentId(null)
                                setCommentDraft("")
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingCommentId(null)
                                setCommentDraft("")
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <MarkdownPreview content={comment.body} />
                      )}
                    </div>
                  )
                })}

                <div className="space-y-3 border border-dashed border-border p-4">
                  <Textarea
                    value={editingCommentId ? "" : commentDraft}
                    onChange={(event) => setCommentDraft(event.target.value)}
                    rows={4}
                    placeholder="Add a comment..."
                    disabled={Boolean(editingCommentId)}
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      onClick={() => {
                        if (!commentDraft.trim()) {
                          return
                        }

                        onAddComment(issue.id, currentUserId, commentDraft)
                        setCommentDraft("")
                      }}
                      disabled={Boolean(editingCommentId)}
                    >
                      Add comment
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="space-y-3">
              <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Fields
              </div>
              <InlineSelect
                label="Status"
                value={issue.statusId}
                onValueChange={(value) =>
                  onUpdateIssue(issue.id, { statusId: value as IssueStatus["id"] })
                }
                options={statuses.map((status) => ({
                  value: status.id,
                  label: status.name,
                }))}
              />
              <InlineSelect
                label="Assignee"
                value={issue.assigneeId ?? "none"}
                onValueChange={(value) =>
                  onUpdateIssue(issue.id, {
                    assigneeId:
                      value === "none" ? null : (value as WorkspaceMember["id"]),
                  })
                }
                options={memberOptions}
              />
              <InlineSelect
                label="Project"
                value={issue.projectId ?? "none"}
                onValueChange={(value) =>
                  onUpdateIssue(issue.id, {
                    projectId:
                      value === "none" ? null : (value as WorkspaceProject["id"]),
                    milestoneId: null,
                  })
                }
                options={projectOptions}
              />
              <InlineSelect
                label="Milestone"
                value={issue.milestoneId ?? "none"}
                onValueChange={(value) =>
                  onUpdateIssue(issue.id, {
                    milestoneId:
                      value === "none"
                        ? null
                        : (value as WorkspaceMilestone["id"]),
                  })
                }
                options={milestoneOptions}
              />
              <InlineSelect
                label="Cycle"
                value={issue.cycleId ?? "none"}
                onValueChange={(value) =>
                  onUpdateIssue(issue.id, {
                    cycleId: value === "none" ? null : (value as WorkspaceCycle["id"]),
                  })
                }
                options={cycleOptions}
              />
              <InlineSelect
                label="Priority"
                value={issue.priority}
                onValueChange={(value) =>
                  onUpdateIssue(issue.id, {
                    priority: value as WorkspaceIssue["priority"],
                  })
                }
                options={Object.entries(PRIORITY_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
              />
            </div>

            <div className="space-y-3 border-t border-border pt-5">
              <div className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                Timeline
              </div>
              <div className="space-y-2 text-muted-foreground">
                <div>Created {formatDate(issue.createdAt, "MMM d, yyyy")}</div>
                <div>Updated {formatDate(issue.updatedAt, "MMM d, HH:mm")}</div>
                <div>
                  Completed{" "}
                  {issue.completedAt ? formatDate(issue.completedAt, "MMM d, yyyy") : "No"}
                </div>
              </div>
              <div className="space-y-2">
                {issue.cycleHistory.length ? (
                  issue.cycleHistory.map((entry) => (
                    <div key={`${entry.fromCycleId}-${entry.movedAt}`} className="border border-border bg-background p-3">
                      <div className="font-medium">Carry-over</div>
                      <div className="text-muted-foreground">
                        {`Cycle ${cycleById.get(entry.fromCycleId)?.number ?? "?"} → Cycle ${cycleById.get(entry.toCycleId)?.number ?? "?"}`}
                      </div>
                      <div className="text-muted-foreground">
                        {formatDate(entry.movedAt, "MMM d, HH:mm")}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="border border-dashed border-border p-3 text-muted-foreground">
                    No cycle movement yet.
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border pt-5">
              <Button
                type="button"
                variant="destructive"
                className="w-full justify-between"
                onClick={() => {
                  onArchiveIssue(issue.id)
                  onOpenChange(false)
                }}
              >
                Archive issue
                <RiDeleteBin6Line />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function WorkspacePage({ section }: { section: SectionKey }) {
  const {
    workspace,
    currentCycle,
    statusById,
    createIssue,
    updateIssue,
    archiveIssue,
    createProject,
    archiveProject,
    createMilestone,
    addComment,
    updateComment,
    deleteComment,
    closeCycle,
  } = useOutletContext<WorkspaceLayoutContext>()
  const [newIssueOpen, setNewIssueOpen] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newMilestoneOpen, setNewMilestoneOpen] = useState(false)
  const [closeCycleOpen, setCloseCycleOpen] = useState(false)
  const [selectedIssueId, setSelectedIssueId] = useState<WorkspaceIssue["id"] | null>(null)
  const [issueView, setIssueView] = useState<IssueViewKey>("list")
  const [issueScope, setIssueScope] = useState<IssueScope>("all")
  const [sortKey, setSortKey] = useState<SortKey>("updated")
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const issues = useMemo(
    () => workspace.issues.filter((issue) => !issue.deletedAt),
    [workspace.issues]
  )
  const startedStatus = workspace.statuses.find(
    (status) => status.type === "unstarted"
  )
  const projectById = useMemo(
    () => new Map(workspace.projects.map((project) => [project.id, project])),
    [workspace.projects]
  )
  const selectedIssue =
    issues.find((issue) => issue.id === selectedIssueId) ?? null
  const selectedIssueComments = workspace.comments
    .filter((comment) => comment.issueId === selectedIssueId)
    .sort(
      (left, right) =>
        parseISO(left.createdAt).getTime() - parseISO(right.createdAt).getTime()
    )
  const filteredIssues = useMemo(() => {
    const nextIssues = issues.filter((issue) => {
      if (issueScope === "current" && issue.cycleId !== currentCycle?.id) {
        return false
      }

      if (issueScope === "backlog" && issue.cycleId) {
        return false
      }

      if (deferredSearch.trim()) {
        const needle = deferredSearch.toLowerCase()
        const projectName = issue.projectId
          ? projectById.get(issue.projectId)?.name ?? ""
          : ""

        return (
          issue.title.toLowerCase().includes(needle) ||
          issue.identifier.toLowerCase().includes(needle) ||
          projectName.toLowerCase().includes(needle)
        )
      }

      return true
    })

    return [...nextIssues].sort((left, right) => {
      if (sortKey === "priority") {
        return PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]
      }

      if (sortKey === "identifier") {
        return left.identifier.localeCompare(right.identifier, undefined, {
          numeric: true,
        })
      }

      return parseISO(right.updatedAt).getTime() - parseISO(left.updatedAt).getTime()
    })
  }, [currentCycle?.id, deferredSearch, issueScope, issues, projectById, sortKey])

  const openIssuesCount = issues.filter((issue) => {
    const type = statusById.get(issue.statusId)?.type
    return type !== "completed" && type !== "canceled"
  }).length
  const backlogCount = issues.filter((issue) => !issue.cycleId).length
  const currentCycleIssues = currentCycle
    ? issues.filter((issue) => issue.cycleId === currentCycle.id)
    : []
  const currentCycleCompletedCount = currentCycleIssues.filter(
    (issue) => statusById.get(issue.statusId)?.type === "completed"
  ).length
  const currentCycleCanceledCount = currentCycleIssues.filter(
    (issue) => statusById.get(issue.statusId)?.type === "canceled"
  ).length
  const currentCycleIncomplete = currentCycleIssues.filter((issue) => {
    const type = statusById.get(issue.statusId)?.type
    return type !== "completed" && type !== "canceled"
  })

  return (
    <>
      {section === "issues" ? (
          <>
            <SectionHeader
              title="Issues"
              description="Single source of truth for list view, board view, comments, and markdown issue detail."
              actions={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIssueScope("current")}
                  >
                    Focus current cycle
                  </Button>
                  <Button type="button" onClick={() => setNewIssueOpen(true)}>
                    <RiAddLine />
                    New issue
                  </Button>
                </>
              }
            />
            <div className="grid gap-6 px-6 py-6">
              <div className="grid gap-4 lg:grid-cols-4">
                <MetricCard
                  label="Open"
                  value={openIssuesCount}
                  hint="Non-completed and non-canceled issues"
                />
                <MetricCard
                  label="Backlog"
                  value={backlogCount}
                  hint="Issues not yet committed to a cycle"
                />
                <MetricCard
                  label="Cycle done"
                  value={currentCycleCompletedCount}
                  hint="Completed in the current cycle"
                />
                <MetricCard
                  label="Project spread"
                  value={new Set(issues.map((issue) => issue.projectId).filter(Boolean)).size}
                  hint="Active projects with issue load"
                />
              </div>

              <Card>
                <CardHeader className="border-b border-border">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-wrap items-center gap-3">
                      <Tabs
                        value={issueView}
                        onValueChange={(value) =>
                          startTransition(() => setIssueView(value as IssueViewKey))
                        }
                      >
                        <TabsList variant="line">
                          <TabsTrigger value="list">
                            <RiListCheck3 />
                            List
                          </TabsTrigger>
                          <TabsTrigger value="board">
                            <RiLayoutGridLine />
                            Board
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      <div className="flex flex-wrap gap-2">
                        {(["all", "current", "backlog"] as IssueScope[]).map((scope) => (
                          <Button
                            key={scope}
                            type="button"
                            size="xs"
                            variant={issueScope === scope ? "default" : "outline"}
                            onClick={() =>
                              startTransition(() => setIssueScope(scope))
                            }
                          >
                            {scope === "all"
                              ? "All issues"
                              : scope === "current"
                                ? "Current cycle"
                                : "Backlog"}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-[16rem_12rem]">
                      <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search title, id, or project..."
                      />
                      <InlineSelect
                        value={sortKey}
                        onValueChange={(value) => setSortKey(value as SortKey)}
                        options={[
                          { value: "updated", label: "Sort: Updated" },
                          { value: "priority", label: "Sort: Priority" },
                          { value: "identifier", label: "Sort: Identifier" },
                        ]}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="py-4">
                  {filteredIssues.length ? (
                    issueView === "list" ? (
                      <IssueListView
                        issues={filteredIssues}
                        statuses={workspace.statuses}
                        members={workspace.members}
                        projects={workspace.projects}
                        cycles={workspace.cycles}
                        onStatusChange={(issueId, statusId) =>
                          updateIssue(issueId, { statusId })
                        }
                        onProjectChange={(issueId, projectId) =>
                          updateIssue(issueId, { projectId, milestoneId: null })
                        }
                        onCycleChange={(issueId, cycleId) =>
                          updateIssue(issueId, { cycleId })
                        }
                        onOpenIssue={(issueId) => setSelectedIssueId(issueId)}
                      />
                    ) : (
                      <IssueBoardView
                        issues={filteredIssues}
                        statuses={workspace.statuses.filter(
                          (status) => status.type !== "canceled"
                        )}
                        projects={workspace.projects}
                        cycles={workspace.cycles}
                        onDropIssue={(issueId, statusId) =>
                          updateIssue(issueId, { statusId })
                        }
                        onOpenIssue={(issueId) => setSelectedIssueId(issueId)}
                      />
                    )
                  ) : (
                    <div className="border border-dashed border-border p-6 text-muted-foreground">
                      No issues match the current filters.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
      ) : null}

      {section === "cycles" && currentCycle ? (
          <>
            <SectionHeader
              title="Cycles"
              description="Weekly planning and weekly review, including explicit cycle close with carry-over into the next cycle."
              actions={
                <Button type="button" onClick={() => setCloseCycleOpen(true)}>
                  <RiLoopLeftLine />
                  Close cycle
                </Button>
              }
            />
            <CyclesView
              currentCycle={currentCycle}
              cycles={workspace.cycles}
              issues={issues}
              statuses={workspace.statuses}
              members={workspace.members}
              onPlanIssue={(issueId, assigneeId) => {
                const issue = issues.find((item) => item.id === issueId)
                const nextPatch: Partial<WorkspaceIssue> = {
                  cycleId: currentCycle.id,
                  assigneeId,
                }

                if (
                  issue &&
                  statusById.get(issue.statusId)?.type === "backlog" &&
                  startedStatus
                ) {
                  nextPatch.statusId = startedStatus.id
                }

                updateIssue(issueId, nextPatch)
              }}
              onCloseCycle={() => setCloseCycleOpen(true)}
            />
          </>
      ) : null}

      {section === "projects" ? (
          <>
            <SectionHeader
              title="Projects and milestones"
              description="Projects group execution, milestones carve out targets, and issues stay attached without being deleted on archive."
              actions={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setNewMilestoneOpen(true)}
                  >
                    <RiFlagLine />
                    New milestone
                  </Button>
                  <Button type="button" onClick={() => setNewProjectOpen(true)}>
                    <RiFolderLine />
                    New project
                  </Button>
                </>
              }
            />
            <ProjectsView
              projects={workspace.projects}
              milestones={workspace.milestones}
              issues={issues}
              statuses={workspace.statuses}
              onArchiveProject={archiveProject}
            />
          </>
      ) : null}

      <NewIssueDialog
        open={newIssueOpen}
        onOpenChange={setNewIssueOpen}
        members={workspace.members}
        projects={workspace.projects}
        milestones={workspace.milestones}
        cycles={workspace.cycles}
        statuses={workspace.statuses}
        onCreate={createIssue}
      />

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        onCreate={createProject}
      />

      <NewMilestoneDialog
        open={newMilestoneOpen}
        onOpenChange={setNewMilestoneOpen}
        projects={workspace.projects}
        onCreate={createMilestone}
      />

      {currentCycle ? (
        <CloseCycleDialog
          open={closeCycleOpen}
          onOpenChange={setCloseCycleOpen}
          cycle={currentCycle}
          incompleteIssues={currentCycleIncomplete}
          completedCount={currentCycleCompletedCount}
          canceledCount={currentCycleCanceledCount}
          onConfirm={(issueIds) =>
            closeCycle({ cycleId: currentCycle.id, carryOverIssueIds: issueIds })
          }
        />
      ) : null}

      <IssueDetailDialog
        issue={selectedIssue}
        open={Boolean(selectedIssue)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIssueId(null)
          }
        }}
        members={workspace.members}
        statuses={workspace.statuses}
        projects={workspace.projects}
        milestones={workspace.milestones}
        cycles={workspace.cycles}
        comments={selectedIssueComments}
        currentUserId={workspace.currentUserId}
        onUpdateIssue={updateIssue}
        onArchiveIssue={archiveIssue}
        onAddComment={addComment}
        onUpdateComment={updateComment}
        onDeleteComment={deleteComment}
      />
    </>
  )
}
