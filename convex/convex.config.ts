import { defineApp } from "convex/server"
import convexFs from "convex-fs/convex.config"

const app = defineApp()

app.use(convexFs, { name: "fs" })

export default app
