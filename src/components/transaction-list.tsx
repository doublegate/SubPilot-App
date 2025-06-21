"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { MoreHorizontal, Link2, LinkIcon, Unlink } from "lucide-react"
import { format } from "date-fns"

interface Transaction {
  id: string
  date: Date
  name: string
  merchantName?: string | null
  amount: number
  currency: string
  category?: string | null
  pending: boolean
  isRecurring?: boolean
  account: {
    name: string
    institution: string
  }
  subscription?: {
    id: string
    name: string
  } | null
}

interface TransactionListProps {
  transactions: Transaction[]
  isLoading?: boolean
  onLinkToSubscription?: (transactionId: string) => void
  onUnlinkFromSubscription?: (transactionId: string) => void
  onViewDetails?: (transactionId: string) => void
}

export function TransactionList({
  transactions,
  isLoading,
  onLinkToSubscription,
  onUnlinkFromSubscription,
  onViewDetails,
}: TransactionListProps) {
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(Math.abs(amount))
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No transactions found</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => (
            <TableRow key={transaction.id}>
              <TableCell className="font-medium">
                {format(transaction.date, "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{transaction.name}</p>
                  {transaction.merchantName && (
                    <p className="text-sm text-muted-foreground">{transaction.merchantName}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {transaction.category ? (
                  <Badge variant="outline">{transaction.category}</Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <p>{transaction.account.name}</p>
                  <p className="text-muted-foreground">{transaction.account.institution}</p>
                </div>
              </TableCell>
              <TableCell>
                {transaction.subscription ? (
                  <div className="flex items-center gap-2">
                    <LinkIcon className="h-3 w-3 text-green-600" />
                    <span className="text-sm">{transaction.subscription.name}</span>
                  </div>
                ) : transaction.isRecurring ? (
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600">
                    Recurring
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <span className={transaction.amount < 0 ? "text-red-600" : "text-green-600"}>
                  {transaction.amount < 0 ? "-" : "+"}
                  {formatCurrency(transaction.amount, transaction.currency)}
                </span>
                {transaction.pending && (
                  <Badge variant="outline" className="ml-2">
                    Pending
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {onViewDetails && (
                      <DropdownMenuItem onClick={() => onViewDetails(transaction.id)}>
                        View Details
                      </DropdownMenuItem>
                    )}
                    {!transaction.subscription && onLinkToSubscription && (
                      <DropdownMenuItem onClick={() => onLinkToSubscription(transaction.id)}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Link to Subscription
                      </DropdownMenuItem>
                    )}
                    {transaction.subscription && onUnlinkFromSubscription && (
                      <DropdownMenuItem onClick={() => onUnlinkFromSubscription(transaction.id)}>
                        <Unlink className="mr-2 h-4 w-4" />
                        Unlink from Subscription
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}