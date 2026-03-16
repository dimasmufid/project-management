import { httpRouter } from "convex/server"
import { registerRoutes } from "convex-fs"

import { auth } from "./auth"
import { components } from "./_generated/api"
import { fs } from "./fs"

const http = httpRouter()

auth.addHttpRoutes(http)
registerRoutes(http, components.fs, fs, {
  pathPrefix: "/fs",
  uploadAuth: async () => true,
  downloadAuth: async () => true,
})

export default http
