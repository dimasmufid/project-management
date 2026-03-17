import { useMutation, useQuery } from "convex/react"
import { useCallback, useEffect, useMemo, useRef } from "react"

import { api } from "../../../convex/_generated/api"

export function useWorkspaceState(tenantSlug: string) {
  const workspace = useQuery(api.workspace.getWorkspaceOverview, {
    tenantSlug,
  })
  const ensureBootstrapMutation = useMutation(api.workspace.ensureWorkspaceBootstrap)
  const createIssueMutation = useMutation(api.workspace.createIssue)
  const updateIssueMutation = useMutation(api.workspace.updateIssue)
  const archiveIssueMutation = useMutation(api.workspace.archiveIssue)
  const createProjectMutation = useMutation(api.workspace.createProject)
  const archiveProjectMutation = useMutation(api.workspace.archiveProject)
  const createMilestoneMutation = useMutation(api.workspace.createMilestone)
  const addCommentMutation = useMutation(api.workspace.addComment)
  const updateCommentMutation = useMutation(api.workspace.updateComment)
  const deleteCommentMutation = useMutation(api.workspace.deleteComment)
  const closeCycleMutation = useMutation(api.workspace.closeCycle)
  const bootstrapRequested = useRef<string | null>(null)

  useEffect(() => {
    bootstrapRequested.current = null
  }, [tenantSlug])

  useEffect(() => {
    if (
      workspace === undefined ||
      workspace === null ||
      !workspace.needsBootstrap ||
      bootstrapRequested.current === tenantSlug
    ) {
      return
    }

    bootstrapRequested.current = tenantSlug
    void ensureBootstrapMutation({ tenantSlug })
  }, [ensureBootstrapMutation, tenantSlug, workspace])

  const statusById = useMemo(
    () => new Map((workspace?.statuses ?? []).map((status) => [status.id, status])),
    [workspace?.statuses]
  )

  const currentCycle = useMemo(
    () =>
      (workspace?.cycles ?? []).find((cycle) => cycle.status === "current") ?? null,
    [workspace?.cycles]
  )

  const createIssue = useCallback(
    async (args: Omit<Parameters<typeof createIssueMutation>[0], "tenantSlug">) => {
      await createIssueMutation({ tenantSlug, ...args })
    },
    [createIssueMutation, tenantSlug]
  )

  const updateIssue = useCallback(
    async (issueId: Parameters<typeof updateIssueMutation>[0]["issueId"], patch: Omit<Parameters<typeof updateIssueMutation>[0], "tenantSlug" | "issueId">) => {
      await updateIssueMutation({
        tenantSlug,
        issueId,
        ...patch,
      })
    },
    [tenantSlug, updateIssueMutation]
  )

  const archiveIssue = useCallback(
    async (issueId: Parameters<typeof archiveIssueMutation>[0]["issueId"]) => {
      await archiveIssueMutation({ tenantSlug, issueId })
    },
    [archiveIssueMutation, tenantSlug]
  )

  const createProject = useCallback(
    async (args: Omit<Parameters<typeof createProjectMutation>[0], "tenantSlug">) => {
      await createProjectMutation({ tenantSlug, ...args })
    },
    [createProjectMutation, tenantSlug]
  )

  const archiveProject = useCallback(
    async (projectId: Parameters<typeof archiveProjectMutation>[0]["projectId"]) => {
      await archiveProjectMutation({ tenantSlug, projectId })
    },
    [archiveProjectMutation, tenantSlug]
  )

  const createMilestone = useCallback(
    async (args: Omit<Parameters<typeof createMilestoneMutation>[0], "tenantSlug">) => {
      await createMilestoneMutation({ tenantSlug, ...args })
    },
    [createMilestoneMutation, tenantSlug]
  )

  const addComment = useCallback(
    async (
      issueId: Parameters<typeof addCommentMutation>[0]["issueId"],
      _userId: string,
      body: string
    ) => {
      await addCommentMutation({ tenantSlug, issueId, body })
    },
    [addCommentMutation, tenantSlug]
  )

  const updateComment = useCallback(
    async (
      commentId: Parameters<typeof updateCommentMutation>[0]["commentId"],
      body: string
    ) => {
      await updateCommentMutation({ tenantSlug, commentId, body })
    },
    [tenantSlug, updateCommentMutation]
  )

  const deleteComment = useCallback(
    async (commentId: Parameters<typeof deleteCommentMutation>[0]["commentId"]) => {
      await deleteCommentMutation({ tenantSlug, commentId })
    },
    [deleteCommentMutation, tenantSlug]
  )

  const closeCycle = useCallback(
    async (args: Omit<Parameters<typeof closeCycleMutation>[0], "tenantSlug">) => {
      await closeCycleMutation({ tenantSlug, ...args })
    },
    [closeCycleMutation, tenantSlug]
  )

  return {
    workspace,
    currentCycle,
    statusById,
    isLoading: workspace === undefined || workspace?.needsBootstrap === true,
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
  }
}
