import { useAuthActions } from "@convex-dev/auth/react"
import { useEffect, useRef, useState } from "react"
import { useConvexAuth, useMutation, useQuery } from "convex/react"
import { Navigate, Route, Routes, useParams } from "react-router-dom"

import { api } from "../convex/_generated/api"
import { LoginForm } from "@/components/login-form"
import { SignupForm } from "@/components/signup-form"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const PENDING_SIGNUP_STORAGE_KEY = "pending-signup"

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
  const [isEnsuringTenant, setIsEnsuringTenant] = useState(false)
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
    setIsEnsuringTenant(true)
    setError(null)

    const pendingSignupRaw = window.sessionStorage.getItem(
      PENDING_SIGNUP_STORAGE_KEY
    )
    let pendingSignup: { avatarBlobId?: string | null } | null = null

    try {
      pendingSignup = pendingSignupRaw
        ? (JSON.parse(pendingSignupRaw) as { avatarBlobId?: string | null })
        : null
    } catch {
      window.sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY)
    }

    void ensureCurrentUserTenant({
      avatarBlobId: pendingSignup?.avatarBlobId ?? undefined,
    })
      .then(() => {
        if (pendingSignupRaw) {
          window.sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY)
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to provision a tenant for this account."
        )
      })
      .finally(() => {
        setIsEnsuringTenant(false)
      })
  }, [tenant, ensureCurrentUserTenant])

  if (tenant === undefined || isEnsuringTenant) {
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

  return <Navigate to={`/${tenant.slug}/issue`} replace />
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

function IssuePage({
  tenant,
}: {
  tenant: {
    name: string
    slug: string
    role: "owner" | "member"
    avatarUrl?: string | null
  }
}) {
  const { signOut } = useAuthActions()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSignOut = async () => {
    setError(null)
    setIsSigningOut(true)

    try {
      await signOut()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign out.")
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <div className="relative min-h-svh overflow-hidden bg-background px-6 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(51,117,191,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.12),_transparent_28%)]" />
      <div className="relative mx-auto flex min-h-[calc(100svh-5rem)] max-w-5xl items-center justify-center">
        <Card className="w-full max-w-3xl border border-border/70 bg-card/95 backdrop-blur">
          <CardHeader className="gap-3 border-b border-border/70 pb-5">
            <p className="text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
              Tenant Workspace
            </p>
            <CardTitle className="text-base">
              {tenant.name} is routed through <code>/{tenant.slug}/issue</code>.
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-8 py-6 md:grid-cols-[1.35fr_0.9fr]">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex size-16 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-muted/50">
                  {tenant.avatarUrl ? (
                    <img
                      src={tenant.avatarUrl}
                      alt={`${tenant.name} avatar`}
                      className="size-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                      No Avatar
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
                    Team Avatar
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Stored and served through ConvexFS.
                  </p>
                </div>
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Every authenticated route now sits under the tenant slug. The
                root route resolves your current session, provisions a tenant if
                needed, and redirects into the tenant workspace.
              </p>
              <div className="grid gap-3 text-xs text-muted-foreground">
                <div className="border border-border/70 bg-muted/40 p-3">
                  Active tenant: <code>{tenant.slug}</code>
                </div>
                <div className="border border-border/70 bg-muted/40 p-3">
                  Role in tenant: <code>{tenant.role}</code>
                </div>
                <div className="border border-border/70 bg-muted/40 p-3">
                  Signup bootstraps the first tenant as
                  <code> {"<user name>'s Team"}</code>.
                </div>
              </div>
            </div>
            <div className="space-y-4 border border-border/70 bg-muted/30 p-4">
              <div>
                <p className="text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
                  Session Actions
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  This placeholder page is now tenant-scoped and protected by
                  both auth session and tenant membership checks.
                </p>
              </div>
              {error ? (
                <p className="border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </p>
              ) : null}
              <Button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
              >
                {isSigningOut ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function TenantIssueRoute() {
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

  return <IssuePage tenant={tenant} />
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
      <Route path="/:tenantSlug/issue" element={<TenantIssueRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
