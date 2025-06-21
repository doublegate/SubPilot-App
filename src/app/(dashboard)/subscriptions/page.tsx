"use client"

import { useState } from "react"
import { SubscriptionList } from "@/components/subscription-list"
import { DashboardStats } from "@/components/dashboard-stats"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "@/trpc/react"
import { Loader2, Search, SlidersHorizontal, Sparkles } from "lucide-react"
import { toast } from "sonner"

export default function SubscriptionsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<"name" | "amount" | "nextBilling">("nextBilling")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")

  // Fetch subscriptions with filters
  const { data: subscriptionsData, isLoading } = api.subscriptions.getAll.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter as "active" | "cancelled" | "pending",
    category: categoryFilter === "all" ? undefined : categoryFilter,
    sortBy,
    sortOrder,
  })

  // Fetch stats
  const { data: stats } = api.subscriptions.getStats.useQuery()

  // Fetch categories
  const { data: categories } = api.subscriptions.getCategories.useQuery()

  // Detect subscriptions mutation
  const detectSubscriptions = api.subscriptions.detectSubscriptions.useMutation({
    onSuccess: (data) => {
      if (data.created > 0) {
        toast.success(`Found ${data.created} new subscriptions!`)
      } else {
        toast.info("No new subscriptions detected")
      }
    },
    onError: (error) => {
      toast.error("Failed to detect subscriptions", {
        description: error.message,
      })
    },
  })

  // Filter subscriptions based on search query
  const filteredSubscriptions = subscriptionsData?.subscriptions.filter(sub =>
    sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage and track all your recurring payments
          </p>
        </div>
        <Button
          onClick={() => detectSubscriptions.mutate({})}
          disabled={detectSubscriptions.isPending}
        >
          {detectSubscriptions.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Detect Subscriptions
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      {stats && <DashboardStats stats={stats} />}

      {/* Filters */}
      <div className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories?.map((cat) => (
                <SelectItem key={cat.name} value={cat.name}>
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span className="text-xs text-muted-foreground">({cat.count})</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[140px]">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="nextBilling">Next Billing</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </Button>
        </div>
      </div>

      {/* Subscriptions List */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : filteredSubscriptions.length > 0 ? (
        <SubscriptionList subscriptions={filteredSubscriptions} />
      ) : (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-lg font-medium">No subscriptions found</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery || statusFilter !== "all" || categoryFilter !== "all"
              ? "Try adjusting your filters"
              : "Connect a bank account and run detection to find your subscriptions"}
          </p>
        </div>
      )}
    </div>
  )
}