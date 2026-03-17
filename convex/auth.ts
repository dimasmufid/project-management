import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth } from "@convex-dev/auth/server"

const MAX_AVATAR_STORAGE_BYTES = 512 * 1024

function getDataUrlByteLength(dataUrl: string) {
  const commaIndex = dataUrl.indexOf(",")

  if (commaIndex === -1) {
    return 0
  }

  const base64 = dataUrl.slice(commaIndex + 1)
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0

  return Math.ceil((base64.length * 3) / 4) - padding
}

function normalizeAvatarImage(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("data:image/")) {
    return undefined
  }

  if (getDataUrlByteLength(value) > MAX_AVATAR_STORAGE_BYTES) {
    throw new Error("Avatar must be 512KB or smaller after compression.")
  }

  return value
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      profile(params) {
        const email =
          typeof params.email === "string"
            ? params.email.trim().toLowerCase()
            : ""

        if (!email) {
          throw new Error("Email is required.")
        }

        const name =
          typeof params.name === "string" ? params.name.trim() : undefined
        const image = normalizeAvatarImage(params.image)

        return {
          email,
          ...(name ? { name } : {}),
          ...(image ? { image } : {}),
        }
      },
    }),
  ],
})
