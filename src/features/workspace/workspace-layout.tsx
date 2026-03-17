import { useAuthActions } from "@convex-dev/auth/react"
import { RiCalendarLine } from "@remixicon/react"
import { useState } from "react"
import { Outlet } from "react-router-dom"

import { AppSidebar } from "@/components/app-sidebar"
import { useWorkspaceState } from "@/features/workspace/use-workspace-state"
import type { WorkspaceData, WorkspaceTenant } from "@/features/workspace/types"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

type SectionKey = "issues" | "cycles" | "projects"

function WorkspaceHeader({
  tenant,
  section,
  currentCycle,
}: {
  tenant: WorkspaceTenant
  section: SectionKey
  currentCycle: ReturnType<typeof useWorkspaceState>["currentCycle"]
}) {
  const title =
    section === "cycles"
      ? "Cycles"
      : section === "projects"
        ? "Projects"
        : "Issues"

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
        <div className="h-4 w-px bg-border" />
        <div>
          <div className="text-xs font-semibold">{tenant.name}</div>
          <div className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            {title}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {currentCycle ? (
          <Badge variant="outline" className="gap-1">
            <RiCalendarLine />
            Cycle {currentCycle.number}
          </Badge>
        ) : null}
        <Badge variant="outline">Tenant: /{tenant.slug}</Badge>
      </div>
    </div>
  )
}

export type WorkspaceLayoutContext = ReturnType<typeof useWorkspaceState> & {
  workspace: WorkspaceData
  isLoading: false
  tenant: WorkspaceTenant
  section: SectionKey
}

export function WorkspaceLayout({
  tenant,
  section,
}: {
  tenant: WorkspaceTenant
  section: SectionKey
}) {
  const { signOut } = useAuthActions()
  const workspaceState = useWorkspaceState(tenant.slug)
  const [isSigningOut, setIsSigningOut] = useState(false)

  if (workspaceState.isLoading || !workspaceState.workspace) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background px-6 py-10">
        <Card className="w-full max-w-md border border-border/70">
          <CardHeader>
            <CardTitle>Preparing workspace</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Bootstrapping statuses, cycles, and workspace data.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const issues = workspaceState.workspace.issues.filter((issue) => !issue.deletedAt)
  const openIssuesCount = issues.filter((issue) => {
    const type = workspaceState.statusById.get(issue.statusId)?.type
    return type !== "completed" && type !== "canceled"
  }).length
  const backlogCount = issues.filter((issue) => !issue.cycleId).length
  const activeProjectCount = workspaceState.workspace.projects.filter(
    (project) => !project.archivedAt
  ).length

  const handleSignOut = async () => {
    setIsSigningOut(true)

    try {
      await signOut()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <SidebarProvider defaultOpen>
      <AppSidebar
        tenant={tenant}
        section={section}
        currentCycle={workspaceState.currentCycle}
        openCount={openIssuesCount}
        backlogCount={backlogCount}
        projectCount={activeProjectCount}
        onSignOut={handleSignOut}
        isSigningOut={isSigningOut}
      />
      <SidebarInset className="min-h-svh bg-background">
        <WorkspaceHeader
          tenant={tenant}
          section={section}
          currentCycle={workspaceState.currentCycle}
        />
        <Outlet
          context={
            {
              ...workspaceState,
              workspace: workspaceState.workspace,
              isLoading: false,
              tenant,
              section,
            } satisfies WorkspaceLayoutContext
          }
        />
      </SidebarInset>
    </SidebarProvider>
  )
}
