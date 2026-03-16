"use client"

import { useAuthActions } from "@convex-dev/auth/react"
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const MAX_AVATAR_BYTES = 4 * 1024 * 1024
const PENDING_SIGNUP_STORAGE_KEY = "pending-signup"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signIn } = useAuthActions()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
    }
  }, [avatarPreview])

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    setAvatarPreview((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview)
      }

      return file ? URL.createObjectURL(file) : null
    })
  }

  const clearAvatar = () => {
    setAvatarPreview((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview)
      }

      return null
    })

    if (avatarInputRef.current) {
      avatarInputRef.current.value = ""
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const name = formData.get("name")
    const email = formData.get("email")
    const password = formData.get("password")
    const confirmPassword = formData.get("confirmPassword")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    const avatarFile = formData.get("avatar")
    let avatarBlobId: string | null = null

    setIsSubmitting(true)

    try {
      if (avatarFile instanceof File && avatarFile.size > 0) {
        if (!import.meta.env.VITE_CONVEX_SITE_URL) {
          throw new Error("Missing VITE_CONVEX_SITE_URL for avatar uploads.")
        }

        if (!avatarFile.type.startsWith("image/")) {
          throw new Error("Avatar must be an image file.")
        }

        if (avatarFile.size > MAX_AVATAR_BYTES) {
          throw new Error("Avatar must be 4MB or smaller.")
        }

        const uploadResponse = await fetch(
          `${import.meta.env.VITE_CONVEX_SITE_URL}/fs/upload`,
          {
            method: "POST",
            headers: {
              "Content-Type": avatarFile.type || "application/octet-stream",
            },
            body: avatarFile,
          }
        )

        if (!uploadResponse.ok) {
          throw new Error("Unable to upload avatar.")
        }

        const uploadPayload = (await uploadResponse.json()) as {
          blobId?: string
        }

        if (!uploadPayload.blobId) {
          throw new Error("Avatar upload did not return a blob id.")
        }

        avatarBlobId = uploadPayload.blobId
        window.sessionStorage.setItem(
          PENDING_SIGNUP_STORAGE_KEY,
          JSON.stringify({ avatarBlobId })
        )
      } else {
        window.sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY)
      }

      await signIn("password", {
        flow: "signUp",
        name: typeof name === "string" ? name : "",
        email: typeof email === "string" ? email : "",
        password: typeof password === "string" ? password : "",
      })
    } catch (err) {
      window.sessionStorage.removeItem(PENDING_SIGNUP_STORAGE_KEY)
      setError(
        err instanceof Error ? err.message : "Unable to create the account."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="overflow-hidden border border-border/70 bg-card/95 p-0 backdrop-blur">
        <CardContent className="grid p-0 md:grid-cols-[1.05fr_0.95fr]">
          <form className="p-6 md:p-8" onSubmit={handleSubmit}>
            <FieldGroup>
              <div className="flex flex-col items-center gap-2 text-center">
                <h1 className="text-2xl font-bold">Create your account</h1>
                <p className="text-sm text-balance text-muted-foreground">
                  Enter your email below to create your account
                </p>
              </div>
              <Field>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="John Doe"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Image</FieldLabel>
                <div className="flex items-center gap-4">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-input bg-muted">
                    {avatarPreview ? (
                      <>
                        <img
                          src={avatarPreview}
                          alt="Avatar preview"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={clearAvatar}
                          className="absolute inset-0 flex items-center justify-center bg-black/50 text-xs text-white opacity-0 transition-opacity hover:opacity-100"
                          aria-label="Remove avatar"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        No photo
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      ref={avatarInputRef}
                      name="avatar"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="block w-full text-xs file:mr-2 file:rounded-none file:border-0 file:bg-transparent file:px-0 file:py-1 file:text-xs file:font-medium file:text-foreground"
                    />
                  </div>
                </div>
              </Field>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="m@example.com"
                  required
                />
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Password</FieldLabel>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id="confirm-password"
                      name="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      required
                    />
                  </Field>
                </Field>
                <FieldDescription>
                  Password requires at least 8 characters.
                </FieldDescription>
              </Field>
              {error ? <FieldError>{error}</FieldError> : null}
              <Field>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </Button>
              </Field>
              <FieldDescription className="text-center">
                Already have an account? <Link to="/login">Sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className="relative hidden border-l border-border/70 bg-muted/45 p-8 md:flex md:flex-col md:justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(51,117,191,0.22),_transparent_42%),linear-gradient(180deg,_transparent,_rgba(15,23,42,0.08))]" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
