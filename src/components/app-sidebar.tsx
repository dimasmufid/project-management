import { RiArrowRightLine, RiListCheck3, RiLoopLeftLine, RiRoadMapLine } from "@remixicon/react"
import { format, parseISO } from "date-fns"
import { NavLink } from "react-router-dom"

import type {
  WorkspaceCycle,
  WorkspaceTenant,
} from "@/features/workspace/types"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const ROLE_LABELS: Record<WorkspaceTenant["role"], string> = {
  owner: "Owner",
  member: "Member",
}

function formatDate(value?: string | null, pattern = "MMM d") {
  if (!value) {
    return "Backlog"
  }

  return format(parseISO(value), pattern)
}

export function AppSidebar({
  tenant,
  section,
  currentCycle,
  openCount,
  backlogCount,
  projectCount,
  onSignOut,
  isSigningOut,
}: {
  tenant: WorkspaceTenant
  section: "issues" | "cycles" | "projects"
  currentCycle: WorkspaceCycle | null
  openCount: number
  backlogCount: number
  projectCount: number
  onSignOut: () => Promise<void>
  isSigningOut: boolean
}) {
  const navItems = [
    {
      key: "issues" as const,
      label: "Issues",
      href: `/${tenant.slug}/issues`,
      icon: RiListCheck3,
      count: openCount,
    },
    {
      key: "cycles" as const,
      label: "Cycles",
      href: `/${tenant.slug}/cycles`,
      icon: RiLoopLeftLine,
      count: currentCycle ? currentCycle.number : 0,
    },
    {
      key: "projects" as const,
      label: "Projects",
      href: `/${tenant.slug}/projects`,
      icon: RiRoadMapLine,
      count: projectCount,
    },
  ]

  return (
    <Sidebar variant="inset">
      <SidebarHeader className="gap-3 border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center border border-sidebar-border bg-sidebar-accent font-semibold">
            {tenant.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold">{tenant.name}</div>
            <div className="text-[11px] uppercase tracking-[0.24em] text-sidebar-foreground/60">
              {ROLE_LABELS[tenant.role]}
            </div>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      render={<NavLink to={item.href} />}
                      isActive={section === item.key}
                      tooltip={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                    <SidebarMenuBadge>{item.count}</SidebarMenuBadge>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="space-y-3 border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sidebar-foreground/70">Cycle</span>
                <span>
                  {currentCycle
                    ? `${formatDate(currentCycle.startsAt)} - ${formatDate(currentCycle.endsAt)}`
                    : "Unset"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sidebar-foreground/70">Backlog</span>
                <span>{backlogCount} issues</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sidebar-foreground/70">Open work</span>
                <span>{openCount} issues</span>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border px-3 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full justify-between"
          onClick={() => void onSignOut()}
          disabled={isSigningOut}
        >
          <span>{isSigningOut ? "Signing out..." : "Sign out"}</span>
          <RiArrowRightLine />
        </Button>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
