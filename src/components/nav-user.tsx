import { useAuthActions } from "@convex-dev/auth/react"
import { RiArrowRightLine, RiMore2Fill, RiUserLine } from "@remixicon/react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import type { WorkspaceMember, WorkspaceTenant } from "@/features/workspace/types"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const ROLE_LABELS: Record<WorkspaceTenant["role"], string> = {
  owner: "Owner",
  member: "Member",
}

export function NavUser({
  member,
  tenant,
}: {
  member: WorkspaceMember | null
  tenant: WorkspaceTenant
}) {
  const { signOut } = useAuthActions()
  const navigate = useNavigate()
  const { isMobile } = useSidebar()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const userName = member?.name ?? "Member"
  const userInitials = member?.initials ?? tenant.name.slice(0, 2).toUpperCase()
  const tenantInitials = tenant.name.slice(0, 2).toUpperCase()

  const handleSignOut = async () => {
    setIsSigningOut(true)

    try {
      await signOut()
      navigate("/login", { replace: true })
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="h-8 w-8 rounded-lg border border-sidebar-border">
              <AvatarImage src={tenant.avatarUrl ?? undefined} alt={userName} />
              <AvatarFallback className="rounded-lg bg-sidebar-accent text-sidebar-foreground">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{userName}</span>
              <span className="truncate text-xs text-sidebar-foreground/60">
                {tenant.name}
              </span>
            </div>
            <RiMore2Fill className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-2 py-2 text-left">
                <Avatar className="h-9 w-9 rounded-lg border border-border">
                  <AvatarImage src={tenant.avatarUrl ?? undefined} alt={userName} />
                  <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{userName}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {ROLE_LABELS[tenant.role]} in {tenant.name}
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <RiUserLine />
              Workspace {tenantInitials}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isSigningOut}
              onSelect={(event) => {
                event.preventDefault()
                void handleSignOut()
              }}
            >
              <RiArrowRightLine />
              {isSigningOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
