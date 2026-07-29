import { NextResponse } from "next/server"
import { auth } from "./auth"

export interface AuthenticatedContext {
  userId: number
  profileId: number
  role: string
}

export async function getAuthContext(): Promise<AuthenticatedContext> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new AuthError("Unauthorized", 401)
  }
  const profileId = (session.user as unknown as Record<string, unknown>)?.profileId as number | undefined
  if (!profileId) {
    throw new AuthError("No profile found", 404)
  }
  return {
    userId: Number(session.user.id),
    profileId,
    role: ((session.user as unknown as Record<string, unknown>)?.role as string) || "user",
  }
}

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = "AuthError"
  }
}

export function handleAuthError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  throw error
}