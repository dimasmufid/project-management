import { ConvexFS } from "convex-fs"

import { components } from "./_generated/api"

const env =
  (globalThis as { process?: { env?: Record<string, string | undefined> } })
    .process?.env ?? {}

export const fs = new ConvexFS(components.fs, {
  storage: {
    type: "bunny",
    apiKey: env.BUNNY_API_KEY ?? "missing-bunny-api-key",
    storageZoneName: env.BUNNY_STORAGE_ZONE ?? "missing-bunny-storage-zone",
    cdnHostname: env.BUNNY_CDN_HOSTNAME ?? "missing-bunny-cdn-hostname",
    tokenKey: env.BUNNY_TOKEN_KEY,
  },
})
