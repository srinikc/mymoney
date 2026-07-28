import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { validateBody } from "@/shared/validate"
import { CategoryCreateSchema } from "@/shared/validation"

const defaultCategories = [
  { name: "Food & Dining", type: "expense", icon: "utensils", color: "#ef4444" },
  { name: "Transportation", type: "expense", icon: "car", color: "#f97316" },
  { name: "Shopping", type: "expense", icon: "shopping-bag", color: "#eab308" },
  { name: "Bills & Utilities", type: "expense", icon: "file-text", color: "#22c55e" },
  { name: "Entertainment", type: "expense", icon: "film", color: "#3b82f6" },
  { name: "Health & Fitness", type: "expense", icon: "heart", color: "#ec4899" },
  { name: "Education", type: "expense", icon: "book", color: "#8b5cf6" },
  { name: "Travel", type: "expense", icon: "plane", color: "#06b6d4" },
  { name: "Groceries", type: "expense", icon: "shopping-cart", color: "#84cc16" },
  { name: "Rent", type: "expense", icon: "home", color: "#64748b" },
  { name: "Income", type: "income", icon: "trending-up", color: "#22c55e" },
  { name: "Investment", type: "expense", icon: "trending-up", color: "#6366f1" },
  { name: "Other", type: "expense", icon: "more-horizontal", color: "#a1a1aa" },
]

export async function GET() {
  let categories = await prisma.category.findMany({ orderBy: { name: "asc" } })

  if (categories.length === 0) {
    await prisma.category.createMany({ data: defaultCategories })
    categories = await prisma.category.findMany({ orderBy: { name: "asc" } })
  }

  return NextResponse.json(categories)
}

export async function POST(req: Request) {
  const { data: body, error } = await validateBody(req, CategoryCreateSchema)
  if (error) return error
  const category = await prisma.category.create({
    data: {
      name: body.name,
      type: body.type || "expense",
      icon: body.icon || "circle",
      color: body.color || "#6366f1",
    },
  })
  return NextResponse.json(category, { status: 201 })
}
