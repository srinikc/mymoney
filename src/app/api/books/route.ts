import { NextResponse } from "next/server"
import { getAuthContext, handleAuthError } from "@/lib/with-auth"
import { TOP_BOOKS, BOOK_CATEGORIES, READING_AGES } from "@/shared/books"

export async function GET(req: Request) {
  try {
    await getAuthContext()
    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category") || ""
    const age = searchParams.get("age") || ""

    let results = TOP_BOOKS
    if (category) {
      results = results.filter((b) => b.category === category)
    }
    if (age) {
      results = results.filter((b) => b.ageRecommendation === age || b.ageRecommendation === "all")
    }

    return NextResponse.json({
      total: results.length,
      categories: BOOK_CATEGORIES,
      ages: READING_AGES,
      results,
    })
  } catch (e) {
    return handleAuthError(e)
  }
}
