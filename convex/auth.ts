import { Password } from "@convex-dev/auth/providers/Password"
import { convexAuth } from "@convex-dev/auth/server"

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

        return {
          email,
          ...(name ? { name } : {}),
        }
      },
    }),
  ],
})
