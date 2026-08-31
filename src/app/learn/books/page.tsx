"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import {
  BookOpen,
  Star,
  ExternalLink,
  Calendar,
  Layers,
  TrendingUp,
  Lightbulb,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react"
import { BOOK_CATEGORIES, READING_AGES, type Book } from "@/shared/books"

interface BooksResponse {
  total: number
  categories: typeof BOOK_CATEGORIES
  ages: typeof READING_AGES
  results: Book[]
}

const DIFFICULTY_STYLE: Record<string, string> = {
  beginner: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  intermediate: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  advanced: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
}

export default function BooksPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<BooksResponse | null>(null)
  const [category, setCategory] = useState("all")
  const [age, setAge] = useState("all")
  const [activeBook, setActiveBook] = useState<Book | null>(null)

  useEffect(() => {
    void load()
  }, [category, age])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== "all") params.set("category", category)
      if (age !== "all") params.set("age", age)
      const res = await fetch(`/api/books?${params}`)
      if (!res.ok) throw new Error("Failed to load")
      setData(await res.json())
    } catch (e) {
      toast.error("Failed to load books")
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => data?.results ?? [], [data])

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BookOpen className="h-7 w-7 text-primary" /> Top 10 Indian Finance Books
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          A curated reading list for Indian personal finance. Start with beginner-friendly, then go deeper.
        </p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">How to read this list</h3>
                  <p className="text-xs text-muted-foreground mt-1">Start with one beginner book. Finish it. Apply one idea. Then move to the next.</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-2 flex flex-col gap-2 text-xs text-muted-foreground">
              <p>• 5 of these are India-specific. 5 are universal but critical.</p>
              <p>• 3 are short reads (&lt;250 pages). 4 are intermediate. 3 are deep dives.</p>
              <p>• Total combined reading time: ~60 hours. That's one book per month for a year.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2">
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {BOOK_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={age} onValueChange={setAge}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ages</SelectItem>
            {READING_AGES.map((a) => (
              <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {data && (
        <p className="text-xs text-muted-foreground">{filtered.length} of {TOP_BOOKS_FALLBACK_COUNT(data)} books</p>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-56" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((b) => (
            <BookCard key={b.id} book={b} onOpen={() => setActiveBook(b)} />
          ))}
        </div>
      )}

      {activeBook && <BookDetail book={activeBook} onClose={() => setActiveBook(null)} />}
    </div>
  )
}

// Fallback count helper (for SSR safety)
function TOP_BOOKS_FALLBACK_COUNT(data: BooksResponse) {
  return data?.total ?? 10
}

function BookCard({ book, onOpen }: { book: Book; onOpen: () => void }) {
  const stars = "★".repeat(Math.round(book.rating)) + "☆".repeat(5 - Math.round(book.rating))
  return (
    <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={onOpen}>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2" title={book.title}>{book.title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">by {book.author}</p>
            <div className="flex items-center gap-1 mt-1 text-xs">
              <span className="text-amber-500">{stars}</span>
              <span className="text-muted-foreground">{book.rating}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] flex-wrap">
          <Badge variant="outline" className="text-[10px] capitalize">{book.category}</Badge>
          <Badge variant="secondary" className={`text-[10px] ${DIFFICULTY_STYLE[book.difficulty]}`}>
            {book.difficulty}
          </Badge>
          <span className="text-muted-foreground flex items-center gap-0.5">
            <Calendar className="h-2.5 w-2.5" />{book.yearPublished}
          </span>
          <span className="text-muted-foreground flex items-center gap-0.5">
            <Layers className="h-2.5 w-2.5" />{book.pages}p
          </span>
        </div>
        <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{book.description}</p>
      </CardContent>
    </Card>
  )
}

function BookDetail({ book, onClose }: { book: Book; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{book.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">by {book.author}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {book.yearPublished} · {book.pages} pages · {book.difficulty}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-amber-500 text-base">{"★".repeat(Math.round(book.rating))}</span>
            <span className="text-sm text-muted-foreground">{book.rating}/5</span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{book.description}</p>
          </div>
          <Card className="border-amber-200 bg-amber-50/30 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">Key takeaway</p>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mt-1">{book.keyTakeaway}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button asChild className="w-full">
            <a href={book.amazonLink} target="_blank" rel="noopener noreferrer">
              Buy on Amazon <ExternalLink className="h-3.5 w-3.5 ml-1" />
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
