type AuthFlow = "signIn" | "signUp"

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : ""
}

function stripConvexEnvelope(message: string) {
  return message
    .replace(/\[CONVEX [^\]]+\]\s*/g, "")
    .replace(/\[Request ID:[^\]]+\]\s*/g, "")
    .replace(/Called by client\.?/gi, "")
    .replace(/Server Error\.?/gi, "")
    .trim()
}

export function getAuthErrorMessage(error: unknown, flow: AuthFlow) {
  const rawMessage = getErrorMessage(error)
  const normalizedMessage = stripConvexEnvelope(rawMessage).toLowerCase()

  if (flow === "signIn") {
    if (
      normalizedMessage.includes("invalid password") ||
      normalizedMessage.includes("invalid credentials") ||
      normalizedMessage.includes("incorrect password") ||
      normalizedMessage.includes("could not verify secret")
    ) {
      return "That email or password doesn't look right. Check your details and try again."
    }

    if (
      normalizedMessage.includes("user not found") ||
      normalizedMessage.includes("account not found") ||
      normalizedMessage.includes("no user")
    ) {
      return "We couldn't find an account for that email. Check the address or create a new account."
    }

    if (normalizedMessage.includes("rate limit")) {
      return "Too many sign-in attempts. Please wait a moment and try again."
    }

    return "We couldn't sign you in right now. Please try again."
  }

  if (
    normalizedMessage.includes("already exists") ||
    normalizedMessage.includes("already registered") ||
    normalizedMessage.includes("account exists") ||
    normalizedMessage.includes("duplicate")
  ) {
    return "An account with that email already exists. Try signing in instead."
  }

  if (
    normalizedMessage.includes("password") &&
    (normalizedMessage.includes("8") ||
      normalizedMessage.includes("too short") ||
      normalizedMessage.includes("minimum"))
  ) {
    return "Use a password with at least 8 characters."
  }

  if (
    normalizedMessage.includes("invalid email") ||
    normalizedMessage.includes("email address")
  ) {
    return "Enter a valid email address and try again."
  }

  if (normalizedMessage.includes("rate limit")) {
    return "Too many sign-up attempts. Please wait a moment and try again."
  }

  return "We couldn't create your account right now. Please try again."
}
