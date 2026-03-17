import { useEffect, useRef, useState } from "react"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useOutletContext,
  useParams,
} from "react-router-dom"

import { api } from "../convex/_generated/api"
import { WorkspacePage } from "@/features/workspace/workspace-page"
import { WorkspaceLayout } from "@/features/workspace/workspace-layout"
import type { WorkspaceTenant } from "@/features/workspace/types"
import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function AuthLoadingScreen({ label }: { label: string }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(51,117,191,0.16),_transparent_38%),linear-gradient(180deg,_transparent,_rgba(15,23,42,0.06))]" />
      <Card className="relative w-full max-w-sm border border-border/70 bg-card/90 backdrop-blur">
        <CardHeader>
          <CardTitle>Checking session</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{label}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function TenantBootstrapError({ message }: { message: string }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.12),_transparent_35%),linear-gradient(180deg,_transparent,_rgba(15,23,42,0.06))]" />
      <Card className="relative w-full max-w-md border border-destructive/30 bg-card/95 backdrop-blur">
        <CardHeader>
          <CardTitle>Tenant setup failed</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-6 text-muted-foreground">{message}</p>
        </CardContent>
      </Card>
    </div>
  )
}

function TenantRedirect() {
  const tenant = useQuery(api.tenants.getCurrentUserTenant, {})
  const ensureCurrentUserTenant = useMutation(
    api.tenants.ensureCurrentUserTenant
  )
  const [error, setError] = useState<string | null>(null)
  const hasAttemptedProvision = useRef(false)

  useEffect(() => {
    if (
      tenant === undefined ||
      tenant !== null ||
      hasAttemptedProvision.current
    ) {
      return
    }

    hasAttemptedProvision.current = true

    void ensureCurrentUserTenant({})
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to provision a tenant for this account."
        )
      })
  }, [tenant, ensureCurrentUserTenant])

  if (tenant === undefined) {
    return (
      <AuthLoadingScreen label="Resolving the tenant workspace for this session." />
    )
  }

  if (error) {
    return <TenantBootstrapError message={error} />
  }

  if (!tenant) {
    return (
      <AuthLoadingScreen label="Provisioning the first tenant for this account." />
    )
  }

  return <Navigate to={`/${tenant.slug}/issues`} replace />
}

function HomeRedirect() {
  const { isLoading, isAuthenticated } = useConvexAuth()

  if (isLoading) {
    return <AuthLoadingScreen label="Verifying your current Convex session." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <TenantRedirect />
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth()

  if (isLoading) {
    return <AuthLoadingScreen label="Preparing the authentication screen." />
  }

  if (isAuthenticated) {
    return <TenantRedirect />
  }

  return <>{children}</>
}

function TenantWorkspaceRoute() {
  const { tenantSlug } = useParams()
  const { isLoading, isAuthenticated } = useConvexAuth()
  const tenant = useQuery(api.tenants.getTenantBySlugForCurrentUser, {
    slug: tenantSlug ?? "",
  })

  if (isLoading) {
    return <AuthLoadingScreen label="Loading your tenant workspace." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (tenant === undefined) {
    return <AuthLoadingScreen label="Checking tenant access for this route." />
  }

  if (!tenant) {
    return <TenantRedirect />
  }

  return <Outlet context={{ tenant }} />
}

function WorkspaceShellRoute({
  section,
}: {
  section: "issues" | "cycles" | "projects"
}) {
  const { tenant } = useOutletContext<{ tenant: WorkspaceTenant }>()

  return <WorkspaceLayout tenant={tenant} section={section} />
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <div className="min-h-svh bg-background px-4 py-8 sm:px-6">
              <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-5xl items-center justify-center">
                <LoginForm className="w-full" />
              </div>
            </div>
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicOnlyRoute>
            <div className="min-h-svh bg-background px-4 py-8 sm:px-6">
              <div className="mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-5xl items-center justify-center">
                <SignupForm className="w-full" />
              </div>
            </div>
          </PublicOnlyRoute>
        }
      />
      <Route path="/:tenantSlug" element={<TenantWorkspaceRoute />}>
        <Route index element={<Navigate to="issues" replace />} />
        <Route element={<WorkspaceShellRoute section="issues" />}>
          <Route path="issues" element={<WorkspacePage section="issues" />} />
        </Route>
        <Route element={<WorkspaceShellRoute section="cycles" />}>
          <Route path="cycles" element={<WorkspacePage section="cycles" />} />
        </Route>
        <Route element={<WorkspaceShellRoute section="projects" />}>
          <Route path="projects" element={<WorkspacePage section="projects" />} />
        </Route>
        <Route path="*" element={<Navigate to="issues" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
