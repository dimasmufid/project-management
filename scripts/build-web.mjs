import { spawnSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, "..")
const distDir = path.join(rootDir, "dist")
const tempDir = path.join(rootDir, ".build")
const publicDir = path.join(rootDir, "public")
const fontFilesDir = path.join(
  rootDir,
  "node_modules",
  "@fontsource-variable",
  "jetbrains-mono",
  "files"
)
const tailwindOutfile = path.join(tempDir, "app.css")
const entryFile = path.join(tempDir, "main.tsx")
const convexUrl = resolveEnvVar("VITE_CONVEX_URL")

runCommand("tsc", path.join(rootDir, "node_modules", ".bin", "tsc"), ["-b"])

rmSync(distDir, { force: true, recursive: true })
rmSync(tempDir, { force: true, recursive: true })
mkdirSync(distDir, { recursive: true })
mkdirSync(tempDir, { recursive: true })

runCommand("tailwindcss", path.join(rootDir, "node_modules", ".bin", "tailwindcss"), [
  "-i",
  path.join("src", "index.css"),
  "-o",
  path.relative(rootDir, tailwindOutfile),
  "--minify",
])

if (existsSync(fontFilesDir)) {
  cpSync(fontFilesDir, path.join(tempDir, "files"), { recursive: true })
}

writeFileSync(
  entryFile,
  [
    'import { ConvexAuthProvider } from "@convex-dev/auth/react"',
    'import { ConvexReactClient } from "convex/react"',
    'import { StrictMode } from "react"',
    'import { createRoot } from "react-dom/client"',
    'import { BrowserRouter } from "react-router-dom"',
    "",
    'import { ThemeProvider } from "@/components/theme-provider.tsx"',
    'import App from "../src/App.tsx"',
    'import "./app.css"',
    "",
    `const convexUrl = ${JSON.stringify(convexUrl)}`,
    "",
    "if (!convexUrl) {",
    '  throw new Error("Missing VITE_CONVEX_URL. Set it before running the production build.")',
    "}",
    "",
    "const convex = new ConvexReactClient(convexUrl)",
    "",
    'createRoot(document.getElementById("root")!).render(',
    "  <StrictMode>",
    "    <ThemeProvider>",
    "      <ConvexAuthProvider client={convex}>",
    "        <BrowserRouter>",
    "          <App />",
    "        </BrowserRouter>",
    "      </ConvexAuthProvider>",
    "    </ThemeProvider>",
    "  </StrictMode>",
    ")",
    "",
  ].join("\n")
)

runCommand("bun build", "bun", [
  "build",
  path.relative(rootDir, entryFile),
  "--target",
  "browser",
  "--format",
  "esm",
  "--minify",
  "--outdir",
  "dist",
  "--entry-naming",
  "assets/[name].[ext]",
  "--asset-naming",
  "assets/[name]-[hash].[ext]",
  "--public-path",
  "./",
])

if (existsSync(publicDir)) {
  cpSync(publicDir, distDir, { recursive: true })
}

assertFile(path.join(distDir, "assets", "main.js"))
assertFile(path.join(distDir, "assets", "main.css"))

const template = readFileSync(path.join(rootDir, "index.html"), "utf8")
const titleMatch = template.match(/<title>(.*?)<\/title>/i)
const title = titleMatch?.[1] ?? "Project Management"

writeFileSync(
  path.join(distDir, "index.html"),
  [
    "<!doctype html>",
    '<html lang="en">',
    "  <head>",
    '    <meta charset="UTF-8" />',
    '    <link rel="icon" type="image/svg+xml" href="./vite.svg" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    `    <title>${title}</title>`,
    '    <link rel="stylesheet" crossorigin href="./assets/main.css" />',
    "  </head>",
    "  <body>",
    '    <div id="root"></div>',
    '    <script type="module" crossorigin src="./assets/main.js"></script>',
    "  </body>",
    "</html>",
    "",
  ].join("\n")
)

rmSync(tempDir, { force: true, recursive: true })

function assertFile(filePath) {
  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    throw new Error(`Expected build artifact was not created: ${filePath}`)
  }
}

function resolveEnvVar(name) {
  if (process.env[name]) {
    return process.env[name]
  }

  for (const envFile of [".env.local", ".env"]) {
    const envPath = path.join(rootDir, envFile)

    if (!existsSync(envPath)) {
      continue
    }

    const match = readFileSync(envPath, "utf8").match(new RegExp(`^${name}=(.*)$`, "m"))

    if (match) {
      return match[1].trim().replace(/^['"]|['"]$/g, "")
    }
  }

  throw new Error(`Missing ${name}. Set it in the environment or in .env.local.`)
}

function runCommand(label, command, args) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
  })

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status ?? "unknown"}.`)
  }
}
