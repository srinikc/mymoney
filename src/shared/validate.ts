import { NextResponse } from "next/server"
import { z } from "zod"

export async function validateBody<T extends z.ZodTypeAny>(
  req: Request,
  schema: T
): Promise<{ data: z.output<T>; error: NextResponse | null }> {
  try {
    const body = await req.json()
    const result = await schema.safeParseAsync(body)
    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }))
      return {
        data: {} as z.output<T>,
        error: NextResponse.json({ error: "Validation failed", details: errors }, { status: 400 }),
      }
    }
    return { data: result.data as z.output<T>, error: null }
  } catch {
    return {
      data: {} as z.output<T>,
      error: NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }),
    }
  }
}
